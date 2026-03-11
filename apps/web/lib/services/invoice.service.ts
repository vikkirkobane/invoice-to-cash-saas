import { db } from '@invoice/db';
import { invoices, invoiceLineItems, customers, tenants } from '@invoice/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import crypto from 'crypto';

export class InvoiceService {
  static async create(tenantId: string, data: any) {
    // Generate invoice number per tenant sequence
    const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
    if (!tenant) throw new Error('Tenant not found');

    const sequence = tenant.invoiceSequence;
    const format = tenant.invoiceNumberFormat.replace('{YYYY}', new Date().getFullYear().toString()).replace('{SEQ}', String(sequence).padStart(5, '0'));

    // Increment sequence
    await db.update(tenants).set({ invoiceSequence: sequence + 1 }).where(eq(tenants.id, tenantId));

    const subtotal = data.lineItems.reduce((sum: number, item: any) => sum + item.quantity * item.unitPrice, 0);
    let total = subtotal;
    if (data.discountType === 'percentage' && data.discountValue) {
      total -= subtotal * (data.discountValue / 100);
    } else if (data.discountType === 'fixed' && data.discountValue) {
      total -= data.discountValue;
    }
    if (data.taxRate) {
      total += total * (data.taxRate / 100);
    }

    const [invoice] = await db.insert(invoices).values({
      tenantId,
      customerId: data.customerId,
      invoiceNumber: format,
      status: 'draft',
      issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
      dueDate: data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subtotal,
      discountType: data.discountType,
      discountValue: data.discountValue || 0,
      taxRate: data.taxRate || 0,
      total,
      currency: data.currency,
      notes: data.notes,
      paymentToken: crypto.randomBytes(32).toString('hex'),
    }).returning();

    // Insert line items
    const lineItems = data.lineItems.map((li: any, idx: number) => ({
      invoiceId: invoice.id,
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      amount: li.quantity * li.unitPrice,
      sortOrder: idx,
    }));
    await db.insert(invoiceLineItems).values(lineItems);

    return invoice;
  }

  static async update(tenantId: string, invoiceId: string, data: any) {
    // Only allow updates on draft invoices
    const existing = await db.query.invoices.findFirst({
      where: and(eq(invoices.tenantId, tenantId), eq(invoices.id, invoiceId)),
    });
    if (!existing) throw new Error('Invoice not found');
    if (existing.status !== 'draft') {
      throw new Error('Cannot update non-draft invoice');
    }

    // Update invoice (no status transition)
    const updates: any = { ...data };
    if (data.lineItems) {
      // Delete existing line items and reinsert (simplified)
      await db.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, invoiceId));
      const lineItems = data.lineItems.map((li: any, idx: number) => ({
        invoiceId,
        description: li.description,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        amount: li.quantity * li.unitPrice,
        sortOrder: idx,
      }));
      await db.insert(invoiceLineItems).values(lineItems);
      delete updates.lineItems;
    }

    const [invoice] = await db
      .update(invoices)
      .set(updates)
      .where(and(eq(invoices.tenantId, tenantId), eq(invoices.id, invoiceId)))
      .returning();

    return invoice;
  }

  static async send(tenantId: string, invoiceId: string) {
    // Transition DRAFT -> SENT atomically
    const [invoice] = await db
      .update(invoices)
      .set({ status: 'sent', sentAt: new Date() })
      .where(and(eq(invoices.tenantId, tenantId), eq(invoices.id, invoiceId), sql`${invoices.status} = 'draft'`))
      .returning();

    if (!invoice) throw new Error('Invoice not found or not in draft status');

    // TODO: Trigger async PDF generation and email via services
    return invoice;
  }

  static async cancel(tenantId: string, invoiceId: string) {
    // Allow cancel only from DRAFT or SENT
    const [invoice] = await db
      .update(invoices)
      .set({ status: 'cancelled' as const })
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          eq(invoices.id, invoiceId),
          sql`${invoices.status} IN ('draft', 'sent')`
        )
      )
      .returning();

    if (!invoice) throw new Error('Invoice cannot be cancelled');
    return invoice;
  }

  static async markViewed(tenantId: string, invoiceId: string) {
    const [invoice] = await db
      .update(invoices)
      .set({ status: 'viewed', viewedAt: new Date() })
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          eq(invoices.id, invoiceId),
          sql`${invoices.status} = 'sent'`
        )
      )
      .returning();

    if (!invoice) throw new Error('Invoice not found or not in sent status');
    return invoice;
  }

  static async recordPayment(tenantId: string, invoiceId: string, amount: number, provider: 'stripe' | 'paypal', providerPaymentId: string) {
    // Create payment record
    await db.insert(payments).values({
      invoiceId,
      tenantId,
      provider,
      providerPaymentId,
      amount,
      currency: 'USD', // TODO: from invoice
      status: 'succeeded',
    });

    // Update invoice amount_paid and status
    const invoice = await db.query.invoices.findFirst({ where: and(eq(invoices.tenantId, tenantId), eq(invoices.id, invoiceId)) });
    if (!invoice) throw new Error('Invoice not found');

    const newAmountPaid = Number(invoice.amountPaid) + amount;
    const newStatus = newAmountPaid >= Number(invoice.total) ? 'paid' : 'partially_paid';

    const [updated] = await db
      .update(invoices)
      .set({ amountPaid: newAmountPaid, status: newStatus, paidAt: newStatus === 'paid' ? new Date() : sql`NULL` })
      .where(and(eq(invoices.tenantId, tenantId), eq(invoices.id, invoiceId)))
      .returning();

    return updated;
  }

  static async markOverdue() {
    // Batch job: set OVERDUE on past-due SENT/VIEWED invoices not paid
    await db
      .update(invoices)
      .set({ status: 'overdue' })
      .where(
        and(
          sql`${invoices.status} IN ('sent', 'viewed')`,
          sql`${invoices.due_date} < NOW()`
        )
      );
  }
}