import { z } from "zod";

// IDs are intentionally absent from the model-facing schema. Stable identity is
// attached by our server after the itinerary has passed validation.
export const StopSchema = z.object({
  name: z.string().trim().min(1),
  time: z.string().optional(),
  description: z.string().optional(),
  category: z.enum(["food", "sight", "activity", "transport", "lodging", "other"]).optional(),
  durationMinutes: z.number().int().positive().optional(),
});

export const DaySchema = z.object({
  dayNumber: z.number().int().positive(),
  title: z.string().optional(),
  stops: z.array(StopSchema).min(1),
});

export const TripItinerarySchema = z.object({
  destination: z.string().trim().min(1),
  summary: z.string().optional(),
  days: z.array(DaySchema).min(1),
});

export const StopWithIdSchema = StopSchema.extend({ id: z.string().min(1) });
export const DayWithIdSchema = DaySchema.extend({
  id: z.string().min(1),
  stops: z.array(StopWithIdSchema).min(1),
});
export const TripWithIdsSchema = TripItinerarySchema.extend({
  days: z.array(DayWithIdSchema).min(1),
});

export type TripItinerary = z.infer<typeof TripItinerarySchema>;
export type Day = z.infer<typeof DaySchema>;
export type Stop = z.infer<typeof StopSchema>;
export type StopWithId = z.infer<typeof StopWithIdSchema>;
export type DayWithId = z.infer<typeof DayWithIdSchema>;
export type TripWithIds = z.infer<typeof TripWithIdsSchema>;
export type EditableStopField = keyof Stop;

export type Snapshot = {
  id: string;
  timestamp: number;
  label: string;
  data: TripWithIds;
};
