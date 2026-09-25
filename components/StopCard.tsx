"use client";

import { useState } from "react";
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
  index: number;
  count: number;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
};

export function StopCard({ stop, index, count, onMove, onRemove }: StopCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className={`stop-card${expanded ? " is-expanded" : ""}`}>
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
            {stop.description && !expanded && <p className="stop-preview">{stop.description}</p>}
          </div>
          <div className="stop-controls" aria-label={`Actions for ${stop.name}`}>
            <button className="icon-button" onClick={() => onMove(-1)} disabled={index === 0} type="button" aria-label={`Move ${stop.name} up`} title="Move up">↑</button>
            <button className="icon-button" onClick={() => onMove(1)} disabled={index === count - 1} type="button" aria-label={`Move ${stop.name} down`} title="Move down">↓</button>
            <button className="icon-button remove-button" onClick={onRemove} disabled={count <= 1} type="button" aria-label={`Remove ${stop.name}`} title={count <= 1 ? "A day needs at least one stop" : "Remove stop"}>×</button>
          </div>
        </div>
        {expanded && (
          <div className="stop-details">
            <p>{stop.description || "No extra notes for this stop yet. Enjoy the room to explore."}</p>
            {stop.durationMinutes && <span className="detail-note">Suggested time here: about {stop.durationMinutes} minutes</span>}
          </div>
        )}
        <button
          className="text-action expand-action"
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          {expanded ? "Show less" : "More details"}
          <span aria-hidden="true">{expanded ? "−" : "+"}</span>
        </button>
      </div>
    </article>
  );
}
