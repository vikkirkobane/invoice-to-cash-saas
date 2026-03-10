import { uuid, pgTable, varchar, text, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import { invoiceStatus, discountType } from './enums';

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  customerId: uuid('customer_id').references(() => customers.id).notNull(),
  invoiceNumber: varchar('invoice_number', { length: 100 }).notNull(),
  status: invoiceStatus('status').notNull(),
  issueDate: timestamp('issue_date').notNull(),
  dueDate: timestamp('due_date').notNull(),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
  discountType: discountType('discount_type'),
  discountValue: numeric('discount_value', { precision: 12, scale: 2 }).default(0),
  taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).default(0),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  amountPaid: numeric('amount_paid', { precision: 12, scale: 2 }).default(0),
  currency: varchar('currency', { length: 3 }).notNull(),
  notes: text('notes'),
  paymentToken: varchar('payment_token', { length: 64 }).unique(),
  pdfUrl: text('pdf_url'),
  sentAt: timestamp('sent_at'),
  viewedAt: timestamp('viewed_at'),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('invoice_tenant_idx').on(table.tenantId),
  customerIdx: index('invoice_customer_idx').on(table.customerId),
  statusIdx: index('invoice_status_idx').on(table.status),
  tokenIdx: index('invoice_token_idx').on(table.paymentToken),
}));