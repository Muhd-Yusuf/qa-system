import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { Run } from '@/lib/models';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;
  const run = await Run.findById(id);
  if (!run) return new Response('Not found', { status: 404 });

  const formatDuration = (s: number) => {
    if (!s) return '--';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const statusIcon: Record<string, string> = { PASS: '&#10003;', FAIL: '&#10007;', WARN: '&#9888;' };
  const statusColor: Record<string, string> = { PASS: '#22C55E', FAIL: '#EF4444', WARN: '#F59E0B' };

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>QA Report - ${run.label || 'Run'}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #0F172A; font-size: 13px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .meta { color: #64748B; font-size: 12px; margin-bottom: 24px; }
  .summary { display: flex; gap: 16px; margin-bottom: 24px; }
  .summary-card { flex: 1; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; text-align: center; }
  .summary-value { font-size: 24px; font-weight: 700; }
  .summary-label { font-size: 11px; color: #64748B; }
  .result { border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 16px; margin-bottom: 8px; display: flex; gap: 12px; }
  .result-icon { width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; }
  .result-body { flex: 1; }
  .result-req { font-size: 10px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; }
  .result-title { font-weight: 600; margin: 2px 0 4px; }
  .result-detail { color: #64748B; font-size: 12px; }
  .finding { padding: 8px 0; border-bottom: 1px solid #E2E8F0; display: flex; gap: 8px; align-items: flex-start; }
  .finding:last-child { border-bottom: none; }
  .dot { width: 6px; height: 6px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
  h2 { font-size: 15px; margin: 24px 0 12px; }
</style></head><body>
<h1>QA Report: ${run.label || 'Untitled Run'}</h1>
<div class="meta">${run.url} &bull; ${new Date(run.startedAt).toLocaleString()} &bull; Duration: ${formatDuration(run.summary?.durationSeconds)}</div>
<div class="summary">
  <div class="summary-card"><div class="summary-value">${run.summary?.total ?? 0}</div><div class="summary-label">Total</div></div>
  <div class="summary-card"><div class="summary-value" style="color:#22C55E">${run.summary?.passed ?? 0}</div><div class="summary-label">Passed</div></div>
  <div class="summary-card"><div class="summary-value" style="color:#EF4444">${run.summary?.failed ?? 0}</div><div class="summary-label">Failed</div></div>
  <div class="summary-card"><div class="summary-value" style="color:#F59E0B">${run.summary?.warnings ?? 0}</div><div class="summary-label">Warnings</div></div>
</div>
<h2>Test Results</h2>
${(run.results || []).map((r: any, i: number) => `
<div class="result">
  <div class="result-icon" style="background:${statusColor[r.status]}20;color:${statusColor[r.status]}">${statusIcon[r.status]}</div>
  <div class="result-body">
    <div class="result-req">Req ${i + 1}</div>
    <div class="result-title">${r.requirement}</div>
    <div class="result-detail">${r.detail}</div>
  </div>
</div>`).join('')}
${run.extraFindings?.length ? `<h2>Extra Findings</h2>
${run.extraFindings.map((f: string, i: number) => `<div class="finding"><div class="dot" style="background:${['#EF4444', '#F59E0B', '#0EA5E9'][i % 3]}"></div><span>${f}</span></div>`).join('')}` : ''}
</body></html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Disposition': `attachment; filename="qa-report-${id.slice(-6)}.html"`,
    },
  });
}
