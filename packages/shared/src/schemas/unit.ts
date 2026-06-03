import { z } from 'zod';

export const unitSchema = z.object({
  id: z.string().uuid(),
  property_id: z.string().uuid(),
  unit_label: z.string().trim().min(1).max(120),
  created_at: z.string().datetime(),
});
export type Unit = z.infer<typeof unitSchema>;

export const createUnitInputSchema = z.object({
  property_id: z.string().uuid(),
  unit_label: z.string().trim().min(1, 'Bitte Wohnungsbezeichnung angeben').max(120),
});
export type CreateUnitInput = z.infer<typeof createUnitInputSchema>;

export const tenancySchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  unit_id: z.string().uuid(),
  started_at: z.string().datetime(),
  ended_at: z.string().datetime().nullable(),
});
export type Tenancy = z.infer<typeof tenancySchema>;
