import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Run } from '@/lib/models';
import { broadcast, closeAll } from '@/lib/run-manager';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;
  const run = await Run.findById(id);
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  return NextResponse.json(run);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;
  const run = await Run.findById(id);
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 });

  if (run.status === 'running' && run.pid) {
    try {
      process.kill(run.pid, 'SIGTERM');
    } catch {}
    run.status = 'cancelled';
    run.completedAt = new Date();
    await run.save();
    broadcast(id, { type: 'done', status: 'cancelled' });
    closeAll(id);
    return NextResponse.json({ status: 'cancelled' });
  }

  // For non-running runs, delete entirely
  await Run.findByIdAndDelete(id);
  return NextResponse.json({ status: 'deleted' });
}
