"use client";

import type { FormEvent } from "react";

type PromptInputProps = {
  value: string;
  onChangeAction: (value: string) => void;
  onSubmitAction: (input?: string) => void;
  isLoading: boolean;
  hasGenerated: boolean;
  onCancelAction: () => void;
};

const EXAMPLE_PROMPTS = [
  "5 slow days in Lisbon with old cafés and viewpoints",
  "A long weekend in Kyoto for food and temples",
  "3 days in New York, first visit, walkable days",
];

export function PromptInput({ value, onChangeAction, onSubmitAction, isLoading, hasGenerated, onCancelAction }: PromptInputProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;
    onSubmitAction();
  }

  return (
    <form className="prompt-card" onSubmit={handleSubmit}>
      <label className="prompt-label" htmlFor="trip-prompt">Where would you like to go?</label>
      <textarea
        id="trip-prompt"
        value={value}
        disabled={isLoading}
        onChange={(event) => onChangeAction(event.target.value)}
        placeholder="Singapore, 5 days — hawker food, cool mornings, one beach day…"
        maxLength={2_000}
        rows={4}
        aria-describedby="prompt-hint prompt-count"
      />
      <div className="prompt-meta">
        <span id="prompt-hint">Destination, trip length, pace and interests — the more you share, the more personal it feels.</span>
        <span id="prompt-count">{value.length.toLocaleString()}/2,000</span>
      </div>

      <div className="prompt-examples" aria-label="Example trip ideas">
        {EXAMPLE_PROMPTS.map((example) => (
          <button
            key={example}
            className="prompt-chip"
            type="button"
            disabled={isLoading}
            onClick={() => {
              onChangeAction(example);
              onSubmitAction(example);
            }}
          >
            {example}
          </button>
        ))}
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
