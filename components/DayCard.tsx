import type { DayWithId } from "@/types/trip";
import { StopCard } from "@/components/StopCard";

type DayCardProps = {
  day: DayWithId;
  onMoveStop: (dayId: string, stopId: string, direction: -1 | 1) => void;
  onRemoveStop: (dayId: string, stopId: string) => void;
};

export function DayCard({ day, onMoveStop, onRemoveStop }: DayCardProps) {
  return (
    <section className="day-panel" aria-labelledby={`day-title-${day.id}`}>
      <div className="day-panel-heading">
        <div>
          <p className="eyebrow">DAY {String(day.dayNumber).padStart(2, "0")} <span className="eyebrow-divider">/</span> {day.stops.length} WAYPOINT{day.stops.length === 1 ? "" : "S"}</p>
          <h2 id={`day-title-${day.id}`}>{day.title || `A day in ${day.dayNumber === 1 ? "the city" : "the neighborhood"}`}</h2>
        </div>
        <span className="day-marker" aria-hidden="true">{String(day.dayNumber).padStart(2, "0")}</span>
      </div>

      <div className="stop-list">
        {day.stops.map((stop, index) => (
          <StopCard
            key={stop.id}
            stop={stop}
            index={index}
            count={day.stops.length}
            onMove={(direction) => onMoveStop(day.id, stop.id, direction)}
            onRemove={() => onRemoveStop(day.id, stop.id)}
          />
        ))}
      </div>
      <p className="reorder-hint"><span aria-hidden="true">↕</span> Use the arrows to make this route your own.</p>
    </section>
  );
}
