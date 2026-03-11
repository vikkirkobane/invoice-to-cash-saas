import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { db } from '@invoice/db';
import { customers } from '@invoice/db/schema';
import { eq, or, ilike, desc, and } from 'drizzle-orm';
import { customerSchema } from '@invoice/utils/schemas/customer';

export async function GET(req: Request) {
  const session = await getServerSession(auth);
  if (!session) return NextResponse.json({ error: { code: 'UNAUTHORIZED', status: 401 } }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search');
  const includeArchived = searchParams.get('includeArchived') === 'true';

  const where = eq(customers.tenantId, session.user.tenantId);
  // If search provided, filter by name or email
  let query = db.query.customers.findMany({
    where,
    orderBy: [desc(customers.createdAt)],
  });

  if (search) {
    query = db.query.customers.findMany({
      where: and(eq(customers.tenantId, session.user.tenantId), or(ilike(customers.name, `%${search}%`), ilike(customers.email, `%${search}%`))),
      orderBy: [desc(customers.createdAt)],
    });
  }

  const data = await query;
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const session = await getServerSession(auth);
  if (!session) return NextResponse.json({ error: { code: 'UNAUTHORIZED', status: 401 } }, { status: 401 });

  const body = await req.json();
  const parsed = customerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message, status: 400 } }, { status: 400 });
  }

  const [customer] = await db.insert(customers).values({ ...parsed.data, tenantId: session.user.tenantId }).returning();
  return NextResponse.json({ data: customer }, { status: 201 });
}