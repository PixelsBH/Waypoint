import { describe, expect, it } from "vitest";
import { normalizeGroqItinerary, GroqTripItinerarySchema } from "@/lib/groqItinerary";

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

  it("validates normalized results against the app itinerary constraints", () => {
    const generated = GroqTripItinerarySchema.parse({
      destination: "Lisbon",
      summary: null,
      days: [{
        dayNumber: 1,
        title: null,
        stops: Array.from({ length: 6 }, (_, index) => ({
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
