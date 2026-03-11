import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { db } from '@invoice/db';
import { customers } from '@invoice/db/schema';
import { eq, and } from 'drizzle-orm';
import { customerSchema } from '@invoice/utils/schemas/customer';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(auth);
  if (!session) return NextResponse.json({ error: { code: 'UNAUTHORIZED', status: 401 } }, { status: 401 });

  const customer = await db.query.customers.findFirst({
    where: and(eq(customers.tenantId, session.user.tenantId), eq(customers.id, params.id)),
  });

  if (!customer) return NextResponse.json({ error: { code: 'NOT_FOUND', status: 404 } }, { status: 404 });
  return NextResponse.json({ data: customer });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(auth);
  if (!session) return NextResponse.json({ error: { code: 'UNAUTHORIZED', status: 401 } }, { status: 401 });

  const body = await req.json();
  const parsed = customerSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message, status: 400 } }, { status: 400 });
  }

  const [customer] = await db
    .update(customers)
    .set(parsed.data)
    .where(and(eq(customers.tenantId, session.user.tenantId), eq(customers.id, params.id)))
    .returning();

  if (!customer) return NextResponse.json({ error: { code: 'NOT_FOUND', status: 404 } }, { status: 404 });
  return NextResponse.json({ data: customer });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(auth);
  if (!session) return NextResponse.json({ error: { code: 'UNAUTHORIZED', status: 401 } }, { status: 401 });

  // Soft archive
  const [customer] = await db
    .update(customers)
    .set({ archivedAt: new Date() })
    .where(and(eq(customers.tenantId, session.user.tenantId), eq(customers.id, params.id)))
    .returning();

  if (!customer) return NextResponse.json({ error: { code: 'NOT_FOUND', status: 404 } }, { status: 404 });
  return NextResponse.json({ success: true });
}