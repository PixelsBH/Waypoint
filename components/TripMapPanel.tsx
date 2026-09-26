import { TripMap } from "@/components/TripMap";
import type { TripMapStop } from "@/types/place";

type TripMapPanelProps = {
  stops: TripMapStop[];
  loadingCount: number;
};

export function TripMapPanel({ stops, loadingCount }: TripMapPanelProps) {
  return (
    <section className="trip-map-panel" aria-label="Trip map of located stops">
      <div className="trip-map-heading">
        <div>
          <p className="eyebrow">STOP LOCATIONS</p>
          <h2>Trip map</h2>
        </div>
        <span className="trip-map-count">{stops.length} {stops.length === 1 ? "pin" : "pins"}</span>
      </div>
      {loadingCount > 0 && (
        <p className="trip-map-loading" role="status">
          <span className="place-loading-spinner" aria-hidden="true" />
          Fetching locations for {loadingCount} {loadingCount === 1 ? "stop" : "stops"}…
        </p>
      )}
      {stops.length > 0 ? (
        <div className="trip-map-frame">
          <TripMap stops={stops} compact />
        </div>
      ) : loadingCount === 0 ? (
        <p className="subtle-copy trip-map-empty">Stop pins will appear here as their details are found.</p>
      ) : null}
    </section>
  );
}
