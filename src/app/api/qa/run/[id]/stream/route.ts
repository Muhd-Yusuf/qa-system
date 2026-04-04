import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { Run } from '@/lib/models';
import { addClient, removeClient } from '@/lib/run-manager';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;
  const run = await Run.findById(id);

  if (!run) {
    return new Response(JSON.stringify({ error: 'Run not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send existing log lines first
      for (const line of run.log) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'log', line })}\n\n`));
      }

      // If already done, send done event and close
      if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') {
        const report = run.results?.length
          ? { summary: run.summary, results: run.results, extraFindings: run.extraFindings }
          : null;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', status: run.status, report })}\n\n`));
        controller.close();
        return;
      }

      // Register for live updates
      const writer = {
        write: (data: string) => {
          try {
            controller.enqueue(encoder.encode(data));
          } catch {}
        },
        end: () => {
          try {
            controller.close();
          } catch {}
        },
      };

      addClient(id, writer);

      // Clean up on abort
      request.signal.addEventListener('abort', () => {
        removeClient(id, writer);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
