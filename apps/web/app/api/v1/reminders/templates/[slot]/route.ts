import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { db } from '@invoice/db';
import { reminderTemplates } from '@invoice/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const session = await getServerSession(auth);
  if (!session) return NextResponse.json({ error: { code: 'UNAUTHORIZED', status: 401 } }, { status: 401 });

  const templates = await db.query.reminderTemplates.findMany({ where: eq(reminderTemplates.tenantId, session.user.tenantId) });
  return NextResponse.json({ data: templates });
}

export async function PATCH(req: Request, { params }: { params: { slot: string } }) {
  const session = await getServerSession(auth);
  if (!session || !['owner', 'admin'].includes(session.user.role)) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', status: 403 } }, { status: 403 });
  }

  const body = await req.json();
  await db.update(reminderTemplates).set(body).where(eq(reminderTemplates.tenantId, session.user.tenantId), eq(reminderTemplates.slot, params.slot));
  return NextResponse.json({ success: true });
}