'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Badge from '@/components/Badge';
import { getRun, type QARun } from '@/lib/api';

function CompareContent() {
  const searchParams = useSearchParams();
  const idA = searchParams.get('a') || '';
  const idB = searchParams.get('b') || '';
  const [runA, setRunA] = useState<QARun | null>(null);
  const [runB, setRunB] = useState<QARun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!idA || !idB) return;
    setError('');
    Promise.all([getRun(idA), getRun(idB)])
      .then(([a, b]) => { setRunA(a); setRunB(b); })
      .catch(() => setError('Failed to load runs for comparison.'))
      .finally(() => setLoading(false));
  }, [idA, idB]);

  if (loading) return <div className="flex-1 flex items-center justify-center text-text-sec">Loading...</div>;
  if (!runA || !runB) return (
    <div className="flex-1 flex flex-col items-center justify-center text-text-sec gap-2">
      <span>{error || 'Runs not found'}</span>
      <Link href="/" className="text-primary text-[13px] hover:underline">&larr; Back to Dashboard</Link>
    </div>
  );

  const statusColor: Record<string, string> = { PASS: 'text-success', FAIL: 'text-error', WARN: 'text-warning' };

  const allReqs = new Set([
    ...(runA.results || []).map(r => r.requirement),
    ...(runB.results || []).map(r => r.requirement),
  ]);

  return (
    <div className="flex-1 p-4 sm:p-8 max-w-[1400px] w-full mx-auto">
      <Link href="/" className="inline-flex items-center gap-1 text-primary text-[13px] font-medium no-underline hover:underline mb-5">
        &larr; Back to Dashboard
      </Link>
      <h1 className="text-2xl font-bold text-text mb-2">Compare Runs</h1>
      <p className="text-sm text-text-sec mb-6">Side-by-side comparison of two test runs</p>

      {/* Header comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {[runA, runB].map((run, i) => (
          <div key={i} className="bg-surface border border-border rounded-xl p-5">
            <div className="text-sm font-semibold text-text mb-1">{run.label || 'Untitled Run'}</div>
            <div className="text-[12px] text-text-sec font-mono mb-2">{run.url}</div>
            <div className="flex gap-2">
              <Badge status={run.summary?.failed > 0 ? 'FAIL' : run.summary?.warnings > 0 ? 'WARN' : 'PASS'} />
              <span className="text-[12px] text-text-sec">
                {run.summary?.passed}/{run.summary?.total} passed
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Requirement-by-requirement comparison */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_100px] bg-surface-alt border-b border-border">
          <div className="px-5 py-3 text-[11px] font-semibold text-text-sec uppercase tracking-wider">Requirement</div>
          <div className="px-3 py-3 text-[11px] font-semibold text-text-sec uppercase tracking-wider text-center">Run A</div>
          <div className="px-3 py-3 text-[11px] font-semibold text-text-sec uppercase tracking-wider text-center">Run B</div>
        </div>
        {Array.from(allReqs).map((req, i) => {
          const rA = runA.results?.find(r => r.requirement === req);
          const rB = runB.results?.find(r => r.requirement === req);
          const changed = rA?.status !== rB?.status;
          return (
            <div key={i} className={`grid grid-cols-[1fr_100px_100px] border-b border-border ${changed ? 'bg-warning-light/30' : ''}`}>
              <div className="px-5 py-3 text-[13px] text-text">{req}</div>
              <div className={`px-3 py-3 text-center text-[13px] font-semibold ${statusColor[rA?.status || ''] || 'text-text-muted'}`}>
                {rA?.status || '--'}
              </div>
              <div className={`px-3 py-3 text-center text-[13px] font-semibold ${statusColor[rB?.status || ''] || 'text-text-muted'}`}>
                {rB?.status || '--'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Navbar />
      <Suspense fallback={<div className="flex-1 flex items-center justify-center text-text-sec">Loading...</div>}>
        <CompareContent />
      </Suspense>
    </div>
  );
}
