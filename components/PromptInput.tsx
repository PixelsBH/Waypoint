"use client";

import type { FormEvent } from "react";

const examples = [
  "A relaxed 3-day food and architecture weekend in Lisbon",
  "Five days in Kyoto in April with temples, gardens, and great coffee",
  "A family-friendly long weekend in Vancouver without renting a car",
];

type PromptInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  onCancel: () => void;
};

export function PromptInput({ value, onChange, onSubmit, isLoading, onCancel }: PromptInputProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className="prompt-card" onSubmit={handleSubmit}>
      <div className="prompt-card-heading">
        <div>
          <p className="eyebrow">YOUR NEXT ADVENTURE</p>
          <h2>Where would you like to go?</h2>
          <p className="subtle-copy">Share the basics, then we’ll shape them into a day-by-day plan.</p>
        </div>
        <span className="prompt-step">01 <span>/ 02</span></span>
      </div>

      <label className="visually-hidden" htmlFor="trip-prompt">Describe your trip</label>
      <textarea
        id="trip-prompt"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Try: A relaxed 4-day trip to Copenhagen with design museums, bakeries, and time by the water…"
        maxLength={2_000}
        rows={4}
        aria-describedby="prompt-hint prompt-count"
      />
      <div className="prompt-meta">
        <span id="prompt-hint">The more you share, the more personal your itinerary feels.</span>
        <span id="prompt-count">{value.length}/2,000</span>
      </div>

      <div className="example-prompts" aria-label="Example trip prompts">
        {examples.map((example) => (
          <button className="example-chip" key={example} onClick={() => onChange(example)} type="button">
            {example}
          </button>
        ))}
      </div>

      <div className="prompt-actions">
        <p className="privacy-note"><span className="privacy-dot" /> Your prompt is sent to the AI provider from our server.</p>
        <div className="submit-actions">
          {isLoading && <button className="button button-quiet" onClick={onCancel} type="button">Cancel</button>}
          <button className="button button-primary" disabled={!value.trim()} type="submit">
            {isLoading ? "Replace request" : "Plan my trip"}
            <span aria-hidden="true">↗</span>
          </button>
        </div>
      </div>
    </form>
  );
}
