import { uuid, pgTable, integer, boolean, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { reminderSlot } from './enums';

export const reminderTemplates = pgTable('reminder_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  slot: reminderSlot('slot').notNull(),
  offsetDays: integer('offset_days').notNull(),
  enabled: boolean('enabled').default(true),
  subject: varchar('subject', { length: 255 }).notNull(),
  body: text('body').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  tenantSlotIdx: index('reminder_tenant_slot_idx').on(table.tenantId, table.slot, { unique: true }),
}));