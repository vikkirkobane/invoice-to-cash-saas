import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { db } from '@invoice/db';
import { users, tenants } from '@invoice/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const session = await getServerSession(auth);
  if (!session) return NextResponse.json({ error: { code: 'UNAUTHORIZED', status: 401 } }, { status: 401 });

  const team = await db.query.users.findMany({
    where: eq(users.tenantId, session.user.tenantId),
    columns: { id: true, email: true, role: true, emailVerified: true, createdAt: true },
  });

  return NextResponse.json({ data: team });
}

export async function POST(req: Request) {
  const session = await getServerSession(auth);
  if (!session || !['owner', 'admin'].includes(session.user.role)) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', status: 403 } }, { status: 403 });
  }

  const { email, role } = await req.json();
  if (!email || !role) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Email and role required', status: 400 } }, { status: 400 });
  }

  // TODO: Generate invite token, send email
  // For now, just create user with random password? Actually invite should create a pending record.
  // Placeholder: return success
  return NextResponse.json({ success: true });
}