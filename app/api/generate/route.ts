import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { buildPrompt } from "@/lib/buildPrompt";
import { logEvent } from "@/lib/logger";
import { InMemoryRateLimiter } from "@/lib/rateLimiter";
import { TripItinerarySchema, type TripItinerary } from "@/types/trip";

export const maxDuration = 60;

const rateLimiter = new InMemoryRateLimiter(10, 60_000);
const MAX_INPUT_LENGTH = 2_000;

type ProviderAttempt = {
  name: string;
  run: () => Promise<{ output: TripItinerary | undefined }>;
};

function errorName(error: unknown) {
  return error instanceof Error ? error.name : "UnknownError";
}

function safeErrorDetails(error: unknown): Record<string, string | number | boolean> {
  if (!error || typeof error !== "object") return {};

  const details: Record<string, string | number | boolean> = {};

  const addErrorFields = (source: object, prefix = "") => {
    const key = (field: string) => `${prefix}${prefix ? field[0].toUpperCase() + field.slice(1) : field}`;
    if ("statusCode" in source && typeof source.statusCode === "number") {
      details[key("statusCode")] = source.statusCode;
    }
    if ("isRetryable" in source && typeof source.isRetryable === "boolean") {
      details[key("isRetryable")] = source.isRetryable;
    }
    if ("code" in source && typeof source.code === "string") {
      details[key("code")] = source.code;
    }
    if ("cause" in source && source.cause instanceof Error) {
      details[key("causeName")] = source.cause.name;
    }
    if ("data" in source && source.data && typeof source.data === "object" && "error" in source.data) {
      const providerError = source.data.error;
      if (providerError && typeof providerError === "object") {
        if ("type" in providerError && typeof providerError.type === "string") {
          details.providerErrorType = providerError.type;
        }
        if ("message" in providerError && typeof providerError.message === "string") {
          details.providerErrorMessage = providerError.message.slice(0, 240);
        }
      }
    }
  };

  addErrorFields(error);
  if ("lastError" in error && error.lastError && typeof error.lastError === "object") {
    details.lastErrorName = errorName(error.lastError);
    addErrorFields(error.lastError, "lastError");
  }
  if ("reason" in error && typeof error.reason === "string") {
    details.retryReason = error.reason;
  }
  if ("errors" in error && Array.isArray(error.errors)) {
    details.retryCount = error.errors.length;
  }
  return details;
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const userInput =
    body && typeof body === "object" && "prompt" in body && typeof body.prompt === "string"
      ? body.prompt.trim()
      : "";

  if (!userInput) {
    return Response.json({ ok: false, error: "empty_input" }, { status: 400 });
  }
  if (userInput.length > MAX_INPUT_LENGTH) {
    return Response.json({ ok: false, error: "input_too_long" }, { status: 413 });
  }

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientKey = forwardedFor || request.headers.get("x-real-ip") || "local";
  if (!(await rateLimiter.check(clientKey))) {
    logEvent("generation.rate_limited");
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const attempts: ProviderAttempt[] = [];
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    attempts.push({
      name: "google",
      run: () =>
        generateText({
          model: google("gemini-3.5-flash"),
          output: Output.object({ schema: TripItinerarySchema }),
          prompt: buildPrompt(userInput),
        }),
    });
  }
  if (process.env.GROQ_API_KEY) {
    attempts.push({
      name: "groq",
      run: () =>
        generateText({
          model: groq("openai/gpt-oss-120b"),
          output: Output.object({ schema: TripItinerarySchema }),
          providerOptions: { groq: { strictJsonSchema: false } },
          prompt: buildPrompt(userInput),
        }),
    });
  }

  if (attempts.length === 0) {
    logEvent("generation.provider_unconfigured");
    return Response.json({ ok: false, error: "provider_unconfigured" }, { status: 503 });
  }

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      const { output } = await attempt.run();
      if (!output || output.days.length === 0 || output.days.some((day) => day.stops.length === 0)) {
        logEvent("generation.empty_result", { provider: attempt.name });
        return Response.json({ ok: false, error: "empty_result" }, { status: 502 });
      }

      const data = {
        ...output,
        days: output.days.map((day) => ({
          ...day,
          id: crypto.randomUUID(),
          stops: day.stops.map((stop) => ({ ...stop, id: crypto.randomUUID() })),
        })),
      };

      logEvent("generation.succeeded", {
        provider: attempt.name,
        durationMs: Date.now() - startedAt,
        dayCount: data.days.length,
      });
      return Response.json({ ok: true, data });
    } catch (error) {
      lastError = error;
      logEvent("generation.provider_failed", {
        provider: attempt.name,
        errorName: errorName(error),
        ...safeErrorDetails(error),
      });
    }
  }

  logEvent("generation.failed", {
    durationMs: Date.now() - startedAt,
    errorName: errorName(lastError),
  });
  return Response.json({ ok: false, error: "generation_failed" }, { status: 502 });
}
