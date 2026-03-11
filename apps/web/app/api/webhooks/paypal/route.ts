import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/lib/services/payment.service';
import { db } from '@invoice/db';
import { webhookEvents } from '@invoice/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('paypal-auth-algo')!; // simplified

  try {
    // Verify signature with PayPal SDK in production
    const event = JSON.parse(body);

    const existing = await db.query.webhookEvents.findFirst({ where: eq(webhookEvents.eventId, event.id) });
    if (existing) return NextResponse.json({ received: true });

    await db.insert(webhookEvents).values({
      provider: 'paypal',
      eventId: event.id,
      eventType: event.event_type,
      payload: event,
    });

    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const capture = event.resource;
      const invoiceId = capture.invoice_id; // depends on metadata
      if (invoiceId) {
        await PaymentService.recordPayment(invoiceId, capture.sender, 'paypal', capture.id, capture.amount.value);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}