'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Badge from '@/components/Badge';
import { useToast } from '@/components/Toast';
import { getRuns, deleteRun, getProjects, type QARun } from '@/lib/api';

const PAGE_SIZE = 20;

export default function Dashboard() {
  const [runs, setRuns] = useState<QARun[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [projects, setProjects] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const { toast } = useToast();

  const fetchRuns = useCallback(() => {
    setLoading(true);
    setError('');
    getRuns(page, PAGE_SIZE, { status: statusFilter, search, project: projectFilter })
      .then((data) => { setRuns(data.runs); setTotal(data.total); setPages(data.pages); })
      .catch(() => setError('Failed to load runs. Check your connection.'))
      .finally(() => setLoading(false));
  }, [search, statusFilter, projectFilter, page]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);
  useEffect(() => {
    getProjects().then(setProjects).catch(() => {});
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, statusFilter, projectFilter]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this run?')) return;
    try {
      await deleteRun(id);
      toast('Run deleted', 'success');
      fetchRuns();
    } catch { toast('Failed to delete run', 'error'); }
  };

  const toggleCompare = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompareIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 2 ? [...prev, id] : [prev[1], id]
    );
  };

  const totalRuns = total;
  const passedRuns = runs.filter(r => r.status === 'completed' && r.summary?.failed === 0).length;
  const passRate = runs.length > 0 ? Math.round((passedRuns / runs.length) * 100) : 0;
  const runningNow = runs.filter(r => r.status === 'running').length;
  const avgDuration = runs.filter(r => r.summary?.durationSeconds).length > 0
    ? Math.round(runs.reduce((sum, r) => sum + (r.summary?.durationSeconds || 0), 0) / runs.filter(r => r.summary?.durationSeconds).length)
    : 0;

  const formatDuration = (s: number) => {
    if (!s) return '--';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const formatDate = (d: string) => {
    if (!d) return '--';
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 86400000) return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (diff < 172800000) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getRunStatus = (run: QARun) => {
    if (run.status === 'running') return 'running';
    if (run.status === 'cancelled') return 'cancelled';
    if (run.status === 'failed') return 'failed';
    if (run.summary?.failed > 0) return 'FAIL';
    if (run.summary?.warnings > 0) return 'WARN';
    return 'PASS';
  };

  const getReqSummary = (run: QARun) => {
    if (run.status === 'running') return 'In progress...';
    if (!run.summary) return '--';
    return `${run.summary.passed} / ${run.summary.total} passed`;
  };

  const stats = [
    { value: totalRuns.toString(), label: 'Total Runs', accent: 'bg-primary', iconBg: 'bg-primary-light', icon: '\uD83D\uDCCA' },
    { value: `${passRate}%`, label: 'Pass Rate', accent: 'bg-success', iconBg: 'bg-success-light', icon: '\u2713' },
    { value: runningNow.toString(), label: 'Running Now', accent: 'bg-info', iconBg: 'bg-info-light', icon: '\u26A1' },
    { value: formatDuration(avgDuration), label: 'Avg Duration', accent: 'bg-warning', iconBg: 'bg-warning-light', icon: '\u23F1' },
  ];

  const statusOptions = [
    { value: '', label: 'All' },
    { value: 'pass', label: 'Passed' },
    { value: 'fail', label: 'Failed' },
    { value: 'warn', label: 'Warnings' },
    { value: 'running', label: 'Running' },
  ];

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Navbar />
      <div className="flex-1 p-4 sm:p-8 max-w-[1400px] w-full mx-auto">
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-text">Dashboard</h1>
          <p className="text-sm text-text-sec mt-1">All QA test runs and results</p>
        </div>

        {error && (
          <div className="bg-error-light border border-error rounded-lg p-3 px-4 mb-5 text-[13px] text-error flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchRuns} className="text-[12px] font-medium underline cursor-pointer">Retry</button>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
          {stats.map((s) => (
            <div key={s.label} className="bg-surface border border-border rounded-xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 shadow-sm">
              <div className={`w-1 h-10 rounded-sm ${s.accent}`} />
              <div className="flex-1 min-w-0">
                <div className="text-xl sm:text-[26px] font-bold text-text leading-tight">{s.value}</div>
                <div className="text-xs text-text-sec mt-1">{s.label}</div>
              </div>
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-base sm:text-lg ${s.iconBg} shrink-0`}>
                {s.icon}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between p-4 px-5 border-b border-border gap-3 flex-wrap">
            <span className="text-[15px] font-semibold">Recent Test Runs</span>
            <div className="flex items-center gap-2 flex-wrap">
              {compareIds.length === 2 && (
                <Link
                  href={`/compare?a=${compareIds[0]}&b=${compareIds[1]}`}
                  className="px-3 py-1.5 bg-primary text-white rounded-lg text-[12px] font-medium no-underline hover:bg-primary-dark"
                >
                  Compare ({compareIds.length})
                </Link>
              )}
              {projects.length > 0 && (
                <select
                  value={projectFilter}
                  onChange={e => setProjectFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-surface border border-border rounded-lg text-[12px] text-text-sec outline-none"
                >
                  <option value="">All Projects</option>
                  {projects.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              )}
              <div className="flex gap-1">
                {statusOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setStatusFilter(opt.value)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer transition-colors ${
                      statusFilter === opt.value
                        ? 'bg-primary text-white'
                        : 'bg-surface-alt text-text-sec hover:text-text'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search runs..."
                className="px-3 py-1.5 bg-surface-alt border border-border rounded-lg text-[12px] text-text outline-none w-36 sm:w-48 placeholder:text-text-muted focus:border-primary"
              />
            </div>
          </div>

          {/* Mobile card view */}
          <div className="block lg:hidden">
            {loading ? (
              <div className="px-4 py-12 text-center text-text-sec">Loading...</div>
            ) : runs.length === 0 ? (
              <div className="px-4 py-12 text-center text-text-sec">No runs found.</div>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {runs.map((run) => (
                  <div key={run._id} className="p-4 hover:bg-surface-alt transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="text-[13px] font-medium text-text">{run.label || 'Untitled Run'}</div>
                        <div className="text-[11px] text-text-sec font-mono mt-0.5 truncate max-w-[200px]">{run.url}</div>
                      </div>
                      <Badge status={getRunStatus(run)} pulse={run.status === 'running'} />
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-text-sec">
                      <span>{getReqSummary(run)}</span>
                      <span>{formatDuration(run.summary?.durationSeconds)}</span>
                      <span>{formatDate(run.createdAt)}</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Link
                        href={run.status === 'running' ? `/run/${run._id}` : `/run/${run._id}/report`}
                        className="px-2.5 py-1 bg-surface border border-border rounded-md text-[12px] font-medium text-text no-underline hover:bg-surface-alt"
                      >
                        {run.status === 'running' ? 'View' : 'Report'}
                      </Link>
                      <button
                        onClick={(e) => handleDelete(run._id, e)}
                        className="px-2 py-1 bg-surface border border-border rounded-md text-[12px] text-error cursor-pointer hover:bg-error-light"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Desktop table view */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="bg-surface-alt px-4 py-2.5 text-left text-[11px] font-semibold text-text-sec uppercase tracking-wider border-b border-border w-8"></th>
                  <th className="bg-surface-alt px-4 py-2.5 text-left text-[11px] font-semibold text-text-sec uppercase tracking-wider border-b border-border">Label</th>
                  <th className="bg-surface-alt px-4 py-2.5 text-left text-[11px] font-semibold text-text-sec uppercase tracking-wider border-b border-border">Target URL</th>
                  <th className="bg-surface-alt px-4 py-2.5 text-left text-[11px] font-semibold text-text-sec uppercase tracking-wider border-b border-border">Status</th>
                  <th className="bg-surface-alt px-4 py-2.5 text-left text-[11px] font-semibold text-text-sec uppercase tracking-wider border-b border-border">Requirements</th>
                  <th className="bg-surface-alt px-4 py-2.5 text-left text-[11px] font-semibold text-text-sec uppercase tracking-wider border-b border-border">Duration</th>
                  <th className="bg-surface-alt px-4 py-2.5 text-left text-[11px] font-semibold text-text-sec uppercase tracking-wider border-b border-border">Date</th>
                  <th className="bg-surface-alt px-4 py-2.5 text-left text-[11px] font-semibold text-text-sec uppercase tracking-wider border-b border-border"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-text-sec">Loading...</td></tr>
                ) : runs.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-text-sec">No runs found.</td></tr>
                ) : (
                  runs.map((run) => (
                    <tr key={run._id} className="border-b border-border hover:bg-surface-alt transition-colors cursor-pointer">
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={compareIds.includes(run._id)}
                          onChange={() => {}}
                          onClick={(e) => toggleCompare(run._id, e)}
                          className="cursor-pointer accent-primary"
                          title="Select for comparison"
                        />
                      </td>
                      <td className="px-4 py-3.5 text-[13px] font-medium text-text">
                        <div>{run.label || 'Untitled Run'}</div>
                        {run.project && <div className="text-[10px] text-text-muted mt-0.5">{run.project}</div>}
                      </td>
                      <td className="px-4 py-3.5 text-[12px] text-text-sec font-mono max-w-[200px] truncate">{run.url}</td>
                      <td className="px-4 py-3.5">
                        <Badge status={getRunStatus(run)} pulse={run.status === 'running'} />
                      </td>
                      <td className="px-4 py-3.5 text-[12px] text-text-sec">{getReqSummary(run)}</td>
                      <td className="px-4 py-3.5 text-[12px] text-text-sec">{formatDuration(run.summary?.durationSeconds)}</td>
                      <td className="px-4 py-3.5 text-[12px] text-text-sec">{formatDate(run.createdAt)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-1.5">
                          <Link
                            href={run.status === 'running' ? `/run/${run._id}` : `/run/${run._id}/report`}
                            className="px-2.5 py-1 bg-surface border border-border rounded-md text-[12px] font-medium text-text no-underline hover:bg-surface-alt"
                            onClick={e => e.stopPropagation()}
                          >
                            {run.status === 'running' ? 'View' : 'Report'}
                          </Link>
                          <button
                            onClick={(e) => handleDelete(run._id, e)}
                            className="px-2 py-1 bg-surface border border-border rounded-md text-[12px] text-error cursor-pointer hover:bg-error-light"
                            title="Delete run"
                          >
                            &times;
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-border">
              <span className="text-[12px] text-text-sec">
                Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, total)} of {total}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 bg-surface border border-border rounded-lg text-[12px] font-medium text-text cursor-pointer hover:bg-surface-alt disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  &larr; Prev
                </button>
                {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (pages <= 7) {
                    pageNum = i + 1;
                  } else if (page <= 4) {
                    pageNum = i + 1;
                  } else if (page >= pages - 3) {
                    pageNum = pages - 6 + i;
                  } else {
                    pageNum = page - 3 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 py-1.5 rounded-lg text-[12px] font-medium cursor-pointer transition-colors ${
                        page === pageNum
                          ? 'bg-primary text-white'
                          : 'bg-surface border border-border text-text-sec hover:bg-surface-alt'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(pages, p + 1))}
                  disabled={page === pages}
                  className="px-3 py-1.5 bg-surface border border-border rounded-lg text-[12px] font-medium text-text cursor-pointer hover:bg-surface-alt disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
