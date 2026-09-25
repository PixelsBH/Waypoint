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

Describe a destination, trip length, pace, and interests in the prompt box. Choose **Plan my trip** to create an itinerary. Open day tabs to explore the route, expand stops for details, move stops with the arrow controls, or remove a stop. A day always retains at least one stop. Each edit creates a session history checkpoint; select an earlier version to compare it with the current plan, restore the whole version, or revert an individual changed field.

The provider response is validated against a Zod itinerary schema before it leaves the backend and checked again before it enters React state. Provider or validation failures return an explicit error state with a retry path. The browser aborts requests after 45 seconds, and a request ID guard prevents an older response from replacing a newer one.

## Environment variables

| Variable | Required | Purpose |
|---|---:|---|
| `GOOGLE_GENERATIVE_AI_API_KEY` | One provider key required | Primary Gemini Flash provider |
| `GROQ_API_KEY` | Optional | Fallback provider, GPT-OSS 120B on Groq |

The backend uses the Vercel AI SDK's structured `Output.object()` API with the shared Zod schema. It tries configured providers in order (Google, then Groq); if the first provider fails, it attempts the next configured provider. API keys never enter the client bundle. Trip prompts are forwarded to the configured AI provider for generation; avoid entering sensitive personal information.

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
- Provider output and trip suggestions can be inaccurate. Verify opening hours, routes, prices, accessibility, and reservations independently before traveling.
- There is no authentication, database, distributed cache, or request deduplication. Provider rate limits and latency remain outside the app's control.
- Drag-and-drop, streaming, and persistent session saving were intentionally left out in favor of reliable core behavior and clear failure states.

## AI tools and original work

A Zed coding assistant (GPT-6 Luna) was used to help scaffold the implementation, review architecture, and draft code and documentation. The project-specific decisions and final behavior should be reviewed and understood by the candidate before submission; no claim is made that generated code was independently authored line by line.

## Time spent

**Replace this with your actual focused time before submitting.** The plan's estimate is not a substitute for recording the time you really spent.

## Why Waypoint?

A waypoint is both a stop along a journey and a checkpoint you can return to. That describes the itinerary itself and the history/revert interaction.
