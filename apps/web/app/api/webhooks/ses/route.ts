import { NextRequest, NextResponse } from 'next/server';
import { db } from '@invoice/db';
import { suppressionList } from '@invoice/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  const body = await req.json();

  // Verify SNS signature in production
  const message = body.Message;
  const notificationType = message.notificationType;

  let email = '';
  if (notificationType === 'Bounce' || notificationType === 'Complaint') {
    email = message.bounce?.bouncedRecipients?.[0]?.emailAddress || message.complaint?.complainedRecipients?.[0]?.emailAddress || '';
  }

  if (email) {
    // Check if already suppressed
    const existing = await db.query.suppressionList.findFirst({ where: eq(suppressionList.email, email) });
    if (!existing) {
      await db.insert(suppressionList).values({ tenantId: '', email, reason: notificationType.toLowerCase() });
    }
  }

  return NextResponse.json({ received: true });
}