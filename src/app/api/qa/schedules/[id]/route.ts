import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Schedule } from '@/lib/models';
import { registerSchedule, stopSchedule } from '@/lib/scheduler';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;
  const data = await request.json();

  const schedule = await Schedule.findById(id);
  if (!schedule) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });

  if (data.enabled !== undefined) schedule.enabled = data.enabled;
  if (data.cron) schedule.cron = data.cron;
  if (data.name) schedule.name = data.name;
  await schedule.save();

  if (schedule.enabled) {
    registerSchedule(schedule);
  } else {
    stopSchedule(id);
  }

  return NextResponse.json(schedule);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;

  stopSchedule(id);
  await Schedule.findByIdAndDelete(id);

  return NextResponse.json({ status: 'deleted' });
}
