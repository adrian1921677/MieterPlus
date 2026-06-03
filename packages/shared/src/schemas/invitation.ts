import { z } from 'zod';
import { TENANT_INVITATION_CODE_LENGTH } from '../constants';

export const tenantInvitationSchema = z.object({
  id: z.string().uuid(),
  unit_id: z.string().uuid(),
  code: z.string().length(TENANT_INVITATION_CODE_LENGTH),
  created_by: z.string().uuid(),
  expires_at: z.string().datetime(),
  used_at: z.string().datetime().nullable(),
  used_by: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
});
export type TenantInvitation = z.infer<typeof tenantInvitationSchema>;

export const generateInvitationInputSchema = z.object({
  unit_id: z.string().uuid(),
});
export type GenerateInvitationInput = z.infer<typeof generateInvitationInputSchema>;

const codePattern = new RegExp(`^[A-Z0-9]{${TENANT_INVITATION_CODE_LENGTH}}$`);

export const verifyInvitationInputSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(codePattern, `Code muss ${TENANT_INVITATION_CODE_LENGTH} Zeichen (A-Z, 0-9) lang sein`),
});
export type VerifyInvitationInput = z.infer<typeof verifyInvitationInputSchema>;
