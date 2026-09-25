"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DayCard } from "@/components/DayCard";
import { TripMap } from "@/components/TripMap";
import { PlaceEnrichmentResponseSchema } from "@/types/place";
import type { PlacePreview, StopPlaceLookup, TripMapStop } from "@/types/place";
import type { TripWithIds } from "@/types/trip";

type TripItineraryViewProps = {
  trip: TripWithIds;
  onMoveStopAction: (dayId: string, stopId: string, direction: -1 | 1) => void;
  onRemoveStopAction: (dayId: string, stopId: string) => void;
};

type ItineraryContentProps = TripItineraryViewProps & {
  placesByStop: Record<string, PlacePreview | null>;
};

function PlaceEnrichedItinerary(props: TripItineraryViewProps) {
  const targets = useMemo(
    () => props.trip.days.flatMap((day) => day.stops.map((stop) => ({
      id: stop.id,
      name: stop.name,
      query: `${stop.name}, ${props.trip.destination}`,
    }))),
    [props.trip.days, props.trip.destination],
  );
  const [lookups, setLookups] = useState<Record<string, StopPlaceLookup>>({});
  const requestedQueries = useRef(new Map<string, string>());

  useEffect(() => {
    const pending = targets.filter((target) => requestedQueries.current.get(target.id) !== target.query);
    if (pending.length === 0) return;

    pending.forEach((target) => requestedQueries.current.set(target.id, target.query));

    void (async () => {
      try {
        const response = await fetch("/api/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destination: props.trip.destination,
            stops: pending.map(({ id, name }) => ({ id, name })),
          }),
          signal: AbortSignal.timeout(55_000),
        });
        if (!response.ok) throw new Error("Place lookup failed");

        const result = PlaceEnrichmentResponseSchema.safeParse(await response.json());
        if (!result.success) throw new Error("Place lookup returned invalid data");

        const updates = Object.fromEntries(pending
          .filter((target) => requestedQueries.current.get(target.id) === target.query)
          .map((target) => [target.id, {
            query: target.query,
            place: result.data.places[target.id] ?? null,
          }]));
        setLookups((current) => ({ ...current, ...updates }));
      } catch {
        const updates = Object.fromEntries(pending
          .filter((target) => requestedQueries.current.get(target.id) === target.query)
          .map((target) => [target.id, { query: target.query, place: null }]));
        setLookups((current) => ({ ...current, ...updates }));
      }
    })();
  }, [props.trip.destination, targets]);

  const placesByStop = useMemo(() => {
    const result: Record<string, PlacePreview | null> = {};
    targets.forEach((target) => {
      const lookup = lookups[target.id];
      if (lookup?.query === target.query) result[target.id] = lookup.place;
    });
    return result;
  }, [lookups, targets]);
  return <ItineraryContent {...props} placesByStop={placesByStop} />;
}

function ItineraryContent({ trip, onMoveStopAction, onRemoveStopAction, placesByStop }: ItineraryContentProps) {
  const [activeDayId, setActiveDayId] = useState(trip.days[0]?.id ?? "");
  const activeDay = trip.days.find((day) => day.id === activeDayId) ?? trip.days[0];
  const stopCount = trip.days.reduce((total, day) => total + day.stops.length, 0);
  const mapStops = useMemo(() => trip.days.flatMap((day) => day.stops.flatMap((stop, index) => {
    const place = placesByStop[stop.id];
    return place ? [{
      id: stop.id,
      name: stop.name,
      dayNumber: day.dayNumber,
      stopNumber: index + 1,
      place,
    } satisfies TripMapStop] : [];
  })), [placesByStop, trip.days]);

  useEffect(() => {
    if (!trip.days.some((day) => day.id === activeDayId)) setActiveDayId(trip.days[0]?.id ?? "");
  }, [activeDayId, trip.days]);

  return (
    <div className="itinerary-view">
      <section className="trip-overview">
        <div className="overview-copy">
          <p className="eyebrow"><span className="live-dot" /> YOUR ITINERARY</p>
          <h2>{trip.destination}</h2>
          {trip.summary && <p className="trip-summary">{trip.summary}</p>}
        </div>
        <div className="trip-stats" aria-label="Itinerary overview">
          <div><strong>{trip.days.length}</strong><span>{trip.days.length === 1 ? "day" : "days"}</span></div>
          <div><strong>{stopCount}</strong><span>{stopCount === 1 ? "waypoint" : "waypoints"}</span></div>
        </div>
      </section>

      <div className="itinerary-section-heading">
        <div><p className="eyebrow">THE ROUTE</p><h2>One day at a time</h2></div>
        <span className="edit-note">Made to be rearranged <span aria-hidden="true">↘</span></span>
      </div>

      <section className="route-map-panel" aria-label="Interactive OpenStreetMap of itinerary stops">
        <TripMap stops={mapStops} />
      </section>

      <div className="day-tabs" role="tablist" aria-label="Itinerary days">
        {trip.days.map((day) => (
          <button
            id={`tab-${day.id}`}
            key={day.id}
            className={`day-tab${activeDay?.id === day.id ? " is-active" : ""}`}
            onClick={() => setActiveDayId(day.id)}
            role="tab"
            aria-selected={activeDay?.id === day.id}
            aria-controls={`panel-${day.id}`}
            type="button"
          >
            <span>DAY {String(day.dayNumber).padStart(2, "0")}</span>
            <strong>{day.title || `Day ${day.dayNumber}`}</strong>
          </button>
        ))}
      </div>

      {activeDay && (
        <div role="tabpanel" id={`panel-${activeDay.id}`} aria-labelledby={`tab-${activeDay.id}`}>
          <DayCard
            day={activeDay}
            destination={trip.destination}
            placesByStop={placesByStop}
            onMoveStop={onMoveStopAction}
            onRemoveStop={onRemoveStopAction}
          />
        </div>
      )}
    </div>
  );
}

export function TripItineraryView(props: TripItineraryViewProps) {
  return <PlaceEnrichedItinerary {...props} />;
}
