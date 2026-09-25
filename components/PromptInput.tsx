"use client";

import type { FormEvent } from "react";

type PromptInputProps = {
  value: string;
  onChangeAction: (value: string) => void;
  onSubmitAction: () => void;
  isLoading: boolean;
  hasGenerated: boolean;
  onCancelAction: () => void;
};

export function PromptInput({ value, onChangeAction, onSubmitAction, isLoading, hasGenerated, onCancelAction }: PromptInputProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;
    onSubmitAction();
  }

  return (
    <form className="prompt-card" onSubmit={handleSubmit}>
      <div className="prompt-card-heading">
        <h2>Where would you like to go?</h2>
      </div>

      <label className="visually-hidden" htmlFor="trip-prompt">Describe your trip</label>
      <textarea
        id="trip-prompt"
        value={value}
        disabled={isLoading}
        onChange={(event) => onChangeAction(event.target.value)}
        placeholder="Describe where you want to go, how long you have, and what you enjoy…"
        maxLength={2_000}
        rows={3}
        aria-describedby="prompt-hint prompt-count"
      />
      <div className="prompt-meta">
        <span id="prompt-hint">The more you share, the more personal your itinerary feels.</span>
        <span id="prompt-count">{value.length}/2,000</span>
      </div>

      <div className="prompt-actions">
        <p className="privacy-note"><span className="privacy-dot" /> Your prompt is sent to the AI provider from our server.</p>
        <div className="submit-actions">
          {isLoading && <button className="button button-quiet" onClick={onCancelAction} type="button">Cancel</button>}
          <button className="button button-primary" disabled={isLoading || !value.trim()} type="submit">
            {isLoading ? "Generating…" : hasGenerated ? "Update trip" : "Plan my trip"}
            {!isLoading && <span aria-hidden="true">↗</span>}
          </button>
        </div>
      </div>
    </form>
  );
}
