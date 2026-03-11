import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { db } from '@invoice/db';
import { tenants, users } from '@invoice/db/schema';
import { eq, and } from 'drizzle-orm';
import { tenantOnboardingSchema } from '@invoice/utils/schemas/tenant';

export async function POST(req: Request) {
  const session = await getServerSession(auth);
  if (!session) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', status: 401 } }, { status: 401 });
  }

  const formData = await req.formData();
  const logoFile = formData.get('logoFile') as File | null;

  const body = {
    companyName: formData.get('companyName') as string,
    currency: formData.get('currency') as string,
    paymentTerms: Number(formData.get('paymentTerms')),
    logoFile,
  };

  const parsed = tenantOnboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message, status: 400 } }, { status: 400 });
  }

  const { companyName, currency, paymentTerms, logoFile } = parsed.data;

  // Ensure user's tenant matches
  const user = await db.query.users.findFirst({
    where: and(eq(users.id, session.user.id), eq(users.tenantId, session.user.tenantId)),
  });
  if (!user) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', status: 403 } }, { status: 403 });
  }

  // Update tenant
  await db.update(tenants).set({
    name: companyName,
    slug: companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    defaultCurrency: currency,
    defaultPaymentTerms: paymentTerms,
    updatedAt: new Date(),
  }).where(eq(tenants.id, session.user.tenantId));

  // TODO: Handle logo upload to S3 if present, then store logoUrl

  return NextResponse.json({ success: true }, { status: 200 });
}