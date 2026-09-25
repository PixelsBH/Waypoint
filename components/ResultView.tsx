import type { AppState } from "@/types/app";
import type { EditableStopField, Snapshot, TripWithIds } from "@/types/trip";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { TripItineraryView } from "@/components/TripItineraryView";

type ResultViewProps = {
  state: AppState;
  history: Snapshot[];
  onRetry: () => void;
  onMoveStop: (dayId: string, stopId: string, direction: -1 | 1) => void;
  onRemoveStop: (dayId: string, stopId: string) => void;
  onRestore: (data: TripWithIds) => void;
  onRestoreField: (stopId: string, field: EditableStopField, value: unknown) => void;
};

export function ResultView(props: ResultViewProps) {
  const { state } = props;
  if (state.status === "idle") return <EmptyState />;
  if (state.status === "loading") return <LoadingState />;
  if (state.status === "error") return <ErrorState kind={state.kind} onRetry={props.onRetry} />;

  return (
    <TripItineraryView
      trip={state.data}
      history={props.history}
      onMoveStop={props.onMoveStop}
      onRemoveStop={props.onRemoveStop}
      onRestore={props.onRestore}
      onRestoreField={props.onRestoreField}
    />
  );
}
