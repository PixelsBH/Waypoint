"use client";

import { useRef, useState } from "react";
import { HistoryPanel } from "@/components/HistoryPanel";
import { PromptInput } from "@/components/PromptInput";
import { ResultView } from "@/components/ResultView";
import { ApiError, generateTrip } from "@/lib/api";
import { applyStopField } from "@/lib/diffTrips";
import { appendSnapshot, createSnapshot } from "@/lib/history";
import { moveStop, removeStop } from "@/lib/itinerary";
import { validateResult } from "@/lib/validateResult";
import type { AppState, ErrorKind } from "@/types/app";
import type { EditableStopField, Snapshot, TripWithIds } from "@/types/trip";

export default function HomePage() {
  const [prompt, setPrompt] = useState("");
  const [appState, setAppState] = useState<AppState>({ status: "idle" });
  const [history, setHistory] = useState<Snapshot[]>([]);
  const requestId = useRef(0);
  const activeController = useRef<AbortController | null>(null);
  const latestPrompt = useRef("");

  async function handleGenerate(input = latestPrompt.current) {
    const userInput = input.trim();
    latestPrompt.current = input;
    if (!userInput) {
      setAppState({ status: "error", kind: "empty" });
      return;
    }

    const id = ++requestId.current;
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 45_000);
    setAppState({ status: "loading" });

    try {
      const raw = await generateTrip(userInput, controller.signal);
      if (id !== requestId.current) return;

      const result = validateResult(raw);
      if (!result.success) {
        setAppState({ status: "error", kind: "shape" });
        return;
      }

      setAppState({ status: "success", data: result.data });
      setHistory((current) => appendSnapshot(current, createSnapshot(result.data, "Generated a new itinerary")));
    } catch (error) {
      if (id !== requestId.current) return;

      let kind: ErrorKind = "generation";
      if (controller.signal.aborted) kind = "timeout";
      else if (error instanceof ApiError) kind = error.kind;
      else if (error instanceof TypeError) kind = "network";
      setAppState({ status: "error", kind });
    } finally {
      window.clearTimeout(timeout);
      if (id === requestId.current) activeController.current = null;
    }
  }

  function cancelGeneration() {
    ++requestId.current;
    activeController.current?.abort();
    activeController.current = null;
    const previous = history.at(-1);
    setAppState(previous ? { status: "success", data: previous.data } : { status: "idle" });
  }

  function commitTrip(data: TripWithIds, label: string) {
    setAppState({ status: "success", data });
    setHistory((current) => appendSnapshot(current, createSnapshot(data, label)));
  }

  function moveCurrentStop(dayId: string, stopId: string, direction: -1 | 1) {
    if (appState.status !== "success") return;
    commitTrip(moveStop(appState.data, dayId, stopId, direction), "Reordered a stop");
  }

  function removeCurrentStop(dayId: string, stopId: string) {
    if (appState.status !== "success") return;
    const next = removeStop(appState.data, dayId, stopId);
    if (next !== appState.data) commitTrip(next, "Removed a stop");
  }

  function restoreField(stopId: string, field: EditableStopField, value: unknown) {
    if (appState.status !== "success") return;
    commitTrip(applyStopField(appState.data, stopId, field, value), `Restored ${field}`);
  }

  function updatePrompt(value: string) {
    setPrompt(value);
    latestPrompt.current = value;
  }

  const isLoading = appState.status === "loading";

  return (
    <main className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Waypoint home">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>waypoint<span className="brand-period">.</span></span>
        </a>
        <div className="header-note"><span className="secure-mark" aria-hidden="true">✳</span> YOUR PERSONAL TRIP PLANNER</div>
        <a className="header-link" href="#how-it-works">How it works <span aria-hidden="true">↘</span></a>
      </header>

      <section className="hero" id="top" aria-label="Waypoint trip planner">
        <div className="hero-copy">
          <h1>Less planning. <em>More being there.</em></h1>
        </div>
      </section>

      <section className="planner-grid" aria-label="Trip planner">
        <div className="planner-column">
          <PromptInput
            value={prompt}
            onChange={updatePrompt}
            onSubmit={() => void handleGenerate(prompt)}
            isLoading={isLoading}
            onCancel={cancelGeneration}
          />
          {history.length > 0 && (
            <HistoryPanel
              current={appState.status === "success" ? appState.data : null}
              history={history}
              onRestoreAction={(data) => commitTrip(data, "Restored an earlier version")}
              onRestoreFieldAction={restoreField}
            />
          )}
        </div>
        <div className="result-column" aria-live="polite">
          <ResultView
            state={appState}
            onRetry={() => void handleGenerate(latestPrompt.current)}
            onMoveStop={moveCurrentStop}
            onRemoveStop={removeCurrentStop}
          />
        </div>
      </section>

      <section className="how-section" id="how-it-works">
        <div className="how-heading">
          <div>
            <p className="eyebrow">WHAT YOUR ITINERARY INCLUDES</p>
            <h2>A draft you can inspect and change.</h2>
          </div>
          <p className="how-intro">Suggested places and timings are a starting point. Check opening hours, reservations and transit with local sources before you go.</p>
        </div>
        <div className="how-steps">
          <article><span>PLAN</span><h3>Stops, grouped by day</h3><p>Each day can include suggested times, categories, visit lengths and notes when available.</p></article>
          <article><span>EDIT</span><h3>Change the route</h3><p>Move stops up or down, remove ones that don’t fit, and open a stop to see its details.</p></article>
          <article><span>HISTORY</span><h3>Restore a version</h3><p>Compare earlier edits, restore a full itinerary or revert a changed field. History lasts for this browser session.</p></article>
        </div>
      </section>

      <footer className="site-footer">
        <a className="brand brand-footer" href="#top"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>waypoint<span className="brand-period">.</span></span></a>
        <p>Built for the long way around.</p>
        <span>AI-assisted planning · Always verify details before you go</span>
      </footer>
    </main>
  );
}
