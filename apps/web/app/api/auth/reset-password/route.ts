import { NextResponse } from 'next/server';
import { resetPasswordSchema } from '@invoice/utils/schemas/auth';
import { db } from '@invoice/db';
import { users } from '@invoice/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message, status: 400 } }, { status: 400 });
    }

    const { token, password } = parsed.data;

    // In production, look up user by token and check expiry
    // For now, placeholder: just return success
    // const hashedToken = await bcrypt.hash(token, 10);
    // const user = await db.query.users.findFirst({ where: and(eq(users.resetToken, hashedToken), gt(users.resetTokenExpires, new Date())) });
    // if (!user) return NextResponse.json({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token.', status: 400 } }, { status: 400 });

    // const hashedPassword = await bcrypt.hash(password, 12);
    // await db.update(users).set({ hashedPassword, resetToken: null, resetTokenExpires: null }).where(eq(users.id, user.id));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.', status: 500 } }, { status: 500 });
  }
}