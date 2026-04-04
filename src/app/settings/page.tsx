'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { useToast } from '@/components/Toast';
import {
  getTemplates, deleteTemplate,
  getWebhooks, createWebhook, deleteWebhook,
  getSchedules, createSchedule, toggleSchedule, deleteSchedule,
  type QATemplate, type QAWebhook, type QASchedule,
} from '@/lib/api';

export default function SettingsPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<'templates' | 'webhooks' | 'schedules'>('templates');
  const [templates, setTemplates] = useState<QATemplate[]>([]);
  const [webhooks, setWebhooks] = useState<QAWebhook[]>([]);
  const [schedules, setSchedules] = useState<QASchedule[]>([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [webhookEvents, setWebhookEvents] = useState<string[]>(['run.completed', 'run.failed']);
  const [scheduleName, setScheduleName] = useState('');
  const [scheduleTemplateId, setScheduleTemplateId] = useState('');
  const [scheduleCron, setScheduleCron] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      getTemplates().catch(() => []),
      getWebhooks().catch(() => []),
      getSchedules().catch(() => []),
    ])
      .then(([t, w, s]) => {
        setTemplates(t);
        setWebhooks(w);
        setSchedules(s);
      })
      .catch(() => setError('Failed to load settings data'))
      .finally(() => setLoading(false));
  }, []);

  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteTemplate(id);
      toast('Template deleted', 'success');
      setTemplates(prev => prev.filter(t => t._id !== id));
    } catch {
      toast('Failed to delete template', 'error');
    }
  };

  const handleAddWebhook = async () => {
    if (!webhookUrl) { toast('URL required', 'error'); return; }
    try {
      const wh = await createWebhook({
        url: webhookUrl,
        events: webhookEvents,
        ...(webhookSecret ? { secret: webhookSecret } : {}),
      });
      setWebhooks(prev => [wh, ...prev]);
      setWebhookUrl('');
      setWebhookSecret('');
      toast('Webhook added', 'success');
    } catch { toast('Failed to add webhook', 'error'); }
  };

  const handleDeleteWebhook = async (id: string) => {
    try {
      await deleteWebhook(id);
      toast('Webhook deleted', 'success');
      setWebhooks(prev => prev.filter(w => w._id !== id));
    } catch {
      toast('Failed to delete webhook', 'error');
    }
  };

  const handleAddSchedule = async () => {
    if (!scheduleName || !scheduleTemplateId || !scheduleCron) {
      toast('Name, template, and cron expression are required', 'error');
      return;
    }
    try {
      const s = await createSchedule({ name: scheduleName, templateId: scheduleTemplateId, cron: scheduleCron });
      setSchedules(prev => [s, ...prev]);
      setScheduleName('');
      setScheduleCron('');
      toast('Schedule created', 'success');
    } catch {
      toast('Failed to create schedule. Check cron expression.', 'error');
    }
  };

  const handleToggleSchedule = async (id: string, enabled: boolean) => {
    try {
      const updated = await toggleSchedule(id, enabled);
      setSchedules(prev => prev.map(s => s._id === id ? { ...s, enabled: updated.enabled } : s));
      toast(enabled ? 'Schedule enabled' : 'Schedule paused', 'info');
    } catch {
      toast('Failed to update schedule', 'error');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await deleteSchedule(id);
      toast('Schedule deleted', 'success');
      setSchedules(prev => prev.filter(s => s._id !== id));
    } catch {
      toast('Failed to delete schedule', 'error');
    }
  };

  const toggleEvent = (event: string) => {
    setWebhookEvents(prev =>
      prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
    );
  };

  const tabs = [
    { id: 'templates' as const, label: 'Saved Templates' },
    { id: 'webhooks' as const, label: 'Webhooks' },
    { id: 'schedules' as const, label: 'Scheduled Runs' },
  ];

  const cronExamples = [
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Daily at 9am', value: '0 9 * * *' },
    { label: 'Mon-Fri at 8am', value: '0 8 * * 1-5' },
    { label: 'Every 6 hours', value: '0 */6 * * *' },
  ];

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Navbar />
      <div className="flex-1 p-4 sm:p-8 max-w-[900px] w-full mx-auto">
        <h1 className="text-2xl font-bold text-text mb-1">Settings</h1>
        <p className="text-sm text-text-sec mb-6">Manage templates, webhooks, schedules, and notifications</p>

        {error && (
          <div className="bg-error-light border border-error rounded-lg p-3 px-4 mb-5 text-[13px] text-error">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-0 border-b border-border mb-6 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2.5 text-[13px] font-medium cursor-pointer border-b-2 -mb-px transition-colors whitespace-nowrap ${
                tab === t.id ? 'text-primary border-primary' : 'text-text-sec border-transparent hover:text-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-text-sec">Loading settings...</div>
        ) : (
          <>
            {/* Templates */}
            {tab === 'templates' && (
              <div>
                {templates.length === 0 ? (
                  <div className="text-center py-12 text-text-sec">
                    No templates yet. Save one from the New Run form.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {templates.map(t => (
                      <div key={t._id} className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-text">{t.name}</div>
                          <div className="text-[12px] text-text-sec font-mono mt-0.5 truncate">{t.url}</div>
                          <div className="text-[11px] text-text-muted mt-1">
                            {t.requirements.split('\n').length} requirements &middot; {t.depth} depth
                            {t.project && ` \u00b7 ${t.project}`}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteTemplate(t._id)}
                          className="px-3 py-1.5 bg-surface border border-border rounded-lg text-[12px] text-error cursor-pointer hover:bg-error-light shrink-0"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Webhooks */}
            {tab === 'webhooks' && (
              <div>
                <div className="bg-surface border border-border rounded-xl p-5 mb-6">
                  <h3 className="text-[13px] font-semibold text-text mb-3">Add Webhook</h3>
                  <div className="flex gap-3 mb-3 flex-col sm:flex-row">
                    <input
                      type="url"
                      value={webhookUrl}
                      onChange={e => setWebhookUrl(e.target.value)}
                      placeholder="https://hooks.slack.com/services/..."
                      className="flex-1 px-3.5 py-2.5 bg-surface border border-border rounded-lg text-[13px] text-text outline-none focus:border-primary placeholder:text-text-muted"
                    />
                    <button
                      onClick={handleAddWebhook}
                      className="px-4 py-2.5 bg-primary text-white rounded-lg text-[13px] font-medium cursor-pointer hover:bg-primary-dark shrink-0"
                    >
                      Add
                    </button>
                  </div>
                  <div className="mb-3">
                    <input
                      type="text"
                      value={webhookSecret}
                      onChange={e => setWebhookSecret(e.target.value)}
                      placeholder="Secret token (optional) - sent as X-Webhook-Secret header"
                      className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-lg text-[13px] text-text outline-none focus:border-primary placeholder:text-text-muted"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {['run.completed', 'run.failed', 'run.cancelled'].map(event => (
                      <label key={event} className="flex items-center gap-1.5 text-[12px] text-text-sec cursor-pointer">
                        <input
                          type="checkbox"
                          checked={webhookEvents.includes(event)}
                          onChange={() => toggleEvent(event)}
                          className="accent-primary"
                        />
                        {event}
                      </label>
                    ))}
                  </div>
                </div>

                {webhooks.length === 0 ? (
                  <div className="text-center py-8 text-text-sec">No webhooks configured.</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {webhooks.map(w => (
                      <div key={w._id} className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-mono text-text truncate">{w.url}</div>
                          <div className="text-[11px] text-text-muted mt-1">
                            Events: {w.events.join(', ')}
                            {w.secret && ' \u00b7 Has secret'}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteWebhook(w._id)}
                          className="px-3 py-1.5 bg-surface border border-border rounded-lg text-[12px] text-error cursor-pointer hover:bg-error-light shrink-0"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Schedules */}
            {tab === 'schedules' && (
              <div>
                <div className="bg-surface border border-border rounded-xl p-5 mb-6">
                  <h3 className="text-[13px] font-semibold text-text mb-3">Create Scheduled Run</h3>
                  <div className="flex flex-col gap-3">
                    <input
                      type="text"
                      value={scheduleName}
                      onChange={e => setScheduleName(e.target.value)}
                      placeholder="Schedule name (e.g. Nightly regression)"
                      className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-lg text-[13px] text-text outline-none focus:border-primary placeholder:text-text-muted"
                    />
                    <select
                      value={scheduleTemplateId}
                      onChange={e => setScheduleTemplateId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-lg text-[13px] text-text outline-none focus:border-primary"
                    >
                      <option value="">Select a template...</option>
                      {templates.map(t => (
                        <option key={t._id} value={t._id}>{t.name} ({t.url})</option>
                      ))}
                    </select>
                    {templates.length === 0 && (
                      <p className="text-[12px] text-warning">No templates found. Save a template from the New Run form first.</p>
                    )}
                    <div>
                      <input
                        type="text"
                        value={scheduleCron}
                        onChange={e => setScheduleCron(e.target.value)}
                        placeholder="Cron expression (e.g. 0 9 * * 1-5)"
                        className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-lg text-[13px] text-text font-mono outline-none focus:border-primary placeholder:text-text-muted"
                      />
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {cronExamples.map(ex => (
                          <button
                            key={ex.value}
                            onClick={() => setScheduleCron(ex.value)}
                            className="px-2.5 py-1 bg-surface-alt border border-border rounded-md text-[11px] text-text-sec cursor-pointer hover:border-primary hover:text-primary"
                          >
                            {ex.label}: <span className="font-mono">{ex.value}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={handleAddSchedule}
                      disabled={!scheduleName || !scheduleTemplateId || !scheduleCron}
                      className="w-fit px-5 py-2.5 bg-primary text-white rounded-lg text-[13px] font-medium cursor-pointer hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Create Schedule
                    </button>
                  </div>
                </div>

                {schedules.length === 0 ? (
                  <div className="text-center py-8 text-text-sec">No scheduled runs configured.</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {schedules.map(s => {
                      const tmpl = typeof s.templateId === 'object' ? s.templateId : null;
                      return (
                        <div key={s._id} className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${s.enabled ? 'bg-success' : 'bg-text-muted'}`} />
                              <div className="text-sm font-semibold text-text">{s.name}</div>
                            </div>
                            <div className="text-[12px] text-text-sec font-mono mt-0.5">
                              {s.cron}
                              {tmpl && ` \u2192 ${tmpl.name}`}
                            </div>
                            <div className="text-[11px] text-text-muted mt-1">
                              {s.enabled ? 'Active' : 'Paused'}
                              {s.lastRunAt && ` \u00b7 Last ran: ${new Date(s.lastRunAt).toLocaleString()}`}
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => handleToggleSchedule(s._id, !s.enabled)}
                              className={`px-3 py-1.5 border rounded-lg text-[12px] font-medium cursor-pointer ${
                                s.enabled
                                  ? 'bg-surface border-border text-warning hover:bg-warning-light'
                                  : 'bg-surface border-border text-success hover:bg-success-light'
                              }`}
                            >
                              {s.enabled ? 'Pause' : 'Enable'}
                            </button>
                            <button
                              onClick={() => handleDeleteSchedule(s._id)}
                              className="px-3 py-1.5 bg-surface border border-border rounded-lg text-[12px] text-error cursor-pointer hover:bg-error-light"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
