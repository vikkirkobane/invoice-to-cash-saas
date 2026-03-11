import { NextResponse } from 'next/server';
import { db } from '@invoice/db';
import { invoices } from '@invoice/db/schema';
import { eq } from 'drizzle-orm';
import { PaymentService } from '@/lib/services/payment.service';

export async function GET(req: Request, { params }: { params: { token: string } }) {
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.paymentToken, params.token),
  });
  if (!invoice) return NextResponse.json({ error: { code: 'NOT_FOUND', status: 404 } }, { status: 404 });

  return NextResponse.json({ invoice: { id: invoice.id, total: invoice.total, currency: invoice.currency } });
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const { provider } = await req.json();
  const invoice = await db.query.invoices.findFirst({ where: eq(invoices.paymentToken, params.token) });
  if (!invoice) return NextResponse.json({ error: { code: 'NOT_FOUND', status: 404 } }, { status: 404 });

  // Return checkout URL (server-side redirect)
  const result = await PaymentService.createCheckoutSession(invoice, provider, process.env.NEXT_PUBLIC_APP_URL!);
  return NextResponse.json({ url: result.url });
}