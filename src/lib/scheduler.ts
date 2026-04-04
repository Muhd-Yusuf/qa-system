import * as cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import { connectDB } from './db';
import { Schedule, Template, Run } from './models';
import { startClaudeRun } from './claude-runner';
import { parseReport } from './report-parser';
import { broadcast, closeAll } from './run-manager';
import { fireWebhooks } from './webhooks';

const activeTasks = new Map<string, ScheduledTask>();

async function executeSchedule(schedule: any) {
  await connectDB();
  const template = await Template.findById(schedule.templateId);
  if (!template) return;

  const run = await Run.create({
    url: template.url,
    requirements: template.requirements,
    auth: template.auth?.username ? { username: template.auth.username, password: '***' } : undefined,
    depth: template.depth || 'standard',
    label: `[Scheduled] ${schedule.name}`,
    project: template.project || '',
    status: 'running',
    startedAt: new Date(),
    log: [],
  });

  const child = startClaudeRun({
    url: template.url,
    requirements: template.requirements,
    auth: template.auth,
    depth: template.depth,
  });

  run.pid = child.pid;
  await run.save();

  const runId = run._id.toString();
  let fullOutput = '';

  const processLine = async (line: string) => {
    if (!line.trim()) return;
    fullOutput += line + '\n';
    await Run.updateOne({ _id: run._id }, { $push: { log: line } });
    broadcast(runId, { type: 'log', line });
  };

  let stdoutBuf = '';
  child.stdout?.on('data', (chunk: Buffer) => {
    stdoutBuf += chunk.toString();
    const lines = stdoutBuf.split('\n');
    stdoutBuf = lines.pop()!;
    lines.forEach(l => processLine(l));
  });

  let stderrBuf = '';
  child.stderr?.on('data', (chunk: Buffer) => {
    stderrBuf += chunk.toString();
    const lines = stderrBuf.split('\n');
    stderrBuf = lines.pop()!;
    lines.forEach(l => processLine(`[STDERR] ${l}`));
  });

  child.on('close', async (code: number | null) => {
    if (stdoutBuf.trim()) await processLine(stdoutBuf);
    if (stderrBuf.trim()) await processLine(`[STDERR] ${stderrBuf}`);

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

    const webhookEvent = update.status === 'completed' ? 'run.completed' : 'run.failed';
    fireWebhooks(webhookEvent, { runId, url: template.url, label: run.label, status: update.status, summary: report?.summary });
  });

  // Update schedule metadata
  schedule.lastRunAt = new Date();
  await schedule.save();
}

function scheduleTask(schedule: any) {
  const id = schedule._id.toString();
  // Stop existing task if any
  if (activeTasks.has(id)) {
    activeTasks.get(id)!.stop();
    activeTasks.delete(id);
  }

  if (!schedule.enabled || !cron.validate(schedule.cron)) return;

  const task = cron.schedule(schedule.cron, () => {
    executeSchedule(schedule).catch(err => console.error('Schedule execution error:', err));
  });

  activeTasks.set(id, task);
}

export function stopSchedule(scheduleId: string) {
  if (activeTasks.has(scheduleId)) {
    activeTasks.get(scheduleId)!.stop();
    activeTasks.delete(scheduleId);
  }
}

let initialized = false;

export async function initScheduler() {
  if (initialized) return;
  initialized = true;

  try {
    await connectDB();
    const schedules = await Schedule.find({ enabled: true });
    for (const s of schedules) {
      scheduleTask(s);
    }
    console.log(`Scheduler initialized with ${schedules.length} active schedules`);
  } catch (err) {
    console.error('Failed to initialize scheduler:', err);
    initialized = false;
  }
}

export function registerSchedule(schedule: any) {
  scheduleTask(schedule);
}

export function validateCron(expression: string): boolean {
  return cron.validate(expression);
}
