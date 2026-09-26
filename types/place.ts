import { z } from "zod";

export const MAX_STOPS_PER_ENRICH_REQUEST = 30;

export const PlaceCoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const PlacePhotoSchema = z.object({
  url: z.string().url(),
  creator: z.string().trim().min(1),
  sourceUrl: z.string().url(),
  licenseName: z.string().trim().min(1),
  licenseUrl: z.string().url().optional(),
});

export const PlacePreviewSchema = z.object({
  coordinates: PlaceCoordinatesSchema,
  address: z.string().optional(),
  openStreetMapUrl: z.string().url(),
  photo: PlacePhotoSchema.optional(),
});

export const PlacePreviewsByStopSchema = z.record(z.string(), PlacePreviewSchema.nullable());
export const PlaceEnrichmentResponseSchema = z.object({
  ok: z.literal(true),
  places: PlacePreviewsByStopSchema,
});

export type PlaceCoordinates = z.infer<typeof PlaceCoordinatesSchema>;
export type PlacePhoto = z.infer<typeof PlacePhotoSchema>;
export type PlacePreview = z.infer<typeof PlacePreviewSchema>;
export type StopPlaceLookup = {
  query: string;
  place: PlacePreview | null;
};

export type TripMapStop = {
  id: string;
  name: string;
  dayNumber: number;
  stopNumber: number;
  place: PlacePreview;
};
