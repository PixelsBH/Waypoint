"use client";

import { useRef, useState } from "react";
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
        <div className="header-note"><span className="secure-mark" aria-hidden="true">✳</span> Thoughtful trips, one waypoint at a time</div>
        <a className="header-link" href="#how-it-works">How it works <span aria-hidden="true">↘</span></a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span className="hero-sparkle" aria-hidden="true">✳</span> YOUR PERSONAL TRIP PLANNER</p>
          <h1>Less planning.<br /><em>More being there.</em></h1>
          <p className="hero-description">A good trip is a collection of small, memorable stops. Tell us what you have in mind — we’ll help connect them.</p>
        </div>
        <div className="hero-aside" aria-label="Waypoint trip-planning values">
          <span className="aside-line" />
          <p>Curious by nature.<br />Considered by design.</p>
          <span className="aside-coordinate">37° 33′ 59.4″ N<br />126° 58′ 41.2″ E</span>
        </div>
        <div className="hero-orbit orbit-large" aria-hidden="true" />
        <div className="hero-orbit orbit-small" aria-hidden="true" />
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
          <p className="after-prompt-note"><span aria-hidden="true">↳</span> Your plan is a starting point, not a schedule you have to follow.</p>
        </div>
        <div className="result-column" aria-live="polite">
          <ResultView
            state={appState}
            history={history}
            onRetry={() => void handleGenerate(latestPrompt.current)}
            onMoveStop={moveCurrentStop}
            onRemoveStop={removeCurrentStop}
            onRestore={(data) => commitTrip(data, "Restored an earlier version")}
            onRestoreField={restoreField}
          />
        </div>
      </section>

      <section className="how-section" id="how-it-works">
        <div className="how-heading"><p className="eyebrow">A BETTER WAY TO FIND YOUR WAY</p><h2>Good plans leave room for the unexpected.</h2></div>
        <div className="how-steps">
          <article><span>01</span><h3>Start with a feeling</h3><p>Share the destination, your pace, and what makes a trip feel like yours.</p></article>
          <article><span>02</span><h3>Find your rhythm</h3><p>Explore your days as a route of real stops, not a wall of generated text.</p></article>
          <article><span>03</span><h3>Make it your own</h3><p>Move stops around, remove what doesn’t fit, and revisit earlier versions.</p></article>
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
