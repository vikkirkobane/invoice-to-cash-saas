import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { db } from '@invoice/db';
import { users } from '@invoice/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// GET /api/v1/team/invite/accept?token=
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  if (!token) return NextResponse.json({ error: { code: 'MISSING_TOKEN', status: 400 } }, { status: 400 });

  // In production: find pending invite by token, verify expiry, create/link user
  // For now, placeholder success
  return NextResponse.json({ success: true });
}

// PATCH /api/v1/team/:userId/role
export async function PATCH(req: Request, { params }: { params: { userId: string } }) {
  const session = await getServerSession(auth);
  if (!session || session.user.role !== 'owner') {
    return NextResponse.json({ error: { code: 'FORBIDDEN', status: 403 } }, { status: 403 });
  }

  const { role } = await req.json();
  if (!['admin', 'member'].includes(role)) {
    return NextResponse.json({ error: { code: 'INVALID_ROLE', status: 400 } }, { status: 400 });
  }

  await db.update(users).set({ role }).where(eq(users.id, params.userId));
  return NextResponse.json({ success: true });
}

// DELETE /api/v1/team/:userId
export async function DELETE(req: Request, { params }: { params: { userId: string } }) {
  const session = await getServerSession(auth);
  if (!session || !['owner', 'admin'].includes(session.user.role)) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', status: 403 } }, { status: 403 });
  }

  await db.delete(users).where(eq(users.id, params.userId));
  return NextResponse.json({ success: true });
}