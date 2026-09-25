"use client";

import type { StopWithId } from "@/types/trip";

const categoryNames: Record<NonNullable<StopWithId["category"]>, string> = {
  food: "Food & drink",
  sight: "Sight",
  activity: "Activity",
  transport: "Transport",
  lodging: "Stay",
  other: "Waypoint",
};

type StopCardProps = {
  stop: StopWithId;
  destination: string;
  index: number;
  count: number;
  onMoveAction: (direction: -1 | 1) => void;
  onRemoveAction: () => void;
};

export function StopCard({ stop, destination, index, count, onMoveAction, onRemoveAction }: StopCardProps) {
  return (
    <article className="stop-card">
      <div className="stop-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</div>
      <div className="stop-main">
        <div className="stop-title-row">
          <div className="stop-heading">
            <div className="stop-labels">
              {stop.category && <span className={`category-tag category-${stop.category}`}>{categoryNames[stop.category]}</span>}
              {stop.time && <span className="stop-time">{stop.time}</span>}
              {typeof stop.durationMinutes === "number" && <span className="stop-time">{stop.durationMinutes} min</span>}
            </div>
            <h3>{stop.name}</h3>
            {stop.description && <p className="stop-preview">{stop.description}</p>}
          </div>
          <div className="stop-controls" aria-label={`Actions for ${stop.name}`}>
            <button className="icon-button" onClick={() => onMoveAction(-1)} disabled={index === 0} type="button" aria-label={`Move ${stop.name} up`} title="Move up">↑</button>
            <button className="icon-button" onClick={() => onMoveAction(1)} disabled={index === count - 1} type="button" aria-label={`Move ${stop.name} down`} title="Move down">↓</button>
            <button className="icon-button remove-button" onClick={onRemoveAction} disabled={count <= 1} type="button" aria-label={`Remove ${stop.name}`} title={count <= 1 ? "A day needs at least one stop" : "Remove stop"}>×</button>
          </div>
        </div>
        <a
          className="text-action map-action"
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${stop.name}, ${destination}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Search for ${stop.name} in Google Maps`}
        >
          Search in Maps <span aria-hidden="true">↗</span>
        </a>
      </div>
    </article>
  );
}
