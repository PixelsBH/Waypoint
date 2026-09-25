import type { Snapshot, TripWithIds } from "@/types/trip";

const HISTORY_LIMIT = 40;

export function createSnapshot(data: TripWithIds, label: string): Snapshot {
  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    label,
    data,
  };
}

export function appendSnapshot(history: Snapshot[], snapshot: Snapshot) {
  return [...history, snapshot].slice(-HISTORY_LIMIT);
}
