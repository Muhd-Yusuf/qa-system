import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Run } from '@/lib/models';
import { startClaudeRun } from '@/lib/claude-runner';
import { parseReport } from '@/lib/report-parser';
import { broadcast, closeAll } from '@/lib/run-manager';
import { fireWebhooks } from '@/lib/webhooks';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { url, requirements, auth, depth, label, project } = await request.json();
    if (!url || !requirements) {
      return NextResponse.json({ error: 'url and requirements are required' }, { status: 400 });
    }

    const run = await Run.create({
      url, requirements,
      auth: auth?.username ? { username: auth.username, password: '***' } : undefined,
      depth: depth || 'standard',
      label: label || '',
      project: project || '',
      status: 'running',
      startedAt: new Date(),
      log: [],
    });

    const child = startClaudeRun({ url, requirements, auth, depth });
    run.pid = child.pid;
    await run.save();

    const runId = run._id.toString();
    let fullOutput = '';

    // Serial queue — ensures data events and close event never race
    let queue = Promise.resolve();
    const enqueue = (fn: () => Promise<void>) => { queue = queue.then(fn); };

    const emitLine = async (line: string) => {
      if (!line.trim()) return;
      fullOutput += line + '\n';
      await Run.updateOne({ _id: run._id }, { $push: { log: line } });
      broadcast(runId, { type: 'log', line });
    };

    const processChunk = async (chunk: Buffer, isStderr = false) => {
      const text = chunk.toString();
      if (isStderr) {
        for (const l of text.split('\n')) {
          if (l.trim()) await emitLine(`[STDERR] ${l}`);
        }
        return;
      }
      // stream-json: each line is a JSON event from Claude
      for (const raw of text.split('\n')) {
        if (!raw.trim()) continue;
        try {
          const event = JSON.parse(raw);
          if (event.type === 'assistant') {
            for (const block of (event.message?.content ?? [])) {
              if (block.type === 'text' && block.text?.trim()) {
                for (const l of block.text.split('\n')) await emitLine(l);
              }
            }
          }
        } catch {
          await emitLine(raw);
        }
      }
    };

    child.stdout?.on('data', (chunk: Buffer) => { enqueue(() => processChunk(chunk)); });
    child.stderr?.on('data', (chunk: Buffer) => { enqueue(() => processChunk(chunk, true)); });

    child.on('close', (code: number | null) => {
      enqueue(async () => {
        const report = parseReport(fullOutput);
        const update: any = {
          status: code === 0 ? 'completed' : 'failed',
          completedAt: new Date(),
        };
        if (report) {
          update.results = report.results;
          update.extraFindings = report.extraFindings;
          update.summary = report.summary;
        }
        await Run.updateOne({ _id: run._id }, update);
        broadcast(runId, { type: 'done', status: update.status, report });
        closeAll(runId);
        fireWebhooks(
          update.status === 'completed' ? 'run.completed' : 'run.failed',
          { runId, url, label, status: update.status, summary: report?.summary }
        );
      });
    });

    return NextResponse.json({ id: run._id, status: 'running' }, { status: 201 });
  } catch (err) {
    console.error('Error starting run:', err);
    return NextResponse.json({ error: 'Failed to start QA run' }, { status: 500 });
  }
}
