import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PaymentService } from '@/lib/services/payment.service';
import { db } from '@invoice/db';
import { webhookEvents } from '@invoice/db/schema';
import { eq } from 'drizzle-orm';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events.
 * - Verifies signature using STRIPE_WEBHOOK_SECRET
 * - Idempotent processing via webhook_events table
 * - On checkout.session.completed: records payment and updates invoice status
 */
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  try {
    // Verify signature immediately to reject tampered payloads
    const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);

    // Idempotency: if we already processed this event, return success
    const existing = await db.query.webhookEvents.findFirst({ where: eq(webhookEvents.eventId, event.id) });
    if (existing) return NextResponse.json({ received: true });

    // Log raw event for audit/debugging
    await db.insert(webhookEvents).values({
      provider: 'stripe',
      eventId: event.id,
      eventType: event.type,
      payload: event.data.object,
    });

    // Handle specific event types
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const invoiceId = session.metadata?.invoiceId;
      if (invoiceId) {
        // Record payment; amount_total is in cents, convert to major units
        await PaymentService.recordPayment(
          invoiceId,
          session.customer_details?.email || '',
          'stripe',
          session.payment_intent!,
          session.amount_total ? session.amount_total / 100 : 0
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    // Return 400 on any error (signature mismatch, parsing, etc.)
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}