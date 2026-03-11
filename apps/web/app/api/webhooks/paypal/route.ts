import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/lib/services/payment.service';
import { db } from '@invoice/db';
import { webhookEvents } from '@invoice/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/webhooks/paypal
 * Handles PayPal webhook events.
 * - Verifies signature (TODO in production)
 * - Idempotent processing via webhook_events table
 * - On PAYMENT.CAPTURE.COMPLETED: records payment and updates invoice status
 */
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('paypal-auth-algo')!; // simplified

  try {
    // TODO: In production, verify signature using PayPal SDK before parsing
    const event = JSON.parse(body);

    // Idempotency check
    const existing = await db.query.webhookEvents.findFirst({ where: eq(webhookEvents.eventId, event.id) });
    if (existing) return NextResponse.json({ received: true });

    // Audit log
    await db.insert(webhookEvents).values({
      provider: 'paypal',
      eventId: event.id,
      eventType: event.event_type,
      payload: event,
    });

    // Handle payment capture completion
    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const capture = event.resource;
      // TODO: invoiceId should be passed via custom_id or invoice_id in order creation
      const invoiceId = capture.invoice_id;
      if (invoiceId) {
        await PaymentService.recordPayment(
          invoiceId,
          capture.sender?.payer_id || '',
          'paypal',
          capture.id,
          Number(capture.amount.value)
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}