export type ApiErrorKind =
  | "parse"
  | "shape"
  | "empty"
  | "network"
  | "rate_limit"
  | "configuration"
  | "input_too_long"
  | "generation";

export class ApiError extends Error {
  constructor(public readonly kind: ApiErrorKind) {
    super(kind);
    this.name = "ApiError";
  }
}

function errorKind(value: unknown): ApiErrorKind {
  if (!value || typeof value !== "object" || !("error" in value)) return "generation";

  switch (value.error) {
    case "empty_input":
    case "empty_result":
      return "empty";
    case "rate_limited":
      return "rate_limit";
    case "provider_unconfigured":
      return "configuration";
    case "input_too_long":
      return "input_too_long";
    case "invalid_request":
      return "parse";
    default:
      return "generation";
  }
}

export async function generateTrip(userInput: string, signal: AbortSignal): Promise<unknown> {
  let response: Response;

  try {
    response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: userInput }),
      signal,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new ApiError("network");
  }

  let payload: unknown;
  try {
    payload = JSON.parse(await response.text());
  } catch {
    throw new ApiError("parse");
  }

  if (!response.ok) throw new ApiError(errorKind(payload));
  if (!payload || typeof payload !== "object" || !("ok" in payload) || payload.ok !== true || !("data" in payload)) {
    throw new ApiError("shape");
  }

  return payload.data;
}
