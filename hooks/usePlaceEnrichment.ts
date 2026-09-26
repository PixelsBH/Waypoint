"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MAX_STOPS_PER_ENRICH_REQUEST, PlaceEnrichmentResponseSchema } from "@/types/place";
import type { PlacePreview, StopPlaceLookup } from "@/types/place";
import type { TripWithIds } from "@/types/trip";

export function usePlaceEnrichment(trip: TripWithIds | null) {
  const targets = useMemo(
    () => trip?.days.flatMap((day) => day.stops.map((stop) => ({
      id: stop.id,
      name: stop.name,
      query: `${stop.name}, ${trip.destination}`,
    }))) ?? [],
    [trip],
  );
  const [lookups, setLookups] = useState<Record<string, StopPlaceLookup>>({});
  const [loadingQueries, setLoadingQueries] = useState<Record<string, string>>({});
  const requestedQueries = useRef(new Map<string, string>());

  useEffect(() => {
    const pending = targets.filter((target) => requestedQueries.current.get(target.id) !== target.query);
    if (pending.length === 0) return;

    pending.forEach((target) => requestedQueries.current.set(target.id, target.query));
    setLoadingQueries((current) => {
      const next = { ...current };
      pending.forEach((target) => { next[target.id] = target.query; });
      return next;
    });

    void (async () => {
      for (let start = 0; start < pending.length; start += MAX_STOPS_PER_ENRICH_REQUEST) {
        const batch = pending.slice(start, start + MAX_STOPS_PER_ENRICH_REQUEST);
        try {
          const response = await fetch("/api/enrich", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              destination: trip?.destination,
              stops: batch.map(({ id, name }) => ({ id, name })),
            }),
            signal: AbortSignal.timeout(55_000),
          });
          if (!response.ok) throw new Error("Place lookup failed");

          const result = PlaceEnrichmentResponseSchema.safeParse(await response.json());
          if (!result.success) throw new Error("Place lookup returned invalid data");

          const updates = Object.fromEntries(batch
            .filter((target) => requestedQueries.current.get(target.id) === target.query)
            .map((target) => [target.id, {
              query: target.query,
              place: result.data.places[target.id] ?? null,
            }]));
          setLookups((current) => ({ ...current, ...updates }));
        } catch {
          const updates = Object.fromEntries(batch
            .filter((target) => requestedQueries.current.get(target.id) === target.query)
            .map((target) => [target.id, { query: target.query, place: null }]));
          setLookups((current) => ({ ...current, ...updates }));
        } finally {
          setLoadingQueries((current) => {
            const next = { ...current };
            batch.forEach((target) => {
              if (next[target.id] === target.query) delete next[target.id];
            });
            return next;
          });
        }
      }
    })();
  }, [trip?.destination, targets]);

  const placesByStop = useMemo(() => {
    const result: Record<string, PlacePreview | null> = {};
    targets.forEach((target) => {
      const lookup = lookups[target.id];
      if (lookup?.query === target.query) result[target.id] = lookup.place;
    });
    return result;
  }, [lookups, targets]);
  const loadingByStop = useMemo(() => {
    const result: Record<string, boolean> = {};
    targets.forEach((target) => {
      result[target.id] = loadingQueries[target.id] === target.query;
    });
    return result;
  }, [loadingQueries, targets]);

  return { placesByStop, loadingByStop };
}
