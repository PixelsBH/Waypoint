import type { EditableStopField, StopWithId, TripWithIds } from "@/types/trip";

type FieldChange = {
  stopId: string;
  field: EditableStopField;
  from: unknown;
  to: unknown;
};
type StopMove = { stopId: string; from: [number, number]; to: [number, number] };

type StopLocation = { dayIndex: number; pos: number; stop: StopWithId };

function indexStopsById(trip: TripWithIds) {
  const map = new Map<string, StopLocation>();
  trip.days.forEach((day, dayIndex) =>
    day.stops.forEach((stop, pos) => map.set(stop.id, { dayIndex, pos, stop })),
  );
  return map;
}

export function diffTrips(oldTrip: TripWithIds, newTrip: TripWithIds) {
  const oldIndex = indexStopsById(oldTrip);
  const newIndex = indexStopsById(newTrip);
  const fieldChanges: FieldChange[] = [];
  const moves: StopMove[] = [];
  const added: string[] = [];
  const removed: string[] = [];

  for (const [id, location] of newIndex) {
    const old = oldIndex.get(id);
    if (!old) {
      added.push(id);
      continue;
    }

    if (old.dayIndex !== location.dayIndex || old.pos !== location.pos) {
      moves.push({ stopId: id, from: [old.dayIndex, old.pos], to: [location.dayIndex, location.pos] });
    }

    ( ["name", "time", "description", "category", "durationMinutes"] as const).forEach((field) => {
      if (old.stop[field] !== location.stop[field]) {
        fieldChanges.push({ stopId: id, field, from: old.stop[field], to: location.stop[field] });
      }
    });
  }

  for (const id of oldIndex.keys()) {
    if (!newIndex.has(id)) removed.push(id);
  }

  return { fieldChanges, moves, added, removed };
}

export function applyStopField(
  trip: TripWithIds,
  stopId: string,
  field: EditableStopField,
  value: unknown,
): TripWithIds {
  return {
    ...trip,
    days: trip.days.map((day) => ({
      ...day,
      stops: day.stops.map((stop) =>
        stop.id === stopId ? ({ ...stop, [field]: value } as StopWithId) : stop,
      ),
    })),
  };
}
