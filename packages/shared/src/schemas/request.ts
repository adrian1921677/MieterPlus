import { z } from 'zod';
import {
  REQUEST_CATEGORIES,
  REQUEST_PRIORITIES,
  REQUEST_STATUSES,
} from '../constants';

export const requestSchema = z.object({
  id: z.string().uuid(),
  tenancy_id: z.string().uuid(),
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().min(10).max(4000),
  category: z.enum(REQUEST_CATEGORIES),
  priority: z.enum(REQUEST_PRIORITIES),
  status: z.enum(REQUEST_STATUSES),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type MaintenanceRequest = z.infer<typeof requestSchema>;

export const createRequestInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Titel muss mindestens 3 Zeichen lang sein')
    .max(140),
  description: z
    .string()
    .trim()
    .min(10, 'Bitte beschreibe das Problem (min. 10 Zeichen)')
    .max(4000),
  category: z.enum(REQUEST_CATEGORIES),
  priority: z.enum(REQUEST_PRIORITIES).default('normal'),
});
export type CreateRequestInput = z.infer<typeof createRequestInputSchema>;

export const updateRequestStatusInputSchema = z.object({
  request_id: z.string().uuid(),
  status: z.enum(REQUEST_STATUSES),
});
export type UpdateRequestStatusInput = z.infer<typeof updateRequestStatusInputSchema>;

export const requestCommentSchema = z.object({
  id: z.string().uuid(),
  request_id: z.string().uuid(),
  author_id: z.string().uuid(),
  message: z.string().trim().min(1).max(4000),
  created_at: z.string().datetime(),
});
export type RequestComment = z.infer<typeof requestCommentSchema>;

export const createCommentInputSchema = z.object({
  request_id: z.string().uuid(),
  message: z.string().trim().min(1, 'Nachricht darf nicht leer sein').max(4000),
});
export type CreateCommentInput = z.infer<typeof createCommentInputSchema>;
