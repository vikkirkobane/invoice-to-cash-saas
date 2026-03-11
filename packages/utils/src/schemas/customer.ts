import { z } from 'zod';

export const customerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  billingAddress: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  currency: z.string().length(3).default('USD'),
  paymentTerms: z.number().int().positive().default(30),
  notes: z.string().optional(),
});