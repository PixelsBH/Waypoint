# Waypoint — AI Trip Planner

Waypoint turns a free-form travel request into an interactive, day-by-day itinerary. It is a planning tool, not a chatbot: model output is validated structured data, then rendered as days and editable stop cards.

## Run locally

Requirements: Node.js 20.9 or newer and npm (Next.js 16 requirement).

1. Install dependencies:

   ```bash
   npm install
   ```

2. If you do not already have a `.env.local`, create it from the template and add at least one server-side provider key. Do not overwrite an existing `.env.local` that already contains your key:

   ```bash
   cp .env.example .env.local
   ```

   Example values:

   ```dotenv
   GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key
   # Optional fallback provider:
   GROQ_API_KEY=your_groq_key
   ```

3. Start the app:

   ```bash
   npm start
   ```

   Open [http://localhost:3000](http://localhost:3000). `npm start` runs the Next.js development server so the requested `npm install && npm start` workflow does not require a separate build step. For a production build, run `npm run build && npm run start:prod`.

Provider keys are read only by the Next.js route handler. Do not rename them to `NEXT_PUBLIC_*` or commit `.env.local`. If neither key is configured, the UI will show a setup error rather than crash.

## Use it

Describe a destination, trip length, pace, and interests in the prompt box. Choose **Plan my trip** to create an itinerary. Open day tabs to explore the route, expand stops for details, move stops with the arrow controls, or remove a stop. Waypoint looks up each suggested place, adds matching coordinates and an available Commons photo to its stop details, and plots located stops on an OpenStreetMap map. Each day has between one and five stops. Place names are kept separate from meal/activity context, which appears in the stop description. Each edit creates a session history checkpoint; select an earlier version to compare it with the current plan, restore the whole version, or revert an individual changed field.

The provider response is validated against a Zod itinerary schema before it leaves the backend and checked again before it enters React state. Provider or validation failures return an explicit error state with a retry path. The browser aborts requests after 45 seconds, and a request ID guard prevents an older response from replacing a newer one.

## Environment variables

| Variable | Required | Purpose |
|---|---:|---|
| `GOOGLE_GENERATIVE_AI_API_KEY` | One provider key required | Primary Gemini Flash provider |
| `GROQ_API_KEY` | Optional | Fallback provider, GPT-OSS 120B on Groq |
| `NOMINATIM_URL` | Optional | Geocoder base URL; defaults to the public OpenStreetMap Nominatim service |
| `NEXT_PUBLIC_OSM_TILE_URL` | Optional | Leaflet tile template; defaults to OpenStreetMap's standard raster tiles |

The backend uses the Vercel AI SDK's structured `Output.object()` API with the shared Zod schema. It tries configured providers in order (Google, then Groq); if the first provider fails, it attempts the next configured provider. AI provider keys never enter the client bundle. Trip prompts are forwarded to the configured AI provider for generation; avoid entering sensitive personal information.

### Free map and place lookup

The map uses Leaflet with OpenStreetMap tiles, and needs no map API key or payment method. Place coordinates come from the public [Nominatim service](https://nominatim.openstreetmap.org/); preview photos are searched on [Wikimedia Commons](https://commons.wikimedia.org/), and only images with a recognized reusable license are displayed. Photo creators, licenses, and source links are shown when available.

Nominatim is a community service, not an unlimited geocoding API. This app queues requests at no more than one per second, caches results in server memory, and shows this restriction and the [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/) in the itinerary. Its limits apply to the whole website, not each visitor, and its public service has no availability guarantee; use a self-hosted or other geocoder if the project outgrows this small-assignment use. OSM tiles are also best-effort and require visible OpenStreetMap attribution, shown on the map. Both service URLs can be changed through the optional environment variables above.

## Checks

```bash
npm run typecheck
npm test
npm run build
```

The in-memory rate limiter allows 10 requests per client key per minute. It is intentionally a lightweight demo safeguard, not a distributed production limit: serverless instances do not share memory, and forwarded client IP headers must be trusted only when set by the hosting platform.

## Known limitations

- Trip history is kept in React memory for the current browser session; it is not persisted across reloads or devices.
- The rate limiter is per warm server instance and is not shared across scaled instances.
- Provider output and geocoder matches can be inaccurate. Nominatim may match a similarly named place, and Commons may have no suitably licensed photo. Verify pins, opening hours, routes, prices, accessibility, and reservations independently before traveling.
- There is no authentication, database, or distributed cache. The geocoder's in-memory queue/cache is per server instance, so a scaled deployment would need shared rate limiting to keep within the public service's site-wide limit.
- Drag-and-drop, streaming, and persistent session saving were intentionally left out in favor of reliable core behavior and clear failure states.

## Why Waypoint?

A waypoint is both a stop along a journey and a checkpoint you can return to. That describes the itinerary itself and the history/revert interaction.
