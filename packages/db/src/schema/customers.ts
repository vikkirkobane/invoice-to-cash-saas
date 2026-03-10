import { uuid, pgTable, varchar, text, numeric, jsonb, timestamp, index } from 'drizzle-orm/pg-core';

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  billingAddress: jsonb('billing_address'),
  currency: varchar('currency', { length: 3 }).default('USD'),
  paymentTerms: integer('payment_terms').default(30),
  notes: text('notes'),
  archivedAt: timestamp('archived_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('customer_tenant_idx').on(table.tenantId),
  emailIdx: index('customer_email_idx').on(table.email),
}));