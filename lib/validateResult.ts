import { TripWithIdsSchema } from "@/types/trip";

export function validateResult(value: unknown) {
  return TripWithIdsSchema.safeParse(value);
}
