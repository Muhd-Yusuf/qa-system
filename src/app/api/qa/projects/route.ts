import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Run } from '@/lib/models';

export async function GET() {
  await connectDB();
  const projects = await Run.distinct('project', { project: { $ne: '' } });
  return NextResponse.json(projects);
}
