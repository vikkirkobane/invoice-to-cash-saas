import { NextResponse } from 'next/server';
import { db } from '@invoice/db';
import { users, tenants } from '@invoice/db/schema';
import { eq } from 'drizzle-orm';
import { registerSchema } from '@invoice/utils/schemas/auth';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message, status: 400 } }, { status: 400 });
    }

    const { email, password, companyName } = parsed.data;

    // Check if tenant slug exists
    const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existingTenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, slug) });
    if (existingTenant) {
      return NextResponse.json({ error: { code: 'TENANT_EXISTS', message: 'Company already registered.', status: 409 } }, { status: 409 });
    }

    // Check if user exists
    const existingUser = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (existingUser) {
      return NextResponse.json({ error: { code: 'USER_EXISTS', message: 'Email already registered.', status: 409 } }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create tenant + owner atomically (transaction would be better but simple for now)
    const [tenant] = await db.insert(tenants).values({ name: companyName, slug }).returning();
    if (!tenant) throw new Error('Failed to create tenant');

    const verificationToken = crypto.randomBytes(32).toString('hex');

    await db.insert(users).values({
      tenantId: tenant.id,
      email,
      hashedPassword,
      role: 'owner',
      emailVerified: false,
    });

    // TODO: Send verification email via SES (placeholder)

    return NextResponse.json({ success: true, tenantId: tenant.id }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.', status: 500 } }, { status: 500 });
  }
}