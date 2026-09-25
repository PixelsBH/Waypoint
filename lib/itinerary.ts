import type { TripWithIds } from "@/types/trip";

export function moveStop(trip: TripWithIds, dayId: string, stopId: string, direction: -1 | 1) {
  const dayIndex = trip.days.findIndex((day) => day.id === dayId);
  if (dayIndex < 0) return trip;

  const day = trip.days[dayIndex];
  const stopIndex = day.stops.findIndex((stop) => stop.id === stopId);
  const nextIndex = stopIndex + direction;
  if (stopIndex < 0 || nextIndex < 0 || nextIndex >= day.stops.length) return trip;

  const stops = [...day.stops];
  [stops[stopIndex], stops[nextIndex]] = [stops[nextIndex], stops[stopIndex]];
  const days = [...trip.days];
  days[dayIndex] = { ...day, stops };
  return { ...trip, days };
}

export function removeStop(trip: TripWithIds, dayId: string, stopId: string) {
  const dayIndex = trip.days.findIndex((day) => day.id === dayId);
  if (dayIndex < 0) return trip;

  const day = trip.days[dayIndex];
  if (day.stops.length <= 1 || !day.stops.some((stop) => stop.id === stopId)) return trip;

  const days = [...trip.days];
  days[dayIndex] = { ...day, stops: day.stops.filter((stop) => stop.id !== stopId) };
  return { ...trip, days };
}
