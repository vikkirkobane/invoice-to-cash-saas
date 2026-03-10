import { uuid, pgTable, varchar, text, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import { paymentProvider, paymentStatus } from './enums';

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').references(() => invoices.id).notNull(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  provider: paymentProvider('provider').notNull(),
  providerPaymentId: varchar('provider_payment_id', { length: 255 }).notNull().unique(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  status: paymentStatus('status').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  invoiceIdx: index('payment_invoice_idx').on(table.invoiceId),
  providerIdx: index('payment_provider_idx').on(table.provider),
}));