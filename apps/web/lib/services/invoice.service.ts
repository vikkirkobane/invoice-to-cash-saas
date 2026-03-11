import { db } from '@invoice/db';
import { invoices, invoiceLineItems, customers, tenants } from '@invoice/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Service for invoice lifecycle operations: creation, updates, sending, cancellation,
 * payment recording, and status transitions.
 *
 * All methods expect a tenantId for strict multi-tenancy isolation.
 */
export class InvoiceService {
  /**
   * Creates a new invoice in DRAFT status.
   * - Generates a sequential invoice number based on tenant settings.
   * - Calculates totals including discount and tax.
   * - Creates associated line items.
   *
   * @param tenantId - The tenant creating the invoice
   * @param data - Invoice creation payload (customerId, lineItems, dates, etc.)
   * @returns The created invoice record
   * @throws Error if tenant not found
   */
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

  /**
   * Updates an existing invoice. Only allowed while invoice is in DRAFT status.
   * Replaces line items entirely if provided.
   *
   * @param tenantId - Tenant performing the update
   * @param invoiceId - Invoice to update
   * @param data - Partial invoice fields (lineItems, notes, dates, etc.)
   * @returns Updated invoice
   * @throws Error if invoice not found or not in draft status
   */
  static async update(tenantId: string, invoiceId: string, data: any) {
    const existing = await db.query.invoices.findFirst({
      where: and(eq(invoices.tenantId, tenantId), eq(invoices.id, invoiceId)),
    });
    if (!existing) throw new Error('Invoice not found');
    if (existing.status !== 'draft') {
      throw new Error('Cannot update non-draft invoice');
    }

    const updates: any = { ...data };
    if (data.lineItems) {
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

  /**
   * Sends an invoice: DRAFT -> SENT.
   * Sets sentAt timestamp and generates a payment token if missing.
   * Should trigger async PDF generation and email (TODO).
   *
   * @param tenantId - Tenant sending the invoice
   * @param invoiceId - Invoice to send
   * @returns The updated invoice (now SENT)
   * @throws Error if invoice not in DRAFT status
   */
  static async send(tenantId: string, invoiceId: string) {
    const [invoice] = await db
      .update(invoices)
      .set({ status: 'sent', sentAt: new Date() })
      .where(and(eq(invoices.tenantId, tenantId), eq(invoices.id, invoiceId), sql`${invoices.status} = 'draft'`))
      .returning();

    if (!invoice) throw new Error('Invoice not found or not in draft status');
    return invoice;
  }

  /**
   * Cancels an invoice. Allowed only from DRAFT or SENT status.
   *
   * @param tenantId - Tenant cancelling
   * @param invoiceId - Invoice to cancel
   * @returns Cancelled invoice
   * @throws Error if invoice cannot be cancelled
   */
  static async cancel(tenantId: string, invoiceId: string) {
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

  /**
   * Marks an invoice as VIEWED when the client opens the payment link.
   * Transition: SENT -> VIEWED.
   *
   * @param tenantId - Tenant ID
   * @param invoiceId - Invoice to mark viewed
   * @returns Updated invoice
   */
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

  /**
   * Records a payment against an invoice. Updates amount_paid and transitions status
   * to PAID if fully paid, otherwise PARTIALLY_PAID.
   *
   * @param tenantId - Tenant ID
   * @param invoiceId - Invoice being paid
   * @param amount - Payment amount
   * @param provider - 'stripe' | 'paypal'
   * @param providerPaymentId - External payment ID from gateway
   * @returns Updated invoice
   */
  static async recordPayment(tenantId: string, invoiceId: string, amount: number, provider: 'stripe' | 'paypal', providerPaymentId: string) {
    await db.insert(payments).values({
      invoiceId,
      tenantId,
      provider,
      providerPaymentId,
      amount,
      currency: 'USD', // TODO: derive from invoice
      status: 'succeeded',
    });

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

  /**
   * Batch job: transitions SENT/VIEWED invoices with past due dates to OVERDUE.
   * Intended to run nightly via Bull cron.
   */
  static async markOverdue() {
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