import { describe, expect, it } from "vitest";
import { normalizeGroqItinerary, GroqTripItinerarySchema } from "@/lib/groqItinerary";
import { normalizeGroqTripUpdate, GroqTripUpdateSchema } from "@/lib/groqUpdate";
import { MAX_STOPS_PER_DAY } from "@/types/trip";

describe("Groq itinerary output", () => {
  it("normalizes nullable strict-schema fields to optional itinerary fields", () => {
    const generated = GroqTripItinerarySchema.parse({
      destination: "Lisbon",
      summary: null,
      days: [{
        dayNumber: 1,
        title: null,
        stops: [{
          name: "Belém Tower",
          time: null,
          description: "Explore the riverside landmark.",
          category: "sight",
          durationMinutes: null,
        }],
      }],
    });

    expect(normalizeGroqItinerary(generated)).toEqual({
      destination: "Lisbon",
      summary: undefined,
      days: [{
        dayNumber: 1,
        title: undefined,
        stops: [{
          name: "Belém Tower",
          time: undefined,
          description: "Explore the riverside landmark.",
          category: "sight",
          durationMinutes: undefined,
        }],
      }],
    });
  });

  it("normalizes strict update operations and nullable stop fields", () => {
    const generated = GroqTripUpdateSchema.parse({
      operations: [{
        action: "add_stop",
        stopId: null,
        dayNumber: 2,
        position: null,
        stop: {
          name: "National Coach Museum",
          time: null,
          description: "Explore the collection.",
          category: "sight",
          durationMinutes: null,
        },
        stops: null,
        title: null,
        destination: null,
        summary: null,
      }],
    });

    expect(normalizeGroqTripUpdate(generated)).toEqual({
      operations: [{
        action: "add_stop",
        dayNumber: 2,
        position: undefined,
        stop: {
          name: "National Coach Museum",
          time: undefined,
          description: "Explore the collection.",
          category: "sight",
          durationMinutes: undefined,
        },
      }],
    });
  });

  it("validates normalized results against the app itinerary constraints", () => {
    const generated = GroqTripItinerarySchema.parse({
      destination: "Lisbon",
      summary: null,
      days: [{
        dayNumber: 1,
        title: null,
        stops: Array.from({ length: MAX_STOPS_PER_DAY + 1 }, (_, index) => ({
          name: `Stop ${index + 1}`,
          time: null,
          description: null,
          category: null,
          durationMinutes: null,
        })),
      }],
    });

    expect(() => normalizeGroqItinerary(generated)).toThrow();
  });
});
