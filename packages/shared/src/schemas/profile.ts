import { z } from 'zod';
import { ROLES } from '../constants';

export const profileSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(ROLES),
  full_name: z.string().min(2).max(120),
  phone: z.string().trim().max(40).optional().nullable(),
  created_at: z.string().datetime(),
});
export type Profile = z.infer<typeof profileSchema>;

export const updateProfileSchema = profileSchema
  .pick({ full_name: true, phone: true })
  .partial();
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const signUpSchema = z
  .object({
    email: z.string().email(),
    password: z
      .string()
      .min(10, 'Passwort muss mindestens 10 Zeichen lang sein')
      .max(128)
      .refine((v) => /[A-Z]/.test(v), 'Mindestens ein Großbuchstabe')
      .refine((v) => /[a-z]/.test(v), 'Mindestens ein Kleinbuchstabe')
      .refine((v) => /[0-9]/.test(v), 'Mindestens eine Ziffer'),
    full_name: z.string().min(2, 'Bitte vollständigen Namen angeben').max(120),
    role: z.enum(['tenant', 'landlord']),
  });
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type SignInInput = z.infer<typeof signInSchema>;
