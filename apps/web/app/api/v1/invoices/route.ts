import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { InvoiceService } from '@/lib/services/invoice.service';
import { invoiceCreateSchema, invoiceUpdateSchema } from '@invoice/utils/schemas/invoice';

export async function GET(req: Request) {
  const session = await getServerSession(auth);
  if (!session) return NextResponse.json({ error: { code: 'UNAUTHORIZED', status: 401 } }, { status: 401 });

  // TODO: pagination, filters
  // For now placeholder
  return NextResponse.json({ data: [] });
}

export async function POST(req: Request) {
  const session = await getServerSession(auth);
  if (!session) return NextResponse.json({ error: { code: 'UNAUTHORIZED', status: 401 } }, { status: 401 });

  const body = await req.json();
  const parsed = invoiceCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message, status: 400 } }, { status: 400 });
  }

  try {
    const invoice = await InvoiceService.create(session.user.tenantId, parsed.data);
    return NextResponse.json({ data: invoice }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: { code: 'CREATE_FAILED', message: error.message, status: 500 } }, { status: 500 });
  }
}