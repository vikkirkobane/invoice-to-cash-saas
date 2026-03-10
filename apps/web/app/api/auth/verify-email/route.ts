import { NextResponse } from 'next/server';
import { db } from '@invoice/db';
import { users } from '@invoice/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: { code: 'MISSING_TOKEN', message: 'Token is required.', status: 400 } }, { status: 400 });
  }

  // In production, verify token and mark email_verified = true
  // For now, placeholder: find user by verification token and update

  return NextResponse.json({ success: true }, { status: 200 });
}