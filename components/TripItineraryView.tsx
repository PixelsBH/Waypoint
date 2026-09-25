"use client";

import { useEffect, useState } from "react";
import { DayCard } from "@/components/DayCard";
import type { TripWithIds } from "@/types/trip";

type TripItineraryViewProps = {
  trip: TripWithIds;
  onMoveStop: (dayId: string, stopId: string, direction: -1 | 1) => void;
  onRemoveStop: (dayId: string, stopId: string) => void;
};

export function TripItineraryView({ trip, onMoveStop, onRemoveStop }: TripItineraryViewProps) {
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
          <DayCard day={activeDay} onMoveStop={onMoveStop} onRemoveStop={onRemoveStop} />
        </div>
      )}
    </div>
  );
}
