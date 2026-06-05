import { z } from 'zod';

export const HANDOVER_TYPES = ['move_in', 'move_out'] as const;
export type HandoverType = (typeof HANDOVER_TYPES)[number];

export const HANDOVER_TYPE_LABELS_DE: Record<HandoverType, string> = {
  move_in: 'Einzug',
  move_out: 'Auszug',
};

// Zählerstand-Eintrag
export const meterReadingSchema = z.object({
  value: z.string().trim().max(40).optional().default(''),
  meter_no: z.string().trim().max(60).optional().default(''),
});
export type MeterReading = z.infer<typeof meterReadingSchema>;

export const meterReadingsSchema = z.object({
  electricity: meterReadingSchema.optional(),
  water: meterReadingSchema.optional(),
  gas: meterReadingSchema.optional(),
});
export type MeterReadings = z.infer<typeof meterReadingsSchema>;

// Schlüssel-Eintrag
export const keyItemSchema = z.object({
  label: z.string().trim().min(1, 'Bezeichnung fehlt').max(80),
  count: z.coerce.number().int().min(0).max(99),
});
export type KeyItem = z.infer<typeof keyItemSchema>;

// Raum
export const handoverRoomInputSchema = z.object({
  room_label: z.string().trim().min(1, 'Raumname fehlt').max(120),
  notes: z.string().trim().max(2000).optional().default(''),
});
export type HandoverRoomInput = z.infer<typeof handoverRoomInputSchema>;

// Protokoll anlegen
export const createHandoverInputSchema = z.object({
  tenancy_id: z.string().uuid(),
  type: z.enum(HANDOVER_TYPES),
  meter_readings: meterReadingsSchema.optional().default({}),
  keys: z.array(keyItemSchema).max(20).optional().default([]),
  general_notes: z.string().trim().max(4000).optional().default(''),
});
export type CreateHandoverInput = z.infer<typeof createHandoverInputSchema>;

export const HANDOVER_METER_LABELS_DE = {
  electricity: 'Strom',
  water: 'Wasser',
  gas: 'Gas',
} as const;
