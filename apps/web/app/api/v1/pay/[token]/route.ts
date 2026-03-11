import { NextResponse } from 'next/server';
import { db } from '@invoice/db';
import { invoices } from '@invoice/db/schema';
import { eq } from 'drizzle-orm';
import { PaymentService } from '@/lib/services/payment.service';

/**
 * GET /api/v1/pay/[token]
 * Public endpoint to resolve a payment token and return minimal invoice data
 * needed for the payment page (id, total, currency).
 */
export async function GET(req: Request, { params }: { params: { token: string } }) {
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.paymentToken, params.token),
  });
  if (!invoice) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', status: 404 } }, { status: 404 });
  }

  return NextResponse.json({
    invoice: { id: invoice.id, total: invoice.total, currency: invoice.currency }
  });
}

/**
 * POST /api/v1/pay/[token]
 * Creates a checkout session for the given provider and returns the redirect URL.
 * Expects JSON: { provider: 'stripe' | 'paypal' }
 */
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const { provider } = await req.json();
  const invoice = await db.query.invoices.findFirst({ where: eq(invoices.paymentToken, params.token) });
  if (!invoice) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', status: 404 } }, { status: 404 });
  }

  const result = await PaymentService.createCheckoutSession(invoice, provider, process.env.NEXT_PUBLIC_APP_URL!);
  return NextResponse.json({ url: result.url });
}