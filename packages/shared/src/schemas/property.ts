import { z } from 'zod';
import { OWNERSHIP_DOCUMENT_TYPES, PROPERTY_OWNERSHIP_STATUSES } from '../constants';

const germanPostalCode = z
  .string()
  .trim()
  .regex(/^\d{5}$/, 'Postleitzahl muss 5 Ziffern haben');

export const propertyAddressSchema = z.object({
  street: z.string().trim().min(2).max(120),
  house_number: z.string().trim().min(1).max(20),
  postal_code: germanPostalCode,
  city: z.string().trim().min(2).max(80),
  country: z.string().trim().length(2).default('DE'),
});
export type PropertyAddress = z.infer<typeof propertyAddressSchema>;

export const propertySchema = propertyAddressSchema.extend({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  ownership_status: z.enum(PROPERTY_OWNERSHIP_STATUSES),
  verified_at: z.string().datetime().nullable(),
  verified_by: z.string().uuid().nullable(),
  rejection_reason: z.string().nullable().optional(),
  created_at: z.string().datetime(),
});
export type Property = z.infer<typeof propertySchema>;

export const createPropertyInputSchema = propertyAddressSchema;
export type CreatePropertyInput = z.infer<typeof createPropertyInputSchema>;

export const ownershipDocumentSchema = z.object({
  id: z.string().uuid(),
  property_id: z.string().uuid(),
  file_path: z.string().min(1),
  document_type: z.enum(OWNERSHIP_DOCUMENT_TYPES),
  uploaded_by: z.string().uuid(),
  created_at: z.string().datetime(),
});
export type OwnershipDocument = z.infer<typeof ownershipDocumentSchema>;

export const reviewPropertyInputSchema = z.object({
  property_id: z.string().uuid(),
  decision: z.enum(['verified', 'rejected']),
  reason: z.string().max(2000).optional(),
});
export type ReviewPropertyInput = z.infer<typeof reviewPropertyInputSchema>;
