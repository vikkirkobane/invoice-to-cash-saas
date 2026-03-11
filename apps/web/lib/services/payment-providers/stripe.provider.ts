import Stripe from 'stripe';
import { PaymentProvider } from '@invoice/utils/types';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

/**
 * Stripe implementation of PaymentProvider interface.
 * Uses Stripe Checkout for a hosted payment page.
 */
export class StripeProvider implements PaymentProvider {
  /**
   * Create a Stripe Checkout session for the invoice.
   *
   * @param invoice - Invoice with id, currency, lineItems, total
   * @param returnUrl - Base URL for success/cancel redirects
   * @returns Object with redirect URL and session ID
   */
  async createCheckoutSession(invoice: any, returnUrl: string) {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_intent_data: {
        metadata: { invoiceId: invoice.id },
      },
      success_url: `${returnUrl}/success`,
      cancel_url: `${returnUrl}/cancel`,
      line_items: invoice.lineItems.map((li: any) => ({
        price_data: {
          currency: invoice.currency,
          product_data: { name: li.description },
          unit_amount: Math.round(li.unitPrice * 100),
        },
        quantity: li.quantity,
      })),
    });
    return { url: session.url!, sessionId: session.id, provider: 'stripe' as const };
  }

  /**
   * Construct and verify a Stripe webhook event from raw body and signature header.
   *
   * @throws Error if signature verification fails
   */
  async constructWebhookEvent(rawBody: Buffer, signature: string) {
    const event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
    return event;
  }

  /**
   * Issue a refund for a payment intent.
   *
   * @param providerPaymentId - Stripe PaymentIntent ID
   * @param amount - Amount to refund (in major units)
   */
  async refund(providerPaymentId: string, amount: number) {
    await stripe.refunds.create({
      payment_intent: providerPaymentId,
      amount: Math.round(amount * 100),
    });
  }
}