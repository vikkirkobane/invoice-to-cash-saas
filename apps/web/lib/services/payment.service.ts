import { db } from '@invoice/db';
import { payments, invoices } from '@invoice/db/schema';
import { eq, and } from 'drizzle-orm';
import { StripeProvider } from '@/lib/services/payment-providers/stripe.provider';
import { PayPalProvider } from '@/lib/services/payment-providers/paypal.provider';

export class PaymentService {
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

  static async createCheckoutSession(invoice: any, provider: 'stripe' | 'paypal', returnUrl: string) {
    const providerImpl = provider === 'stripe' ? new StripeProvider() : new PayPalProvider();
    return providerImpl.createCheckoutSession(invoice, returnUrl);
  }
}