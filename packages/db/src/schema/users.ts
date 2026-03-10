import { uuid, pgTable, varchar, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { userRole } from './enums';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  hashedPassword: text('hashed_password').notNull(),
  role: userRole('role').notNull(),
  emailVerified: boolean('email_verified').default(false),
  invitedBy: uuid('invited_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
  tenantIdx: index('tenant_idx').on(table.tenantId),
}));