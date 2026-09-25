import { describe, expect, it } from "vitest";
import { buildPrompt } from "@/lib/buildPrompt";
import { diffTrips } from "@/lib/diffTrips";
import { moveStop, removeStop } from "@/lib/itinerary";
import { validateResult } from "@/lib/validateResult";
import { InMemoryRateLimiter } from "@/lib/rateLimiter";
import { DaySchema, MAX_STOPS_PER_DAY, TripWithIdsSchema } from "@/types/trip";
import type { TripWithIds } from "@/types/trip";

const trip: TripWithIds = {
  destination: "Lisbon",
  summary: "A gentle city break.",
  days: [
    {
      id: "day-1",
      dayNumber: 1,
      title: "Old town",
      stops: [
        { id: "stop-1", name: "Coffee", category: "food" },
        { id: "stop-2", name: "The viewpoint", category: "sight", time: "10:00 AM" },
      ],
    },
  ],
};

describe("itinerary validation", () => {
  it("accepts a complete itinerary with server-assigned IDs", () => {
    expect(validateResult(trip).success).toBe(true);
  });

  it("rejects valid JSON with a missing required field", () => {
    const invalid = {
      destination: "Lisbon",
      days: [{ id: "day-1", dayNumber: 1, stops: [{ id: "stop-1" }] }],
    };
    expect(validateResult(invalid).success).toBe(false);
  });

  it("rejects an empty itinerary", () => {
    expect(validateResult({ destination: "", days: [] }).success).toBe(false);
  });

  it("allows at most five stops per day", () => {
    const stops = Array.from({ length: MAX_STOPS_PER_DAY }, (_, index) => ({ name: `Stop ${index + 1}` }));
    expect(DaySchema.safeParse({ dayNumber: 1, stops }).success).toBe(true);
    expect(DaySchema.safeParse({ dayNumber: 1, stops: [...stops, { name: "One more stop" }] }).success).toBe(false);
    const tooManyStops = {
      ...trip,
      days: [{ ...trip.days[0], stops: Array.from({ length: MAX_STOPS_PER_DAY + 1 }, (_, index) => ({ id: `stop-${index}`, name: `Stop ${index}` })) }],
    };
    expect(TripWithIdsSchema.safeParse(tooManyStops).success).toBe(false);
  });

  it("keeps venue names separate from meal and activity context in the generation prompt", () => {
    const prompt = buildPrompt("A weekend in Lisbon");
    expect(prompt).toContain(`no more than ${MAX_STOPS_PER_DAY} stops on any day`);
    expect(prompt).toContain("one valid JSON object matching the structured output schema");
    expect(prompt).toContain("description, which is the stop's subheading");
    expect(prompt).toContain('name "Nicolau Lisboa"');
    expect(prompt).toContain('name "A Brasileira"');
  });
});

describe("itinerary interactions", () => {
  it("moves a stop immutably and leaves the original unchanged", () => {
    const reordered = moveStop(trip, "day-1", "stop-2", -1);
    expect(reordered.days[0].stops.map((stop) => stop.id)).toEqual(["stop-2", "stop-1"]);
    expect(trip.days[0].stops.map((stop) => stop.id)).toEqual(["stop-1", "stop-2"]);
  });

  it("does not move a stop beyond the route boundaries", () => {
    expect(moveStop(trip, "day-1", "stop-1", -1)).toBe(trip);
  });

  it("does not allow removing the final stop in a day", () => {
    const oneStopTrip: TripWithIds = {
      ...trip,
      days: [{ ...trip.days[0], stops: [trip.days[0].stops[0]] }],
    };
    expect(removeStop(oneStopTrip, "day-1", "stop-1")).toBe(oneStopTrip);
  });

  it("reports field edits and reorder locations by stable stop ID", () => {
    const revised: TripWithIds = {
      ...trip,
      days: [{
        ...trip.days[0],
        stops: [
          { ...trip.days[0].stops[1], time: "11:00 AM" },
          trip.days[0].stops[0],
        ],
      }],
    };
    const diff = diffTrips(trip, revised);
    expect(diff.fieldChanges).toEqual([
      { stopId: "stop-2", field: "time", from: "10:00 AM", to: "11:00 AM" },
    ]);
    expect(diff.moves).toEqual([
      { stopId: "stop-2", from: [0, 1], to: [0, 0] },
      { stopId: "stop-1", from: [0, 0], to: [0, 1] },
    ]);
  });
});

describe("in-memory rate limiter", () => {
  it("allows requests up to the limit and rejects the next one in the window", async () => {
    const limiter = new InMemoryRateLimiter(2, 60_000);
    await expect(limiter.check("client-a")).resolves.toBe(true);
    await expect(limiter.check("client-a")).resolves.toBe(true);
    await expect(limiter.check("client-a")).resolves.toBe(false);
    await expect(limiter.check("client-b")).resolves.toBe(true);
  });
});
