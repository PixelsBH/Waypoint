import type { ErrorKind } from "@/types/app";

type ErrorStateProps = {
  kind: ErrorKind;
  onRetry: () => void;
};

const messages: Record<ErrorKind, { title: string; description: string }> = {
  parse: {
    title: "We couldn’t read that response.",
    description: "The server returned data in an unexpected format. Your trip hasn’t been changed; try again.",
  },
  shape: {
    title: "That itinerary didn’t fit the expected shape.",
    description: "We checked the response before rendering it and found missing or invalid trip details. Try again.",
  },
  empty: {
    title: "No itinerary came back.",
    description: "Try adding a destination and rough trip length so we have enough to plan around.",
  },
  network: {
    title: "We couldn’t reach Waypoint.",
    description: "Check your connection and give it another try. Your prompt is still here.",
  },
  timeout: {
    title: "This is taking longer than expected.",
    description: "The request was stopped after 45 seconds. Try a shorter trip request or come back in a moment.",
  },
  rate_limit: {
    title: "A quick pause before the next route.",
    description: "This demo has a small request limit. Wait a minute, then try again.",
  },
  configuration: {
    title: "Waypoint needs an AI provider key.",
    description: "Add GOOGLE_GENERATIVE_AI_API_KEY or GROQ_API_KEY to .env.local on the server, then restart the app.",
  },
  input_too_long: {
    title: "That’s a lot to fit on the map.",
    description: "Keep your request under 2,000 characters and focus on the details that matter most.",
  },
  generation: {
    title: "We couldn’t build a reliable itinerary.",
    description: "The model response may have been incomplete, or the provider may be unavailable. Try again with a simpler request.",
  },
};

export function ErrorState({ kind, onRetry }: ErrorStateProps) {
  const message = messages[kind];
  const retryable = kind !== "configuration" && kind !== "input_too_long";

  return (
    <section className="error-state" role="alert">
      <div className="error-symbol" aria-hidden="true">!</div>
      <div className="error-copy">
        <p className="eyebrow">A SMALL DETOUR</p>
        <h2>{message.title}</h2>
        <p>{message.description}</p>
        {retryable && <button className="button button-outline" onClick={onRetry} type="button">Try again <span aria-hidden="true">↗</span></button>}
      </div>
    </section>
  );
}
