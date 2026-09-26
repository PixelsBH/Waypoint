import { z } from "zod";
import { InMemoryRateLimiter } from "@/lib/rateLimiter";
import { MAX_STOPS_PER_ENRICH_REQUEST } from "@/types/place";
import type { PlaceCoordinates, PlacePhoto, PlacePreview } from "@/types/place";

export const maxDuration = 60;

const NOMINATIM_REQUEST_INTERVAL_MS = 1_100;
const nominatimLimiter = new InMemoryRateLimiter(5, 60_000);
const requestSchema = z.object({
  destination: z.string().trim().min(1).max(200),
  stops: z.array(z.object({
    id: z.string().trim().min(1).max(100),
    name: z.string().trim().min(1).max(200),
  })).min(1).max(MAX_STOPS_PER_ENRICH_REQUEST),
});
const nominatimResponseSchema = z.array(z.object({
  lat: z.string(),
  lon: z.string(),
  display_name: z.string().optional(),
}).passthrough());

type GeocodedPlace = {
  coordinates: PlaceCoordinates;
  address?: string;
  openStreetMapUrl: string;
};

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const geocodeCache = new Map<string, CacheEntry<GeocodedPlace | null>>();
const geocodeInFlight = new Map<string, Promise<GeocodedPlace | null>>();
const photoCache = new Map<string, CacheEntry<PlacePhoto | null>>();
let geocodeQueue = Promise.resolve();
let nextGeocodeAt = 0;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asHttpsUrl(value: unknown) {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function metadataText(metadata: unknown, key: string) {
  if (!isRecord(metadata) || !isRecord(metadata[key])) return "";
  const value = metadata[key].value;
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function isReusableLicense(name: string) {
  return /^(?:CC0(?:\s|$)|Public domain|PD(?:\s|[-:]|$)|CC BY(?:-SA)?(?:\s|$))/i.test(name);
}

function openStreetMapUrl(coordinates: PlaceCoordinates) {
  const { lat, lng } = coordinates;
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
}

async function lookupNominatim(query: string): Promise<GeocodedPlace | null> {
  const serviceUrl = process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org";
  const cacheKey = `${serviceUrl}|${query.toLocaleLowerCase()}`;
  const cached = geocodeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const inFlight = geocodeInFlight.get(cacheKey);
  if (inFlight) return inFlight;

  const request = geocodeQueue.then(async () => {
    const waitMs = Math.max(0, nextGeocodeAt - Date.now());
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
    nextGeocodeAt = Date.now() + NOMINATIM_REQUEST_INTERVAL_MS;

    try {
      const url = new URL("/search", serviceUrl);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("limit", "1");
      url.searchParams.set("q", query);
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "WaypointTripPlanner/1.0",
        },
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) return null;

      const parsed = nominatimResponseSchema.safeParse(await response.json());
      const result = parsed.success ? parsed.data[0] : undefined;
      if (!result) return null;

      const coordinates = { lat: Number(result.lat), lng: Number(result.lon) };
      if (!Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lng)) return null;
      if (Math.abs(coordinates.lat) > 90 || Math.abs(coordinates.lng) > 180) return null;

      return {
        coordinates,
        address: result.display_name,
        openStreetMapUrl: openStreetMapUrl(coordinates),
      };
    } catch {
      return null;
    }
  });

  geocodeQueue = request.then(() => undefined, () => undefined);
  geocodeInFlight.set(cacheKey, request);
  try {
    const value = await request;
    geocodeCache.set(cacheKey, {
      value,
      expiresAt: Date.now() + (value ? 30 : 5) * 24 * 60 * 60 * 1_000,
    });
    return value;
  } finally {
    geocodeInFlight.delete(cacheKey);
  }
}

async function findCommonsPhoto(query: string): Promise<PlacePhoto | undefined> {
  const cacheKey = query.toLocaleLowerCase();
  const cached = photoCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value ?? undefined;

  try {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("generator", "search");
    url.searchParams.set("gsrsearch", query);
    url.searchParams.set("gsrnamespace", "6");
    url.searchParams.set("gsrlimit", "3");
    url.searchParams.set("prop", "imageinfo");
    url.searchParams.set("iiprop", "url|extmetadata");
    url.searchParams.set("iiurlwidth", "720");
    url.searchParams.set("format", "json");

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "WaypointTripPlanner/1.0",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return undefined;

    const data: unknown = await response.json();
    const pages = isRecord(data) && isRecord(data.query) && isRecord(data.query.pages)
      ? Object.values(data.query.pages)
      : [];

    for (const page of pages) {
      if (!isRecord(page) || !Array.isArray(page.imageinfo)) continue;
      const image = page.imageinfo[0];
      if (!isRecord(image)) continue;

      const imageUrl = asHttpsUrl(image.thumburl);
      const sourceUrl = asHttpsUrl(image.descriptionurl);
      if (!imageUrl || !sourceUrl) continue;

      const licenseName = metadataText(image.extmetadata, "LicenseShortName");
      if (!licenseName || !isReusableLicense(licenseName)) continue;

      const creator = metadataText(image.extmetadata, "Artist") || "Wikimedia Commons contributor";
      const licenseUrl = asHttpsUrl(metadataText(image.extmetadata, "LicenseUrl"));
      const photo = { url: imageUrl, creator, sourceUrl, licenseName, licenseUrl };
      photoCache.set(cacheKey, { value: photo, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1_000 });
      return photo;
    }

    photoCache.set(cacheKey, { value: null, expiresAt: Date.now() + 24 * 60 * 60 * 1_000 });
  } catch {
    return undefined;
  }

  return undefined;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientKey = forwardedFor || request.headers.get("x-real-ip") || "local";
  if (!(await nominatimLimiter.check(clientKey))) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const uniqueStops = parsed.data.stops.filter((stop, index, stops) =>
    stops.findIndex((candidate) => candidate.id === stop.id) === index,
  );
  const geocoded = await Promise.all(uniqueStops.map(async (stop) => ({
    stop,
    query: `${stop.name}, ${parsed.data.destination}`,
    result: await lookupNominatim(`${stop.name}, ${parsed.data.destination}`),
  })));

  const entries = await Promise.all(geocoded.map(async ({ stop, query, result }) => {
    const place: PlacePreview | null = result
      ? { ...result, photo: await findCommonsPhoto(query) }
      : null;
    return [stop.id, place] as const;
  }));

  return Response.json(
    { ok: true, places: Object.fromEntries(entries) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
