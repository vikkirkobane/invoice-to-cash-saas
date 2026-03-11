import paypal from '@paypal/checkout-server-sdk';
import { PaymentProvider } from '@invoice/utils/types';

let environment: paypal.core.SandboxEnvironment | paypal.core.LiveEnvironment;

if (process.env.NEXT_PUBLIC_PAYPAL_ENV === 'production') {
  environment = new paypal.core.LiveEnvironment(
    process.env.PAYPAL_CLIENT_ID!,
    process.env.PAYPAL_CLIENT_SECRET!
  );
} else {
  environment = new paypal.core.SandboxEnvironment(
    process.env.PAYPAL_CLIENT_ID!,
    process.env.PAYPAL_CLIENT_SECRET!
  );
}
const client = new paypal.core.PayPalHttpClient(environment);

/**
 * PayPal implementation of PaymentProvider interface.
 * Uses PayPal Orders API v2.
 */
export class PayPalProvider implements PaymentProvider {
  /**
   * Create a PayPal order and return approval URL.
   *
   * @param invoice - Invoice with total and currency
   * @param returnUrl - Base URL for success/cancel redirects
   * @returns Object with approval URL and order ID
   */
  async createCheckoutSession(invoice: any, returnUrl: string) {
    const request = new paypal.orders.OrdersCreateRequest();
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: invoice.currency,
            value: invoice.total.toFixed(2),
          },
        },
      ],
      application_context: {
        return_url: returnUrl,
        cancel_url: `${returnUrl}/cancel`,
      },
    });
    const order = await client.execute(request);
    const approvalLink = order.result.links?.find(l => l.rel === 'approve')?.href;
    return { url: approvalLink!, sessionId: order.result.id, provider: 'paypal' as const };
  }

  /**
   * Verify PayPal webhook signature and return parsed event.
   * (Signature verification to be implemented with PayPal SDK)
   */
  async constructWebhookEvent(rawBody: Buffer, signature: string) {
    // TODO: Verify webhook signature using PayPal SDK in production
    return JSON.parse(rawBody.toString());
  }

  /**
   * Issue a refund for a captured payment.
   *
   * @param providerPaymentId - PayPal capture ID
   * @param amount - Refund amount
   */
  async refund(providerPaymentId: string, amount: number) {
    const request = new paypal.payments.CapturesRefundRequest(providerPaymentId);
    request.requestBody({ amount: { value: amount.toFixed(2), currency_code: 'USD' } });
    await client.execute(request);
  }
}