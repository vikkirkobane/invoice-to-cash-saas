import { uuid, pgTable, text, numeric, integer, index } from 'drizzle-orm/pg-core';

export const invoiceLineItems = pgTable('invoice_line_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }).notNull(),
  description: text('description').notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 4 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  sortOrder: integer('sort_order').default(0),
}, (table) => ({
  invoiceIdx: index('line_item_invoice_idx').on(table.invoiceId),
}));