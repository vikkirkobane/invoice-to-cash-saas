import { uuid, pgTable, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';

export const suppressionList = pgTable('suppression_list', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  reason: varchar('reason', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantEmailIdx: index('suppression_tenant_email_idx').on(table.tenantId, table.email, { unique: true }),
}));