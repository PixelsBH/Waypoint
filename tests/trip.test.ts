import { describe, expect, it } from "vitest";
import { buildPrompt, buildUpdatePrompt } from "@/lib/buildPrompt";
import { applyTripUpdate } from "@/lib/updateTrip";
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

  it("builds update prompts from the current trip and asks for minimal operations", () => {
    const prompt = buildUpdatePrompt("Add a museum to day 2", trip);
    expect(prompt).toContain("Do not return a newly generated itinerary");
    expect(prompt).toContain("Make the smallest set of operations");
    expect(prompt).toContain('"destination":"Lisbon"');
    expect(prompt).toContain('"id":"stop-1"');
    expect(prompt).toContain("Add a museum to day 2");
  });
});

describe("targeted itinerary updates", () => {
  const twoDayTrip: TripWithIds = {
    ...trip,
    days: [
      trip.days[0],
      {
        id: "day-2",
        dayNumber: 2,
        title: "Riverside",
        stops: [{ id: "stop-3", name: "Belém Tower", category: "sight" }],
      },
    ],
  };

  it("adds only the requested stop and preserves all existing stop and day IDs", () => {
    const updated = applyTripUpdate(twoDayTrip, {
      operations: [{
        action: "add_stop",
        dayNumber: 2,
        stop: { name: "National Coach Museum", category: "sight" },
      }],
    });

    expect(updated.destination).toBe("Lisbon");
    expect(updated.days.map((day) => day.id)).toEqual(["day-1", "day-2"]);
    expect(updated.days[0].stops).toEqual(twoDayTrip.days[0].stops);
    expect(updated.days[1].stops.slice(0, 1)).toEqual(twoDayTrip.days[1].stops);
    expect(updated.days[1].stops[1]).toMatchObject({ name: "National Coach Museum", category: "sight" });
    expect(updated.days[1].stops[1].id).not.toBe("stop-3");
  });

  it("replaces only the targeted stop while retaining its stable ID", () => {
    const updated = applyTripUpdate(twoDayTrip, {
      operations: [{
        action: "replace_stop",
        stopId: "stop-3",
        stop: { name: "Jerónimos Monastery", category: "sight" },
      }],
    });

    expect(updated.days[0].stops).toEqual(twoDayTrip.days[0].stops);
    expect(updated.days[1].stops).toEqual([{ id: "stop-3", name: "Jerónimos Monastery", category: "sight" }]);
  });

  it("rejects an operation that references a missing stop", () => {
    expect(() => applyTripUpdate(twoDayTrip, {
      operations: [{ action: "remove_stop", stopId: "missing-stop" }],
    })).toThrow("Unknown stop ID");
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
