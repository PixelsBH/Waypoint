import { z } from "zod";
import { TripItinerarySchema, type TripItinerary } from "@/types/trip";

const GroqStopSchema = z.object({
  name: z.string(),
  time: z.string().nullable(),
  description: z.string().nullable(),
  category: z.enum(["food", "sight", "activity", "transport", "lodging", "other"]).nullable(),
  durationMinutes: z.number().nullable(),
});

const GroqDaySchema = z.object({
  dayNumber: z.number(),
  title: z.string().nullable(),
  stops: z.array(GroqStopSchema),
});

// Groq's strict JSON mode requires every field to be present and objects to be
// closed. Nullable fields preserve the optional fields in the app's itinerary.
export const GroqTripItinerarySchema = z.object({
  destination: z.string(),
  summary: z.string().nullable(),
  days: z.array(GroqDaySchema),
});

export function normalizeGroqItinerary(output: z.infer<typeof GroqTripItinerarySchema>): TripItinerary {
  return TripItinerarySchema.parse({
    destination: output.destination,
    summary: output.summary ?? undefined,
    days: output.days.map((day) => ({
      dayNumber: day.dayNumber,
      title: day.title ?? undefined,
      stops: day.stops.map((stop) => ({
        name: stop.name,
        time: stop.time ?? undefined,
        description: stop.description ?? undefined,
        category: stop.category ?? undefined,
        durationMinutes: stop.durationMinutes ?? undefined,
      })),
    })),
  });
}
