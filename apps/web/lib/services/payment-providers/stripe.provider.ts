import Stripe from 'stripe';
import { PaymentProvider } from '@invoice/utils/types';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

export class StripeProvider implements PaymentProvider {
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

  async constructWebhookEvent(rawBody: Buffer, signature: string) {
    const event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
    return event;
  }

  async refund(providerPaymentId: string, amount: number) {
    await stripe.refunds.create({
      payment_intent: providerPaymentId,
      amount: Math.round(amount * 100),
    });
  }
}