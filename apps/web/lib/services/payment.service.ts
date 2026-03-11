import { db } from '@invoice/db';
import { payments, invoices } from '@invoice/db/schema';
import { eq, and } from 'drizzle-orm';
import { StripeProvider } from '@/lib/services/payment-providers/stripe.provider';
import { PayPalProvider } from '@/lib/services/payment-providers/paypal.provider';

/**
 * Payment processing service — records payments and creates checkout sessions.
 */
export class PaymentService {
  /**
   * Records a successful payment from a provider.
   * Creates a payment record and updates the invoice's amount_paid and status.
   * If amount paid reaches total, invoice status becomes PAID; else PARTIALLY_PAID.
   *
   * @param invoiceId - Invoice being paid
   * @param tenantId - Tenant owning the invoice
   * @param provider - 'stripe' | 'paypal'
   * @param providerPaymentId - Gateway-specific payment identifier
   * @param amount - Payment amount
   * @returns { success: true }
   */
  static async recordPayment(invoiceId: string, tenantId: string, provider: 'stripe' | 'paypal', providerPaymentId: string, amount: number) {
    await db.insert(payments).values({
      invoiceId,
      tenantId,
      provider,
      providerPaymentId,
      amount,
      currency: 'USD',
      status: 'succeeded',
    });

    const invoice = await db.query.invoices.findFirst({ where: and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)) });
    if (!invoice) throw new Error('Invoice not found');

    const newAmountPaid = Number(invoice.amountPaid) + amount;
    const newStatus = newAmountPaid >= Number(invoice.total) ? 'paid' : 'partially_paid';

    await db
      .update(invoices)
      .set({ amountPaid: newAmountPaid, status: newStatus, paidAt: newStatus === 'paid' ? new Date() : null })
      .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)));

    return { success: true };
  }

  /**
   * Creates a checkout session for the given invoice using the selected provider.
   *
   * @param invoice - Invoice object with totals and line items
   * @param provider - 'stripe' | 'paypal'
   * @param returnUrl - Base URL to return to after payment
   * @returns Object containing redirect URL and session ID
   */
  static async createCheckoutSession(invoice: any, provider: 'stripe' | 'paypal', returnUrl: string) {
    const providerImpl = provider === 'stripe' ? new StripeProvider() : new PayPalProvider();
    return providerImpl.createCheckoutSession(invoice, returnUrl);
  }
}