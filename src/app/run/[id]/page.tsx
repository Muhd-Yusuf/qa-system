'use client';

import { useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Badge from '@/components/Badge';
import { streamRun, cancelRun, getRun } from '@/lib/api';

interface LogEntry {
  type: 'action' | 'pass' | 'fail' | 'warn' | 'screenshot';
  text: string;
  prefix: string;
}

function parseLine(line: string): LogEntry {
  if (line.includes('[PASS]')) return { type: 'pass', text: line.replace(/\[PASS\]\s*/, ''), prefix: '[PASS]' };
  if (line.includes('[FAIL]')) return { type: 'fail', text: line.replace(/\[FAIL\]\s*/, ''), prefix: '[FAIL]' };
  if (line.includes('[WARN]')) return { type: 'warn', text: line.replace(/\[WARN\]\s*/, ''), prefix: '[WARN]' };
  if (line.includes('[SCREENSHOT]')) return { type: 'screenshot', text: line.replace(/\[SCREENSHOT\]\s*/, ''), prefix: '[SCREENSHOT]' };
  return { type: 'action', text: line.replace(/\[ACTION\]\s*/, ''), prefix: '[ACTION]' };
}

const barColor: Record<string, string> = {
  action: 'bg-border',
  pass: 'bg-success',
  fail: 'bg-error',
  warn: 'bg-warning',
  screenshot: 'bg-info',
};

const prefixColor: Record<string, string> = {
  action: 'text-text-muted',
  pass: 'text-success',
  fail: 'text-error',
  warn: 'text-warning',
  screenshot: 'text-info',
};

const textColor: Record<string, string> = {
  action: 'text-text-sec',
  pass: 'text-success',
  fail: 'text-error',
  warn: 'text-warning',
  screenshot: 'text-info',
};

export default function LiveRun({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [runMeta, setRunMeta] = useState<any>(null);
  const [finalReport, setFinalReport] = useState<any>(null);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const logRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef(Date.now());

  // Parse requirements from run meta
  const requirements = runMeta?.requirements?.split('\n').filter((r: string) => r.trim()) || [];

  // Build requirement statuses — from streaming logs during run, then from final report
  const getReqStatuses = () => {
    const statuses: Record<number, 'pass' | 'fail' | 'warn' | 'running' | 'pending'> = {};
    requirements.forEach((_: string, i: number) => { statuses[i] = 'pending'; });

    // If run is done and we have a report, use that as source of truth
    if (finalReport?.results?.length) {
      finalReport.results.forEach((r: any, i: number) => {
        if (i < requirements.length) {
          const s = r.status?.toLowerCase();
          if (s === 'pass' || s === 'fail' || s === 'warn') statuses[i] = s;
        }
      });
      return statuses;
    }

    // During live run — match [PASS/FAIL/WARN] Req N lines
    logs.forEach((log) => {
      if (log.type === 'pass' || log.type === 'fail' || log.type === 'warn') {
        const match = log.text.match(/Req(?:uirement)?\s*(\d+)/i);
        if (match) {
          const idx = parseInt(match[1]) - 1;
          if (idx >= 0 && idx < requirements.length) statuses[idx] = log.type;
        }
      }
    });

    return statuses;
  };

  const reqStatuses = getReqStatuses();
  const testedCount = Object.values(reqStatuses).filter(s => s !== 'pending' && s !== 'running').length;
  const progress = requirements.length > 0 ? Math.round((testedCount / requirements.length) * 100) : 0;

  useEffect(() => {
    getRun(id).then((meta) => {
      setRunMeta(meta);
      if (meta?.startedAt) startTimeRef.current = new Date(meta.startedAt).getTime();
      if (meta?.status === 'completed' || meta?.status === 'failed' || meta?.status === 'cancelled') {
        setDone(true);
        if (meta?.results?.length) setFinalReport({ results: meta.results });
      }
    }).catch(() => setError('Failed to load run details'));

    const cleanup = streamRun(
      id,
      (line) => { setLogs((prev) => [...prev, parseLine(line)]); },
      (data) => {
        setDone(true);
        if (data.report?.results?.length) setFinalReport(data.report);
        if (data.status === 'completed' || data.status === 'failed') {
          setTimeout(() => router.push(`/run/${id}/report`), 1500);
        }
      },
    );

    return cleanup;
  }, [id, router]);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const handleStop = async () => {
    await cancelRun(id);
    router.push(`/run/${id}/report`);
  };

  const statusIcon: Record<string, string> = { pass: '\u2713', fail: '\u2717', warn: '\u26A0', running: '\u25CF', pending: '\u25CB' };
  const statusBadgeType: Record<string, string> = { pass: 'PASS', fail: 'FAIL', warn: 'WARN', running: 'RUNNING', pending: 'PENDING' };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-bg">
      <Navbar />

      {/* Meta bar */}
      {error && (
        <div className="bg-error-light border-b border-error px-4 py-2 text-[13px] text-error">{error}</div>
      )}

      {/* Meta bar */}
      <div className="bg-surface border-b border-border px-4 sm:px-8 py-2.5 flex items-center gap-3 sm:gap-5 shrink-0">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-text truncate">
            Run #{id.slice(-4)} &middot; {runMeta?.label || 'QA Run'}
          </div>
          <div className="text-xs text-text-sec font-mono truncate">{runMeta?.url}</div>
        </div>
        <div className="flex items-center gap-3">
          {!done && <Badge status="RUNNING" pulse />}
          {done && <Badge status="completed" />}
          <span className="text-[13px] text-text-sec">Elapsed: {elapsed}s</span>
          {!done && (
            <button onClick={handleStop} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-error-light text-error border border-error rounded-lg text-[13px] font-medium cursor-pointer hover:bg-[#fecaca]">
              &#9632; Stop
            </button>
          )}
        </div>
      </div>

      {/* Split panes */}
      <div className="flex flex-row flex-1 overflow-hidden">
        {/* Left: Log */}
        <div className="flex-1 flex flex-col border-r border-border min-h-0 overflow-hidden">
          <div className="bg-surface-alt border-b border-border px-5 py-3 flex items-center justify-between shrink-0">
            <span className="text-[13px] font-semibold text-text">Live Activity Log</span>
            <Badge status="RUNNING" pulse={!done} />
          </div>
          <div ref={logRef} className="flex-1 overflow-y-auto px-5 py-4 scroll-smooth">
            {logs.map((entry, i) => (
              <div key={i} className={`flex gap-2.5 items-start py-1.5 font-mono text-[12px] leading-relaxed animate-fade-slide`}>
                <div className={`w-[3px] min-h-[36px] rounded-sm shrink-0 mt-0.5 ${barColor[entry.type]}`} />
                <div className="flex-1">
                  <div className={`text-[10px] font-semibold tracking-wider ${prefixColor[entry.type]}`}>{entry.prefix}</div>
                  <div className={`text-[12px] mt-0.5 ${textColor[entry.type]}`}>{entry.text}</div>
                </div>
              </div>
            ))}
            {!done && (
              <span className="inline-block w-[7px] h-[14px] bg-primary rounded-sm animate-blink align-text-bottom ml-8" />
            )}
          </div>
        </div>

        {/* Right: Requirements */}
        <div className="w-[380px] shrink-0 flex flex-col min-h-0 overflow-hidden">
          <div className="bg-surface-alt border-b border-border px-5 py-3 flex items-center justify-between shrink-0">
            <span className="text-[13px] font-semibold text-text">Requirements</span>
            <span className="text-[13px] font-semibold text-text">{testedCount} / {requirements.length} tested</span>
          </div>

          {/* Progress bar */}
          <div className="px-5 py-4 border-b border-border bg-surface shrink-0">
            <div className="flex justify-between text-[11px] font-semibold mb-2">
              <span className="text-text-sec uppercase tracking-wider">Progress</span>
              <span className="text-primary">{progress}%</span>
            </div>
            <div className="h-2 bg-surface-alt rounded border border-border overflow-hidden">
              <div className="h-full bg-primary rounded transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Req cards */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2.5">
            {requirements.map((req: string, i: number) => {
              const st = reqStatuses[i] || 'pending';
              const borderColors: Record<string, string> = { pass: 'border-success-light', fail: 'border-error-light', warn: 'border-warning-light', running: 'border-info-light', pending: 'border-border' };
              const iconBgs: Record<string, string> = { pass: 'bg-success-light text-success', fail: 'bg-error-light text-error', warn: 'bg-warning-light text-warning', running: 'bg-info-light text-info', pending: 'bg-surface-alt text-text-muted' };

              return (
                <div key={i} className={`flex items-start gap-3 p-3.5 px-4 bg-surface border-2 rounded-xl ${borderColors[st]}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${iconBgs[st]} ${st === 'running' ? 'animate-pulse-opacity' : ''}`}>
                    {statusIcon[st]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">Req {i + 1}</div>
                    <div className="text-[13px] font-medium text-text leading-snug">{req.replace(/^\d+\.\s*/, '')}</div>
                  </div>
                  <Badge status={statusBadgeType[st]} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
