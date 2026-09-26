"use client";

import { useEffect, useState } from "react";
import { DayCard } from "@/components/DayCard";
import { TripMap } from "@/components/TripMap";
import type { PlacePreview, TripMapStop } from "@/types/place";
import type { TripWithIds } from "@/types/trip";

type TripItineraryViewProps = {
  trip: TripWithIds;
  placesByStop: Record<string, PlacePreview | null>;
  loadingByStop: Record<string, boolean>;
  mapStops: TripMapStop[];
  onMoveStopAction: (dayId: string, stopId: string, direction: -1 | 1) => void;
  onRemoveStopAction: (dayId: string, stopId: string) => void;
};

type ItineraryContentProps = TripItineraryViewProps;

function ItineraryContent({ trip, placesByStop, loadingByStop, mapStops, onMoveStopAction, onRemoveStopAction }: ItineraryContentProps) {
  const [activeDayId, setActiveDayId] = useState(trip.days[0]?.id ?? "");
  const activeDay = trip.days.find((day) => day.id === activeDayId) ?? trip.days[0];
  const stopCount = trip.days.reduce((total, day) => total + day.stops.length, 0);

  useEffect(() => {
    if (!trip.days.some((day) => day.id === activeDayId)) setActiveDayId(trip.days[0]?.id ?? "");
  }, [activeDayId, trip.days]);

  return (
    <div className="itinerary-view">
      <section className="trip-overview">
        <div className="overview-copy">
          <p className="eyebrow"><span className="live-dot" aria-hidden="true" /> YOUR ITINERARY</p>
          <h2>{trip.destination}</h2>
          {trip.summary && <p className="trip-summary">{trip.summary}</p>}
        </div>
        <div className="trip-stats" aria-label="Itinerary overview">
          <div><strong>{trip.days.length}</strong><span>{trip.days.length === 1 ? "day" : "days"}</span></div>
          <div><strong>{stopCount}</strong><span>{stopCount === 1 ? "waypoint" : "waypoints"}</span></div>
          <div><strong>{mapStops.length}</strong><span>{mapStops.length === 1 ? "pin" : "pins"}</span></div>
        </div>
      </section>

      {mapStops.length > 0 && (
        <section className="route-map-panel" aria-label="Interactive map of itinerary stops">
          <TripMap stops={mapStops} />
        </section>
      )}

      <div className="itinerary-section-heading">
        <div><p className="eyebrow">THE ROUTE</p><h2>One day at a time</h2></div>
        <span className="edit-note">Made to be rearranged <span aria-hidden="true">↘</span></span>
      </div>

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
            loadingByStop={loadingByStop}
            onMoveStop={onMoveStopAction}
            onRemoveStop={onRemoveStopAction}
          />
        </div>
      )}
    </div>
  );
}

export function TripItineraryView(props: TripItineraryViewProps) {
  return <ItineraryContent {...props} />;
}
