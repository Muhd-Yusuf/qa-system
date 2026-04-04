import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Template } from '@/lib/models';

export async function GET() {
  await connectDB();
  const templates = await Template.find().sort({ createdAt: -1 });
  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  await connectDB();
  const data = await request.json();
  const template = await Template.create(data);
  return NextResponse.json(template, { status: 201 });
}
