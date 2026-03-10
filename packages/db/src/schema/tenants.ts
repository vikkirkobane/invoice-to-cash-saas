import { uuid, pgTable, text, varchar, integer, timestamptz } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  logoUrl: text('logo_url'),
  defaultCurrency: varchar('default_currency', { length: 3 }).default('USD'),
  defaultPaymentTerms: integer('default_payment_terms').default(30),
  invoiceNumberFormat: varchar('invoice_number_format', { length: 50 }).default('INV-{YYYY}-{SEQ}'),
  invoiceSequence: integer('invoice_sequence').default(1),
  stripeAccountId: text('stripe_account_id'),
  paypalMerchantId: text('paypal_merchant_id'),
  createdAt: timestamptz('created_at').defaultNow(),
  updatedAt: timestamptz('updated_at').defaultNow(),
});