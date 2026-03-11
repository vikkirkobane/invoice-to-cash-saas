import { z } from 'zod';

export const invoiceLineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
});

export const invoiceCreateSchema = z.object({
  customerId: z.string().uuid(),
  issueDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  lineItems: z.array(invoiceLineItemSchema).min(1),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  discountValue: z.number().nonnegative().optional(),
  taxRate: z.number().nonnegative().optional(),
  currency: z.string().length(3).default('USD'),
  notes: z.string().optional(),
});

export const invoiceUpdateSchema = invoiceCreateSchema.partial().extend({
  status: z.enum(['draft', 'sent', 'viewed', 'paid', 'partially_paid', 'overdue', 'cancelled']).optional(),
});