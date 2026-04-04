import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema({
  requirement: String,
  status: { type: String, enum: ['PASS', 'FAIL', 'WARN'] },
  detail: String,
  screenshot: String,
});

const runSchema = new mongoose.Schema({
  url: { type: String, required: true },
  label: { type: String, default: '' },
  requirements: { type: String, required: true },
  auth: {
    username: String,
    password: String,
  },
  depth: { type: String, enum: ['quick', 'standard', 'thorough'], default: 'standard' },
  status: { type: String, enum: ['pending', 'running', 'completed', 'failed', 'cancelled'], default: 'pending' },
  log: [{ type: String }],
  results: [resultSchema],
  extraFindings: [String],
  screenshots: [{ label: String, data: String, timestamp: Date }],
  summary: {
    total: Number,
    passed: Number,
    failed: Number,
    warnings: Number,
    durationSeconds: Number,
  },
  pid: Number,
  project: { type: String, default: '' },
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Template' },
  startedAt: Date,
  completedAt: Date,
}, { timestamps: true });

runSchema.index({ project: 1, createdAt: -1 });
runSchema.index({ status: 1 });

const templateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  requirements: { type: String, required: true },
  auth: { username: String, password: String },
  depth: { type: String, default: 'standard' },
  project: { type: String, default: '' },
}, { timestamps: true });

const scheduleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Template', required: true },
  cron: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  lastRunAt: Date,
  nextRunAt: Date,
}, { timestamps: true });

const webhookSchema = new mongoose.Schema({
  url: { type: String, required: true },
  events: [{ type: String, enum: ['run.completed', 'run.failed', 'run.cancelled'] }],
  enabled: { type: Boolean, default: true },
  secret: String,
}, { timestamps: true });

export const Run = mongoose.models.Run || mongoose.model('Run', runSchema);
export const Template = mongoose.models.Template || mongoose.model('Template', templateSchema);
export const Schedule = mongoose.models.Schedule || mongoose.model('Schedule', scheduleSchema);
export const Webhook = mongoose.models.Webhook || mongoose.model('Webhook', webhookSchema);
