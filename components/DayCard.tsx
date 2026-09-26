import type { DayWithId } from "@/types/trip";
import type { PlacePreview } from "@/types/place";
import { StopCard } from "@/components/StopCard";

type DayCardProps = {
  day: DayWithId;
  destination: string;
  placesByStop: Record<string, PlacePreview | null>;
  loadingByStop: Record<string, boolean>;
  onMoveStop: (dayId: string, stopId: string, direction: -1 | 1) => void;
  onRemoveStop: (dayId: string, stopId: string) => void;
};

export function DayCard({ day, destination, placesByStop, loadingByStop, onMoveStop, onRemoveStop }: DayCardProps) {
  return (
    <section className="day-panel" aria-labelledby={`day-title-${day.id}`}>
      <div className="day-panel-heading">
        <div>
          <p className="eyebrow">DAY {String(day.dayNumber).padStart(2, "0")} <span className="eyebrow-divider">/</span> {day.stops.length} WAYPOINT{day.stops.length === 1 ? "" : "S"}</p>
          <h2 id={`day-title-${day.id}`}>{day.title || `A day in ${day.dayNumber === 1 ? "the city" : "the neighborhood"}`}</h2>
        </div>
      </div>

      <div className="stop-list">
        {day.stops.map((stop, index) => (
          <StopCard
            key={stop.id}
            stop={stop}
            destination={destination}
            place={placesByStop[stop.id] ?? undefined}
            isLoadingPlace={loadingByStop[stop.id] ?? false}
            index={index}
            count={day.stops.length}
            onMoveAction={(direction) => onMoveStop(day.id, stop.id, direction)}
            onRemoveAction={() => onRemoveStop(day.id, stop.id)}
          />
        ))}
      </div>
      <p className="reorder-hint"><span aria-hidden="true">↕</span> Use the arrows to make this route your own.</p>
    </section>
  );
}
