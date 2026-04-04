export interface RunSummary {
  total: number;
  passed: number;
  failed: number;
  warnings: number;
  durationSeconds: number;
}

export interface RunResult {
  requirement: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  detail: string;
  screenshot?: string;
}

export interface QARun {
  _id: string;
  url: string;
  label: string;
  requirements: string;
  auth?: { username: string; password: string };
  depth: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  log: string[];
  results: RunResult[];
  extraFindings: string[];
  screenshots: { label: string; data: string; timestamp: string }[];
  summary: RunSummary;
  project: string;
  startedAt: string;
  completedAt: string;
  createdAt: string;
}

export interface QATemplate {
  _id: string;
  name: string;
  url: string;
  requirements: string;
  auth?: { username: string; password: string };
  depth: string;
  project: string;
  createdAt: string;
}

export interface QAWebhook {
  _id: string;
  url: string;
  events: string[];
  enabled: boolean;
  secret?: string;
}

export interface QASchedule {
  _id: string;
  name: string;
  templateId: { _id: string; name: string; url: string } | string;
  cron: string;
  enabled: boolean;
  lastRunAt?: string;
  createdAt: string;
}

export async function createRun(data: {
  url: string;
  requirements: string;
  auth?: { username: string; password: string };
  depth: string;
  label: string;
  project?: string;
}): Promise<{ id: string; status: string }> {
  const res = await fetch('/api/qa/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create run');
  return res.json();
}

export async function getRun(id: string): Promise<QARun> {
  const res = await fetch(`/api/qa/run/${id}`);
  if (!res.ok) throw new Error('Failed to get run');
  return res.json();
}

export async function getRuns(page = 1, limit = 20, filters?: { status?: string; search?: string; project?: string }): Promise<{ runs: QARun[]; total: number; page: number; pages: number }> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (filters?.status) params.set('status', filters.status);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.project) params.set('project', filters.project);
  const res = await fetch(`/api/qa/runs?${params}`);
  if (!res.ok) throw new Error('Failed to get runs');
  return res.json();
}

export async function deleteRun(id: string): Promise<void> {
  const res = await fetch(`/api/qa/run/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete run');
}

export async function cancelRun(id: string): Promise<void> {
  await fetch(`/api/qa/run/${id}`, { method: 'DELETE' });
}

export function streamRun(id: string, onLog: (line: string) => void, onDone: (data: any) => void): () => void {
  const es = new EventSource(`/api/qa/run/${id}/stream`);
  es.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'log') onLog(data.line);
    else if (data.type === 'done') { onDone(data); es.close(); }
  };
  es.onerror = () => es.close();
  return () => es.close();
}

// Templates
export async function getTemplates(): Promise<QATemplate[]> {
  const res = await fetch('/api/qa/templates');
  if (!res.ok) return [];
  return res.json();
}

export async function createTemplate(data: { name: string; url: string; requirements: string; depth: string; project: string }): Promise<QATemplate> {
  const res = await fetch('/api/qa/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create template');
  return res.json();
}

export async function deleteTemplate(id: string): Promise<void> {
  await fetch(`/api/qa/templates/${id}`, { method: 'DELETE' });
}

// Webhooks
export async function getWebhooks(): Promise<QAWebhook[]> {
  const res = await fetch('/api/qa/webhooks');
  if (!res.ok) return [];
  return res.json();
}

export async function createWebhook(data: { url: string; events: string[]; secret?: string }): Promise<QAWebhook> {
  const res = await fetch('/api/qa/webhooks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create webhook');
  return res.json();
}

export async function deleteWebhook(id: string): Promise<void> {
  await fetch(`/api/qa/webhooks/${id}`, { method: 'DELETE' });
}

// Schedules
export async function getSchedules(): Promise<QASchedule[]> {
  const res = await fetch('/api/qa/schedules');
  if (!res.ok) return [];
  return res.json();
}

export async function createSchedule(data: { name: string; templateId: string; cron: string }): Promise<QASchedule> {
  const res = await fetch('/api/qa/schedules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create schedule');
  return res.json();
}

export async function toggleSchedule(id: string, enabled: boolean): Promise<QASchedule> {
  const res = await fetch(`/api/qa/schedules/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) throw new Error('Failed to update schedule');
  return res.json();
}

export async function deleteSchedule(id: string): Promise<void> {
  await fetch(`/api/qa/schedules/${id}`, { method: 'DELETE' });
}

// Projects
export async function getProjects(): Promise<string[]> {
  const res = await fetch('/api/qa/projects');
  if (!res.ok) return [];
  return res.json();
}

// PDF export
export async function exportPDF(id: string): Promise<Blob> {
  const res = await fetch(`/api/qa/run/${id}/pdf`);
  if (!res.ok) throw new Error('Failed to export PDF');
  return res.blob();
}
