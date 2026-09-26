import { z } from "zod";
import { TripUpdateSchema, type TripUpdate } from "@/lib/updateTrip";

const GroqStopSchema = z.object({
  name: z.string(),
  time: z.string().nullable(),
  description: z.string().nullable(),
  category: z.enum(["food", "sight", "activity", "transport", "lodging", "other"]).nullable(),
  durationMinutes: z.number().nullable(),
});

const GroqOperationSchema = z.object({
  action: z.enum([
    "add_stop",
    "replace_stop",
    "remove_stop",
    "move_stop",
    "add_day",
    "remove_day",
    "set_destination",
    "set_summary",
    "set_day_title",
  ]),
  stopId: z.string().nullable(),
  dayNumber: z.number().nullable(),
  position: z.number().nullable(),
  stop: GroqStopSchema.nullable(),
  stops: z.array(GroqStopSchema).nullable(),
  title: z.string().nullable(),
  destination: z.string().nullable(),
  summary: z.string().nullable(),
});

// Groq strict JSON mode requires every field to be present and closed. Nullable
// fields let each operation use the same provider schema without weakening the
// application-facing discriminated union.
export const GroqTripUpdateSchema = z.object({
  operations: z.array(GroqOperationSchema),
});

function normalizeStop(stop: z.infer<typeof GroqStopSchema>) {
  return {
    name: stop.name,
    time: stop.time ?? undefined,
    description: stop.description ?? undefined,
    category: stop.category ?? undefined,
    durationMinutes: stop.durationMinutes ?? undefined,
  };
}

export function normalizeGroqTripUpdate(output: z.infer<typeof GroqTripUpdateSchema>): TripUpdate {
  const operations = output.operations.map((operation) => {
    switch (operation.action) {
      case "add_stop":
        return {
          action: operation.action,
          dayNumber: operation.dayNumber,
          position: operation.position ?? undefined,
          stop: operation.stop ? normalizeStop(operation.stop) : undefined,
        };
      case "replace_stop":
        return {
          action: operation.action,
          stopId: operation.stopId,
          stop: operation.stop ? normalizeStop(operation.stop) : undefined,
        };
      case "remove_stop":
        return { action: operation.action, stopId: operation.stopId };
      case "move_stop":
        return {
          action: operation.action,
          stopId: operation.stopId,
          dayNumber: operation.dayNumber,
          position: operation.position ?? undefined,
        };
      case "add_day":
        return {
          action: operation.action,
          dayNumber: operation.dayNumber,
          title: operation.title ?? undefined,
          stops: operation.stops?.map(normalizeStop),
        };
      case "remove_day":
        return { action: operation.action, dayNumber: operation.dayNumber };
      case "set_destination":
        return { action: operation.action, destination: operation.destination };
      case "set_summary":
        return { action: operation.action, summary: operation.summary ?? undefined };
      case "set_day_title":
        return {
          action: operation.action,
          dayNumber: operation.dayNumber,
          title: operation.title ?? undefined,
        };
    }
  });
  return TripUpdateSchema.parse({ operations });
}
