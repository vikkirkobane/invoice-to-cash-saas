import { z } from 'zod';

export const tenantOnboardingSchema = z.object({
  companyName: z.string().min(1),
  currency: z.string().length(3),
  paymentTerms: z.number().int().positive(),
  logoFile: z.instanceof(File).optional(),
});

export const tenantSettingsSchema = z.object({
  companyName: z.string().min(1).optional(),
  currency: z.string().length(3).optional(),
  paymentTerms: z.number().int().positive().optional(),
  invoiceNumberFormat: z.string().optional(),
  logoUrl: z.string().url().optional(),
});