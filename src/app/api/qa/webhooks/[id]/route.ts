import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Webhook } from '@/lib/models';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;
  await Webhook.findByIdAndDelete(id);
  return NextResponse.json({ status: 'deleted' });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;
  const data = await request.json();
  await Webhook.findByIdAndUpdate(id, data);
  return NextResponse.json({ status: 'updated' });
}
