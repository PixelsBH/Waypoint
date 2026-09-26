import { z } from "zod";
import { MAX_STOPS_PER_DAY, StopSchema, TripWithIdsSchema, type TripWithIds } from "@/types/trip";

const AddStopOperationSchema = z.object({
  action: z.literal("add_stop"),
  dayNumber: z.number().int().positive(),
  position: z.number().int().nonnegative().optional(),
  stop: StopSchema,
});

const ReplaceStopOperationSchema = z.object({
  action: z.literal("replace_stop"),
  stopId: z.string().min(1),
  stop: StopSchema,
});

const RemoveStopOperationSchema = z.object({
  action: z.literal("remove_stop"),
  stopId: z.string().min(1),
});

const MoveStopOperationSchema = z.object({
  action: z.literal("move_stop"),
  stopId: z.string().min(1),
  dayNumber: z.number().int().positive(),
  position: z.number().int().nonnegative().optional(),
});

const AddDayOperationSchema = z.object({
  action: z.literal("add_day"),
  dayNumber: z.number().int().positive(),
  title: z.string().optional(),
  stops: z.array(StopSchema).min(1).max(MAX_STOPS_PER_DAY),
});

const RemoveDayOperationSchema = z.object({
  action: z.literal("remove_day"),
  dayNumber: z.number().int().positive(),
});

const SetDestinationOperationSchema = z.object({
  action: z.literal("set_destination"),
  destination: z.string().trim().min(1),
});

const SetSummaryOperationSchema = z.object({
  action: z.literal("set_summary"),
  summary: z.string().optional(),
});

const SetDayTitleOperationSchema = z.object({
  action: z.literal("set_day_title"),
  dayNumber: z.number().int().positive(),
  title: z.string().optional(),
});

export const TripUpdateOperationSchema = z.discriminatedUnion("action", [
  AddStopOperationSchema,
  ReplaceStopOperationSchema,
  RemoveStopOperationSchema,
  MoveStopOperationSchema,
  AddDayOperationSchema,
  RemoveDayOperationSchema,
  SetDestinationOperationSchema,
  SetSummaryOperationSchema,
  SetDayTitleOperationSchema,
]);

export const TripUpdateSchema = z.object({
  operations: z.array(TripUpdateOperationSchema).max(30),
});

export type TripUpdate = z.infer<typeof TripUpdateSchema>;

export function applyTripUpdate(currentTrip: TripWithIds, update: TripUpdate): TripWithIds {
  const trip: TripWithIds = {
    ...currentTrip,
    days: currentTrip.days.map((day) => ({ ...day, stops: [...day.stops] })),
  };

  const findDay = (dayNumber: number) => {
    const day = trip.days.find((candidate) => candidate.dayNumber === dayNumber);
    if (!day) throw new Error(`Unknown day number: ${dayNumber}`);
    return day;
  };

  const findStop = (stopId: string) => {
    for (const day of trip.days) {
      const stopIndex = day.stops.findIndex((stop) => stop.id === stopId);
      if (stopIndex !== -1) return { day, stopIndex };
    }
    throw new Error(`Unknown stop ID: ${stopId}`);
  };

  for (const operation of update.operations) {
    switch (operation.action) {
      case "add_stop": {
        const day = findDay(operation.dayNumber);
        if (day.stops.length >= MAX_STOPS_PER_DAY) throw new Error("Day is already at the stop limit");
        const position = operation.position ?? day.stops.length;
        if (position > day.stops.length) throw new Error("Stop position is out of range");
        day.stops.splice(position, 0, { ...operation.stop, id: crypto.randomUUID() });
        break;
      }
      case "replace_stop": {
        const { day, stopIndex } = findStop(operation.stopId);
        day.stops[stopIndex] = { ...operation.stop, id: operation.stopId };
        break;
      }
      case "remove_stop": {
        const { day, stopIndex } = findStop(operation.stopId);
        if (day.stops.length === 1) throw new Error("Cannot remove the final stop from a day");
        day.stops.splice(stopIndex, 1);
        break;
      }
      case "move_stop": {
        const { day: sourceDay, stopIndex } = findStop(operation.stopId);
        const destinationDay = findDay(operation.dayNumber);
        if (sourceDay !== destinationDay && sourceDay.stops.length === 1) {
          throw new Error("Cannot move the final stop from a day");
        }
        if (sourceDay !== destinationDay && destinationDay.stops.length >= MAX_STOPS_PER_DAY) {
          throw new Error("Destination day is already at the stop limit");
        }
        const [stop] = sourceDay.stops.splice(stopIndex, 1);
        const position = operation.position ?? destinationDay.stops.length;
        if (position > destinationDay.stops.length) throw new Error("Stop position is out of range");
        destinationDay.stops.splice(position, 0, stop);
        break;
      }
      case "add_day": {
        const position = operation.dayNumber - 1;
        if (position > trip.days.length) throw new Error("Day position is out of range");
        trip.days.splice(position, 0, {
          id: crypto.randomUUID(),
          dayNumber: operation.dayNumber,
          title: operation.title,
          stops: operation.stops.map((stop) => ({ ...stop, id: crypto.randomUUID() })),
        });
        trip.days.forEach((day, index) => { day.dayNumber = index + 1; });
        break;
      }
      case "remove_day": {
        const dayIndex = trip.days.findIndex((day) => day.dayNumber === operation.dayNumber);
        if (dayIndex === -1) throw new Error(`Unknown day number: ${operation.dayNumber}`);
        if (trip.days.length === 1) throw new Error("Cannot remove the only day from a trip");
        trip.days.splice(dayIndex, 1);
        trip.days.forEach((day, index) => { day.dayNumber = index + 1; });
        break;
      }
      case "set_destination":
        trip.destination = operation.destination;
        break;
      case "set_summary":
        trip.summary = operation.summary;
        break;
      case "set_day_title":
        findDay(operation.dayNumber).title = operation.title;
        break;
    }
  }

  return TripWithIdsSchema.parse(trip);
}

