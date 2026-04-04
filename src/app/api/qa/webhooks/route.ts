import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Webhook } from '@/lib/models';

export async function GET() {
  await connectDB();
  const webhooks = await Webhook.find().sort({ createdAt: -1 });
  return NextResponse.json(webhooks);
}

export async function POST(request: NextRequest) {
  await connectDB();
  const data = await request.json();
  const webhook = await Webhook.create({ ...data, enabled: true });
  return NextResponse.json(webhook, { status: 201 });
}
