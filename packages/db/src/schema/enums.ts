import { pgEnum } from 'drizzle-orm/pg-core';

export const userRole = pgEnum('user_role', ['owner', 'admin', 'member']);
export const invoiceStatus = pgEnum('invoice_status', ['draft', 'sent', 'viewed', 'paid', 'partially_paid', 'overdue', 'cancelled']);
export const paymentProvider = pgEnum('payment_provider', ['stripe', 'paypal']);
export const paymentStatus = pgEnum('payment_status', ['pending', 'succeeded', 'failed', 'refunded']);
export const discountType = pgEnum('discount_type', ['percentage', 'fixed']);
export const reminderSlot = pgEnum('reminder_slot', ['early', 'due_today', 'late_1', 'late_2', 'final']);
export const webhookProvider = pgEnum('webhook_provider', ['stripe', 'paypal', 'ses']);