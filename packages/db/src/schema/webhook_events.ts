import { uuid, pgTable, varchar, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { webhookProvider } from './enums';

export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: webhookProvider('provider').notNull(),
  eventId: varchar('event_id', { length: 255 }).notNull().unique(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  payload: jsonb('payload'),
  processedAt: timestamp('processed_at'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  eventIdIdx: index('webhook_event_id_idx').on(table.eventId),
  providerIdx: index('webhook_provider_idx').on(table.provider),
}));