'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Badge from '@/components/Badge';
import { useToast } from '@/components/Toast';
import { getRun, exportPDF, type QARun } from '@/lib/api';

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [run, setRun] = useState<QARun | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLog, setShowLog] = useState(false);

  const handleRerun = () => {
    if (!run) return;
    const p: Record<string, string> = {
      url: run.url,
      requirements: run.requirements,
      label: run.label ? `${run.label} (re-run)` : '',
      depth: run.depth,
      project: run.project || '',
    };
    // If auth was used, carry over the username so the form pre-fills
    if (run.auth?.username) {
      p.auth_user = run.auth.username;
    }
    router.push(`/new?${new URLSearchParams(p)}`);
  };

  const handleExport = async () => {
    try {
      const blob = await exportPDF(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qa-report-${id.slice(-6)}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Report exported', 'success');
    } catch { toast('Export failed', 'error'); }
  };

  const [error, setError] = useState('');

  useEffect(() => {
    getRun(id)
      .then(setRun)
      .catch(() => setError('Failed to load report. The run may have been deleted.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-text-sec">Loading report...</div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="min-h-screen bg-bg flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-text-sec gap-2">
          <span>{error || 'Run not found'}</span>
          <Link href="/" className="text-primary text-[13px] hover:underline">&larr; Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const overallStatus = run.summary?.failed > 0 ? 'FAIL' : run.summary?.warnings > 0 ? 'WARN' : 'PASS';
  const formatDuration = (s: number) => {
    if (!s) return '--';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const formatDate = (d: string) => {
    if (!d) return '--';
    return new Date(d).toLocaleString();
  };

  const resultIcons: Record<string, string> = { PASS: '\u2713', FAIL: '\u2717', WARN: '\u26A0' };
  const accentColors: Record<string, string> = { PASS: 'bg-success', FAIL: 'bg-error', WARN: 'bg-warning' };
  const iconBgs: Record<string, string> = { PASS: 'bg-success-light text-success', FAIL: 'bg-error-light text-error', WARN: 'bg-warning-light text-warning' };
  const findingColors = ['bg-error', 'bg-warning', 'bg-info', 'bg-primary', 'bg-text-sec'];

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Navbar />

      {/* Report bar */}
      <div className="bg-surface border-b border-border px-4 sm:px-8 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 shrink-0">
        <div className="flex-1 min-w-0">
          <div className="text-[15px] sm:text-[17px] font-bold text-text truncate">
            QA Report #{id.slice(-4)} &mdash; {run.label || 'QA Run'}
          </div>
          <div className="text-[11px] sm:text-[12px] text-text-sec font-mono mt-0.5 truncate">
            {run.url} &middot; {formatDate(run.startedAt)} &middot; Duration: {formatDuration(run.summary?.durationSeconds)}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge status={overallStatus} />
          <button
            onClick={handleExport}
            className="px-3 py-1.5 bg-surface border border-border rounded-lg text-[13px] font-medium text-text cursor-pointer hover:bg-surface-alt"
          >
            &#11015; Export
          </button>
          <button
            onClick={handleRerun}
            className="px-3 py-1.5 bg-primary text-white rounded-lg text-[13px] font-medium cursor-pointer hover:bg-primary-dark"
          >
            &#8635; Re-run
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-8 max-w-[1400px] w-full mx-auto">
        <Link href="/" className="inline-flex items-center gap-1 text-primary text-[13px] font-medium no-underline hover:underline mb-5">
          &larr; Back to Dashboard
        </Link>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-7">
          {[
            { label: 'Requirements', value: run.summary?.total ?? run.results?.length ?? 0, color: 'text-text', accent: 'bg-border', sub: 'Total' },
            { label: 'Passed', value: run.summary?.passed ?? 0, color: 'text-success', accent: 'bg-success', sub: 'All clear' },
            { label: 'Failed', value: run.summary?.failed ?? 0, color: 'text-error', accent: 'bg-error', sub: 'Needs fix' },
            { label: 'Warnings', value: run.summary?.warnings ?? 0, color: 'text-warning', accent: 'bg-warning', sub: 'Review needed' },
            { label: 'Extra Findings', value: run.extraFindings?.length ?? 0, color: 'text-primary', accent: 'bg-primary', sub: 'Auto-discovered' },
          ].map((s) => (
            <div key={s.label} className="bg-surface border border-border rounded-xl px-5 py-4 text-center relative overflow-hidden shadow-sm">
              <div className={`absolute top-0 left-0 right-0 h-1 ${s.accent}`} />
              <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">{s.label}</div>
              <div className={`text-[30px] font-bold leading-none my-2 ${s.color}`}>{s.value}</div>
              <div className="text-[12px] text-text-sec">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Results */}
        <h2 className="text-[15px] font-semibold text-text mb-3.5">Test Results</h2>
        <div className="flex flex-col gap-2 mb-7">
          {(run.results || []).map((r, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl flex overflow-hidden shadow-sm hover:shadow transition-shadow">
              <div className={`w-1 shrink-0 self-stretch ${accentColors[r.status]}`} />
              <div className="flex items-start gap-4 p-4 px-5 flex-1">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[15px] font-bold shrink-0 mt-0.5 ${iconBgs[r.status]}`}>
                  {resultIcons[r.status]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">Req {i + 1}</div>
                  <div className="text-sm font-semibold text-text mb-1">{r.requirement}</div>
                  <div className="text-[13px] text-text-sec leading-relaxed">{r.detail}</div>
                  {r.screenshot && (
                    <div className="mt-2 text-[11px] text-text-muted flex items-center gap-1.5">
                      <span>&#128247;</span> Screenshot: {r.screenshot}
                    </div>
                  )}
                </div>
                <Badge status={r.status} />
              </div>
            </div>
          ))}
          {(!run.results || run.results.length === 0) && (
            <div className="text-center py-8 text-text-sec">No results available yet.</div>
          )}
        </div>

        {/* Extra findings */}
        {run.extraFindings && run.extraFindings.length > 0 && (
          <>
            <h2 className="text-[15px] font-semibold text-text mb-1">Extra Findings</h2>
            <p className="text-[13px] text-text-sec mb-3.5">Discovered autonomously beyond stated requirements</p>
            <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm mb-7">
              {run.extraFindings.map((f, i) => (
                <div key={i} className={`flex items-start gap-3 px-5 py-3.5 text-[13px] ${i < run.extraFindings.length - 1 ? 'border-b border-border' : ''}`}>
                  <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${findingColors[i % findingColors.length]}`} />
                  <span className="text-text leading-relaxed">{f}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Screenshots */}
        {run.screenshots && run.screenshots.length > 0 && (
          <>
            <h2 className="text-[15px] font-semibold text-text mb-3.5">Screenshots</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-7">
              {run.screenshots.map((s, i) => (
                <div key={i} className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
                  {s.data && (
                    <img
                      src={s.data.startsWith('data:') ? s.data : `data:image/png;base64,${s.data}`}
                      alt={s.label}
                      className="w-full h-auto"
                    />
                  )}
                  <div className="p-3">
                    <div className="text-[12px] text-text-sec">{s.label}</div>
                    {s.timestamp && (
                      <div className="text-[11px] text-text-muted mt-0.5">{new Date(s.timestamp).toLocaleTimeString()}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Full log toggle */}
        <button
          onClick={() => setShowLog(!showLog)}
          className="text-[13px] font-medium text-primary cursor-pointer hover:underline bg-transparent border-none mb-4"
        >
          {showLog ? '\u25B2 Hide' : '\u25BC Show'} Full Activity Log ({run.log?.length || 0} lines)
        </button>
        {showLog && (
          <div className="bg-surface border border-border rounded-xl p-5 max-h-[400px] overflow-y-auto font-mono text-[12px] text-text-sec leading-relaxed">
            {(run.log || []).map((line, i) => (
              <div key={i} className="py-0.5">{line}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
