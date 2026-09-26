"use client";

import type { StopWithId } from "@/types/trip";
import type { PlacePreview } from "@/types/place";

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
  place?: PlacePreview;
  isLoadingPlace: boolean;
  index: number;
  count: number;
  onMoveAction: (direction: -1 | 1) => void;
  onRemoveAction: () => void;
};

export function StopCard({ stop, destination, place, isLoadingPlace, index, count, onMoveAction, onRemoveAction }: StopCardProps) {
  return (
    <article className="stop-card">
      {place?.photo ? (
        <img className="stop-photo" src={place.photo.url} alt={`Preview of ${stop.name}`} loading="lazy" />
      ) : (
        <div className="stop-photo stop-photo-fallback" aria-hidden="true">
          <span>{isLoadingPlace ? "…" : "✦"}</span>
        </div>
      )}
      <div className="stop-main">
        <div className="stop-title-row">
          <div className="stop-heading">
            <div className="stop-labels">
              <span className="stop-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              {stop.category && <span className={`category-tag category-${stop.category}`}>{categoryNames[stop.category]}</span>}
              {stop.time && <span className="stop-time">{stop.time}</span>}
              {typeof stop.durationMinutes === "number" && <span className="stop-time">{stop.durationMinutes} min</span>}
            </div>
            <h3>{stop.name}</h3>
            {stop.description && <p className="stop-preview">{stop.description}</p>}
            {isLoadingPlace && !place && (
              <p className="place-loading" role="status">
                <span className="place-loading-spinner" aria-hidden="true" />
                Finding this stop on the map…
              </p>
            )}
            {place && (
              <div className="stop-place-meta">
                {place.address && <span className="stop-address">{place.address}</span>}
                <span className="stop-coordinates">{place.coordinates.lat.toFixed(5)}, {place.coordinates.lng.toFixed(5)}</span>
                {place.photo && (
                  <span className="photo-attribution">
                    Photo by {place.photo.creator} · <a href={place.photo.sourceUrl} target="_blank" rel="noopener noreferrer">source</a>
                    {place.photo.licenseUrl ? (
                      <> · <a href={place.photo.licenseUrl} target="_blank" rel="noopener noreferrer">{place.photo.licenseName}</a></>
                    ) : ` · ${place.photo.licenseName}`}
                  </span>
                )}
              </div>
            )}
            <a
              className="text-action map-action"
              href={place?.openStreetMapUrl || `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${stop.name}, ${destination}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${place ? "View" : "Search for"} ${stop.name} in OpenStreetMap`}
            >
              {place ? "View on map" : "Search map"} <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="stop-controls" aria-label={`Actions for ${stop.name}`}>
            <button className="icon-button" onClick={() => onMoveAction(-1)} disabled={index === 0} type="button" aria-label={`Move ${stop.name} up`} title="Move up">↑</button>
            <button className="icon-button" onClick={() => onMoveAction(1)} disabled={index === count - 1} type="button" aria-label={`Move ${stop.name} down`} title="Move down">↓</button>
            <button className="icon-button remove-button" onClick={onRemoveAction} disabled={count <= 1} type="button" aria-label={`Remove ${stop.name}`} title={count <= 1 ? "A day needs at least one stop" : "Remove stop"}>×</button>
          </div>
        </div>
      </div>
    </article>
  );
}
