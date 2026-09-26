import { TripMap } from "@/components/TripMap";
import type { TripMapStop } from "@/types/place";

type TripMapPanelProps = {
  stops: TripMapStop[];
  loadingCount: number;
};

export function TripMapPanel({ stops, loadingCount }: TripMapPanelProps) {
  return (
    <section className="side-card trip-map-panel" aria-label="Trip map of located stops">
      <div className="side-card-heading">
        <div>
          <p className="eyebrow">STOP LOCATIONS</p>
          <h2>Trip map</h2>
        </div>
        <span className="count-pill">{stops.length} {stops.length === 1 ? "pin" : "pins"}</span>
      </div>
      {loadingCount > 0 && (
        <p className="side-card-status" role="status">
          <span className="place-loading-spinner" aria-hidden="true" />
          Locating {loadingCount} {loadingCount === 1 ? "stop" : "stops"}…
        </p>
      )}
      {stops.length > 0 ? (
        <div className="trip-map-frame">
          <TripMap stops={stops} compact />
        </div>
      ) : loadingCount === 0 ? (
        <p className="subtle-copy side-card-empty">Pins land here as each stop is located. Generate a trip above to begin.</p>
      ) : null}
    </section>
  );
}
