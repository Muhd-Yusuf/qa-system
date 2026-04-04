import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Run } from '@/lib/models';

export async function GET(request: NextRequest) {
  await connectDB();

  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));
  const skip = (page - 1) * limit;
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const project = searchParams.get('project');

  const filter: any = {};

  if (status) {
    if (status === 'pass') {
      filter.status = 'completed';
      filter['summary.failed'] = 0;
      filter['summary.warnings'] = 0;
    } else if (status === 'fail') {
      filter.status = 'completed';
      filter['summary.failed'] = { $gt: 0 };
    } else if (status === 'warn') {
      filter.status = 'completed';
      filter['summary.failed'] = 0;
      filter['summary.warnings'] = { $gt: 0 };
    } else {
      filter.status = status;
    }
  }

  if (search) {
    filter.$or = [
      { label: { $regex: search, $options: 'i' } },
      { url: { $regex: search, $options: 'i' } },
    ];
  }

  if (project) {
    filter.project = project;
  }

  const [runs, total] = await Promise.all([
    Run.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-log'),
    Run.countDocuments(filter),
  ]);

  return NextResponse.json({ runs, total, page, pages: Math.ceil(total / limit) });
}
