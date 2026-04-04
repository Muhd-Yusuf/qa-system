'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useToast } from '@/components/Toast';
import { createRun, createTemplate, getTemplates, type QATemplate } from '@/lib/api';

export default function NewRunPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg flex flex-col"><Navbar /><div className="flex-1 flex items-center justify-center text-text-sec">Loading...</div></div>}>
      <NewRun />
    </Suspense>
  );
}

function NewRun() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [requirements, setRequirements] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [depth, setDepth] = useState('standard');
  const [project, setProject] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [templates, setTemplates] = useState<QATemplate[]>([]);

  useEffect(() => {
    getTemplates().then(setTemplates).catch(() => {});
    // Pre-fill from query params (re-run)
    const pUrl = searchParams.get('url');
    const pReqs = searchParams.get('requirements');
    const pLabel = searchParams.get('label');
    const pDepth = searchParams.get('depth');
    const pProject = searchParams.get('project');
    const pAuthUser = searchParams.get('auth_user');
    if (pUrl) setUrl(pUrl);
    if (pReqs) setRequirements(pReqs);
    if (pLabel) setLabel(pLabel);
    if (pDepth) setDepth(pDepth);
    if (pProject) setProject(pProject);
    if (pAuthUser) {
      setUsername(pAuthUser);
      setAuthOpen(true);
    }
  }, [searchParams]);

  const depths = [
    { id: 'quick', label: 'Quick', desc: 'Key flows only ~ 1-2 min' },
    { id: 'standard', label: 'Standard', desc: 'Full requirements + edge cases ~ 3-5 min' },
    { id: 'thorough', label: 'Thorough', desc: 'Deep regression-level exploration ~ 8-15 min' },
  ];

  const loadTemplate = (t: QATemplate) => {
    setUrl(t.url);
    setRequirements(t.requirements);
    setDepth(t.depth);
    setProject(t.project);
    toast('Template loaded', 'info');
  };

  const handleSaveTemplate = async () => {
    if (!url || !requirements) { toast('URL and requirements needed', 'error'); return; }
    const name = prompt('Template name:');
    if (!name) return;
    try {
      await createTemplate({ name, url, requirements, depth, project });
      toast('Template saved', 'success');
      getTemplates().then(setTemplates);
    } catch { toast('Failed to save template', 'error'); }
  };

  const handleSubmit = async () => {
    if (!url || !requirements) return;
    setSubmitting(true);
    try {
      const result = await createRun({
        url,
        requirements,
        auth: username ? { username, password } : undefined,
        depth,
        label,
        project,
      });
      toast('QA run started!', 'success');
      router.push(`/run/${result.id}`);
    } catch {
      toast('Failed to start QA run. Is the backend running?', 'error');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Navbar />
      <div className="flex-1 p-4 sm:p-8 max-w-[1400px] w-full mx-auto">
        <Link href="/" className="inline-flex items-center gap-1 text-primary text-[13px] font-medium no-underline hover:underline mb-5">
          &larr; Back to Dashboard
        </Link>
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-text">New QA Run</h1>
          <p className="text-sm text-text-sec mt-1">Configure your test session - Claude will handle everything autonomously.</p>
        </div>

        <div className="max-w-[740px] mx-auto">
          <div className="flex items-start gap-2 bg-primary-light border border-[#c7d2fe] rounded-lg p-3 px-4 mb-5 text-[13px] text-primary">
            <span>&#128161;</span>
            <span>Just provide a URL and describe what to test in plain English. Claude will navigate, click, fill forms, and validate everything by itself.</span>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-10 shadow-md">
            {/* Templates */}
            {templates.length > 0 && (
              <div className="mb-6">
                <label className="flex items-center gap-1.5 text-[13px] font-semibold text-text mb-1.5">
                  Load Template <span className="text-text-muted text-[11px] font-normal">optional</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {templates.map(t => (
                    <button
                      key={t._id}
                      onClick={() => loadTemplate(t)}
                      className="px-3 py-1.5 bg-surface-alt border border-border rounded-lg text-[12px] font-medium text-text-sec cursor-pointer hover:border-primary hover:text-primary transition-colors"
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* URL */}
            <div className="mb-6">
              <label className="flex items-center gap-1.5 text-[13px] font-semibold text-text mb-1.5">
                Target URL <span className="text-error">*</span>
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://app.example.com"
                className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-lg text-[13px] text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 placeholder:text-text-muted"
              />
            </div>

            {/* Label */}
            <div className="mb-6">
              <label className="flex items-center gap-1.5 text-[13px] font-semibold text-text mb-1.5">
                Run Label <span className="text-text-muted text-[11px] font-normal">optional</span>
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Sprint 14 - Checkout Flow"
                className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-lg text-[13px] text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 placeholder:text-text-muted"
              />
            </div>

            {/* Requirements */}
            <div className="mb-6">
              <label className="flex items-center gap-1.5 text-[13px] font-semibold text-text mb-1">
                Testing Requirements <span className="text-error">*</span>
              </label>
              <p className="text-[12px] text-text-sec mb-2">One requirement per line. Use plain language - Claude understands context.</p>
              <textarea
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                rows={7}
                placeholder={`1. User can login with valid credentials\n2. Checkout flow completes without errors\n3. Empty form fields show validation messages\n4. Dashboard loads within 3 seconds\n5. 404 page is shown for unknown routes`}
                className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-lg text-[13px] text-text font-mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 placeholder:text-text-muted resize-y min-h-[150px] leading-relaxed"
              />
            </div>

            {/* Auth */}
            <div className="mb-6">
              <button
                onClick={() => setAuthOpen(!authOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-surface-alt border border-border rounded-lg text-[13px] font-medium cursor-pointer hover:bg-[#e2e8f0] transition-colors"
              >
                <span>&#128274; Authentication</span>
                <span className="flex items-center gap-2">
                  <span className="text-[11px] text-text-muted font-normal">optional</span>
                  <span className={`text-text-sec transition-transform ${authOpen ? 'rotate-180' : ''}`}>&#9662;</span>
                </span>
              </button>
              {authOpen && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Email or username"
                    className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-lg text-[13px] text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 placeholder:text-text-muted"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-lg text-[13px] text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 placeholder:text-text-muted"
                  />
                </div>
              )}
            </div>

            {/* Project */}
            <div className="mb-6">
              <label className="flex items-center gap-1.5 text-[13px] font-semibold text-text mb-1.5">
                Project <span className="text-text-muted text-[11px] font-normal">optional</span>
              </label>
              <input
                type="text"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="e.g. MyApp, Frontend, API"
                className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-lg text-[13px] text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 placeholder:text-text-muted"
              />
            </div>

            {/* Depth */}
            <div className="mb-6">
              <p className="text-[13px] font-semibold text-text mb-2.5">Test Depth</p>
              {depths.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDepth(d.id)}
                  className={`w-full flex items-start gap-3 px-4 py-3 border rounded-lg cursor-pointer transition-all mb-2 text-left ${
                    depth === d.id
                      ? 'border-primary border-2 bg-primary-light'
                      : 'border-border bg-surface hover:border-primary hover:bg-primary-light'
                  }`}
                >
                  <div className={`w-[18px] h-[18px] rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                    depth === d.id ? 'border-primary bg-primary' : 'border-border bg-surface'
                  }`}>
                    {depth === d.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <div className={`font-semibold text-[13px] ${depth === d.id ? 'text-primary' : 'text-text'}`}>{d.label}</div>
                    <div className="text-[12px] text-text-sec mt-0.5">{d.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Submit */}
            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={submitting || !url || !requirements}
                className="flex-1 py-3 px-6 bg-primary text-white rounded-[10px] text-[15px] font-semibold cursor-pointer hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Starting...' : '\u25B6  Start QA Run'}
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-4 py-3 bg-surface border border-border rounded-[10px] text-[13px] font-medium text-text-sec cursor-pointer hover:bg-surface-alt transition-colors"
                title="Save current config as template"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
