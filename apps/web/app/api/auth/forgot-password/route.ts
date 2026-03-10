import { NextResponse } from 'next/server';
import { forgotPasswordSchema } from '@invoice/utils/schemas/auth';
import { db } from '@invoice/db';
import { users } from '@invoice/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message, status: 400 } }, { status: 400 });
    }

    const { email } = parsed.data;
    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (!user) {
      // Don't reveal that user doesn't exist
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    // In production, store hashed token with expiry, then send email
    // await db.update(users).set({ resetToken, resetTokenExpires: new Date(Date.now() + 15*60*1000) }).where(eq(users.id, user.id));

    // TODO: Send email with reset link using SES
    // await EmailService.sendPasswordReset(user.email, resetToken);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.', status: 500 } }, { status: 500 });
  }
}