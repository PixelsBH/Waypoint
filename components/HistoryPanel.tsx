"use client";

import { useState } from "react";
import { diffTrips } from "@/lib/diffTrips";
import type { EditableStopField, Snapshot, TripWithIds } from "@/types/trip";

type HistoryPanelProps = {
  current: TripWithIds;
  history: Snapshot[];
  onRestore: (data: TripWithIds) => void;
  onRestoreField: (stopId: string, field: EditableStopField, value: unknown) => void;
};

function formatValue(value: unknown) {
  if (value === undefined || value === null || value === "") return "not set";
  return typeof value === "string" ? `“${value}”` : String(value);
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(timestamp);
}

export function HistoryPanel({ current, history, onRestore, onRestoreField }: HistoryPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = history.find((snapshot) => snapshot.id === selectedId) ?? history.at(-2) ?? history[0];

  if (history.length < 2) {
    return (
      <section className="history-panel history-empty">
        <div className="history-heading">
          <div><p className="eyebrow">YOUR WAYPOINTS</p><h2>Trip history</h2></div>
          <span className="history-count">01 version</span>
        </div>
        <p className="subtle-copy">Your edits will be saved here as you shape this itinerary.</p>
      </section>
    );
  }

  const difference = selected ? diffTrips(current, selected.data) : null;
  const hasChanges = Boolean(difference && (
    difference.fieldChanges.length || difference.moves.length || difference.added.length || difference.removed.length
  ));

  return (
    <section className="history-panel">
      <div className="history-heading">
        <div><p className="eyebrow">A CHECKPOINT TO RETURN TO</p><h2>Trip history</h2></div>
        <span className="history-count">{history.length} versions</span>
      </div>
      <div className="history-layout">
        <div className="history-list" aria-label="Saved itinerary versions">
          {[...history].reverse().map((snapshot, index) => (
            <button
              key={snapshot.id}
              className={`history-version${selected?.id === snapshot.id ? " is-selected" : ""}`}
              onClick={() => setSelectedId(snapshot.id)}
              type="button"
              aria-pressed={selected?.id === snapshot.id}
            >
              <span className="version-dot" />
              <span className="version-copy"><strong>{index === 0 ? "Current version" : snapshot.label}</strong><small>{formatTime(snapshot.timestamp)}</small></span>
            </button>
          ))}
        </div>

        {selected && difference && (
          <div className="history-diff">
            <div className="history-diff-heading">
              <div>
                <p className="eyebrow">COMPARE WITH CURRENT</p>
                <h3>{selected.label}</h3>
              </div>
              <button className="button button-outline button-small" onClick={() => onRestore(selected.data)} type="button">Restore version</button>
            </div>
            {!hasChanges ? (
              <p className="subtle-copy diff-empty">This version already matches your current itinerary.</p>
            ) : (
              <ul className="change-list">
                {difference.fieldChanges.map((change) => {
                  const stop = selected.data.days.flatMap((day) => day.stops).find((item) => item.id === change.stopId)
                    ?? current.days.flatMap((day) => day.stops).find((item) => item.id === change.stopId);
                  return (
                    <li className="change-item" key={`${change.stopId}-${change.field}`}>
                      <span className="change-description"><strong>{stop?.name ?? "Stop"}</strong> · {change.field}: {formatValue(change.from)} <span aria-hidden="true">→</span> {formatValue(change.to)}</span>
                      <button className="text-action" onClick={() => onRestoreField(change.stopId, change.field, change.to)} type="button">Revert field</button>
                    </li>
                  );
                })}
                {difference.moves.map((move) => (
                  <li className="change-item change-note" key={`${move.stopId}-move`}>
                    <span>Stop moved from day {move.from[0] + 1}, place {move.from[1] + 1} to day {move.to[0] + 1}, place {move.to[1] + 1}.</span>
                  </li>
                ))}
                {difference.added.map((id) => <li className="change-item change-note" key={`${id}-added`}>A stop was added in the current version.</li>)}
                {difference.removed.map((id) => <li className="change-item change-note" key={`${id}-removed`}>A stop from this version was removed later.</li>)}
              </ul>
            )}
          </div>
        )}
      </div>
      <p className="history-footnote">History is kept in this browser session only.</p>
    </section>
  );
}
