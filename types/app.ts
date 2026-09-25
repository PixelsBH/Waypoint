import type { TripWithIds } from "@/types/trip";

export type ErrorKind =
  | "parse"
  | "shape"
  | "empty"
  | "network"
  | "timeout"
  | "rate_limit"
  | "configuration"
  | "input_too_long"
  | "generation";

export type AppState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; kind: ErrorKind }
  | { status: "success"; data: TripWithIds };
