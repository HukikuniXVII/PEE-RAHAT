import { z } from "zod";

/**
 * FR-TH-16: a tutor-defined recurring weekly busy window. weekday matches
 * JS Date.getDay() (0 = Sunday … 6 = Saturday). startMinute and endMinute
 * are minutes since local midnight; endMinute > startMinute.
 */
export interface TutorUnavailability {
  id: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
  reason?: string;
  createdAt: string;
}

export const createUnavailabilitySchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startMinute: z.number().int().min(0).max(1440),
    endMinute: z.number().int().min(1).max(1440),
    reason: z.string().trim().max(120).optional(),
  })
  .refine((v) => v.endMinute > v.startMinute, {
    message: "endMinute must be greater than startMinute",
    path: ["endMinute"],
  });

export type CreateUnavailabilityDto = z.infer<typeof createUnavailabilitySchema>;
