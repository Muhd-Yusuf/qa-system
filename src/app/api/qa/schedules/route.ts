import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Schedule, Template } from '@/lib/models';
import { initScheduler, registerSchedule, validateCron } from '@/lib/scheduler';

export async function GET() {
  await connectDB();
  await initScheduler();
  const schedules = await Schedule.find().sort({ createdAt: -1 }).populate('templateId', 'name url');
  return NextResponse.json(schedules);
}

export async function POST(request: NextRequest) {
  await connectDB();
  await initScheduler();

  const { name, templateId, cron } = await request.json();

  if (!name || !templateId || !cron) {
    return NextResponse.json({ error: 'name, templateId, and cron are required' }, { status: 400 });
  }

  if (!validateCron(cron)) {
    return NextResponse.json({ error: 'Invalid cron expression' }, { status: 400 });
  }

  const template = await Template.findById(templateId);
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  const schedule = await Schedule.create({ name, templateId, cron, enabled: true });
  registerSchedule(schedule);

  return NextResponse.json(schedule, { status: 201 });
}
