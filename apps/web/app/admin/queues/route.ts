import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const session = await getServerSession(auth);
  if (!session || session.user.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // In production, serve Bull Board UI
  return NextResponse.json({ message: 'Bull Board (Owner only)' });
}