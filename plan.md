# Waypoint — AI Trip Planner
### Flam Frontend Internship Assignment

> **This document is meant to be handed to an AI coding assistant with no other context.**
> Section 0 below is the assignment's actual constraints, restated in full — treat them as
> hard requirements, not suggestions. Section 1 explains the project name. Everything after
> that is the architecture decided on for this specific build.

---

## 0. Assignment context (read this first — it's not optional flavor text)

**What's being built:** A React app that takes free-form text input, sends it to an LLM,
and turns the result into an interactive tool. **It must not be a chatbot.** The model must
return structured data (JSON) that the app parses and renders as real interactive
components — printing the model's raw text in a chat box does not satisfy the requirement.

**Hard technical requirements:**
- React with hooks, functional components.
- A free-form text input as the only way data enters the app.
- A real LLM API (any provider).
- **A small backend or serverless function that holds the API key — the key must never
  ship to the browser.** This is explicitly checked.
- No auth required. Deployment is preferred but optional.

**What's actually graded (this should drive where effort goes):**
| Area | Weight |
|---|---|
| React & frontend architecture | 25% |
| AI integration & data handling | 25% |
| Handling bad AI output | 20% |
| UI/UX & product sense | 15% |
| Communication & understanding | 15% |

Roughly 45–70% of the grade is about making unreliable AI output reliable — not about
feature count, and not about infrastructure scale. A clean, solid core beats a pile of
half-working extras.

**Every one of these failure modes needs a visible, explicit UI state — no crashes, no
silent hangs:** malformed JSON, wrong shape (valid JSON, wrong/missing fields), empty
response, slow response, failed request, and a *stale* response (an older, slower request
resolving after a newer one — the newer result must win, never get overwritten).

**Time:** the assignment states ~8 hours as a hard cap and asks candidates to stop and note
what they'd do next if they run out — this is itself part of what's evaluated (scoping
under constraint). This build plan targets ~10–12 focused hours spread across 2 calendar
days (see §13) — comfortable pacing, not a scope explosion. Report actual time spent
honestly in the README regardless of what the plan budgets.

**Deliverables:** public (or shared-access private) GitHub repo with small meaningful
commits; a README covering setup, usage, an honest note on what AI tools were used for,
known limitations, and time spent; a short screen recording; `npm install && npm start`
must just work with no extra steps.

**Interview:** expect to demo the app, walk through the code, review an AI-generated
snippet, fix a bug the interviewers introduce, and add a small feature — live. Don't ship
code you don't understand well enough to explain and extend on the spot.

---

## 1. Project name

**Waypoint.** A waypoint is a stop on a trip — direct fit for the product — and it also
reads naturally as "a checkpoint you can return to," which lines up with the history/revert
feature in §10. Use this framing directly when explaining the name in the README or
interview: it's not just a label, it's describing what the app actually does twice over.

---

## 2. Stack decision (and why)

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15, App Router, TypeScript** | A Route Handler doubles as the required backend-proxy — one repo, one deploy, no second server to configure and host separately. Rendering itself is plain React state either way; Next earns its place on deployment + streaming, not on rendering. |
| Hosting | **Vercel, Hobby (free) tier** | Hobby has no billing at all — no overage charges, hard caps instead, and hitting one just pauses serving until next month rather than generating a bill. An assignment demo's realistic usage is nowhere near those caps. |
| AI calls | **Vercel AI SDK (`ai` package) — `generateObject` / `streamObject`** | Takes a Zod schema directly, sends a structured-output request to the provider, validates the response against the schema, and throws a typed error if it doesn't conform. One schema drives the prompt constraints, the TS types, and the validation. Also provider-agnostic — swapping or adding providers is a one-line change (see §11.1). |
| Schema/validation | **Zod** | `z.infer` for types, `.safeParse()` (never `.parse()`) for validation that returns a result object instead of throwing. |
| LLM provider | **Google Gemini 2.5 Flash** (primary), Groq as automatic fallback | Free tier, fast, good structured-output adherence via `@ai-sdk/google`. Model choice doesn't affect grading — pick for reliability, not brand. |
| Diff/history | **Identity-aware structural diff, plain React state — no backend, no DB** | See §10. Rejected an earlier idea of using Git/JJ as a version-control backend — Git/JJ diff *lines of text*, and this app's core interaction is *reordering structured array items*, which a line diff represents badly. An id-keyed diff expresses "this stop moved" and "this field changed" directly. |

**Real operational note on Vercel Hobby, not a billing one:** the default serverless
function timeout is 10s (configurable up to 60s on the Node runtime). A trip-generation
call can plausibly run longer than 10s. Set `export const maxDuration = 60;` in the route
handler file, or the app will intermittently fail with a timeout that looks like a provider
bug but isn't.

---

## 3. Data schema (design this before writing a single prompt)

```ts
// types/trip.ts
import { z } from "zod";

// No "id" field in the schema the MODEL sees — models don't generate stable unique ids
// reliably. Assign ids (nanoid) server-side right after validation, before the data ever
// reaches React state. IDs are what make React keys, the diff in §10, and any "revert this
// one field" operation possible.

export const StopSchema = z.object({
  name: z.string().min(1),
  time: z.string().optional(),          // "9:00 AM" or "Morning" — keep it a loose string
  description: z.string().optional(),
  category: z.enum(["food", "sight", "activity", "transport", "lodging", "other"]).optional(),
  durationMinutes: z.number().int().positive().optional(),
});

export const DaySchema = z.object({
  dayNumber: z.number().int().positive(),
  title: z.string().optional(),         // e.g. "Arrival & Old Town"
  stops: z.array(StopSchema).min(1),
});

export const TripItinerarySchema = z.object({
  destination: z.string().min(1),
  summary: z.string().optional(),
  days: z.array(DaySchema).min(1),
});

export type TripItinerary = z.infer<typeof TripItinerarySchema>;
export type Day = z.infer<typeof DaySchema>;
export type Stop = z.infer<typeof StopSchema>;

// Client-side augmented types, after id-assignment:
export type StopWithId = Stop & { id: string };
export type DayWithId = Omit<Day, "stops"> & { stops: StopWithId[] };
export type TripWithIds = Omit<TripItinerary, "days"> & { days: DayWithId[] };
```

---

## 4. Prompt design

```ts
function buildPrompt(userInput: string) {
  return `You are a trip-planning data generator. Return ONLY valid JSON, no prose,
no markdown code fences, matching exactly this shape:

{
  "destination": string,
  "summary": string (optional, 1 sentence),
  "days": [
    {
      "dayNumber": number,
      "title": string (optional),
      "stops": [
        { "name": string, "time": string (optional), "description": string (optional),
          "category": "food"|"sight"|"activity"|"transport"|"lodging"|"other" (optional),
          "durationMinutes": number (optional) }
      ]
    }
  ]
}

Trip request: ${userInput}`;
}
```

Enforcement comes from passing `schema: TripItinerarySchema` to `generateObject`, not from
the prose — the SDK builds a native structured-output request for providers that support
it. Test this prompt directly against the provider (a scratch script, not the UI) before
wiring anything up — see a real malformed response before writing the code that has to
handle one.

---

## 5. Backend route (the key-holding proxy — core version)

```ts
// app/api/generate/route.ts
export const maxDuration = 60; // Hobby default is 10s — trip generation can exceed that

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { TripItinerarySchema } from "@/types/trip";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  const { prompt: userInput } = await req.json();

  if (!userInput || typeof userInput !== "string" || !userInput.trim()) {
    return Response.json({ ok: false, error: "empty_input" }, { status: 400 });
  }

  try {
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: TripItinerarySchema,
      prompt: buildPrompt(userInput),
    });

    if (object.days.length === 0) {
      return Response.json({ ok: false, error: "empty_result" }, { status: 502 });
    }

    const withIds = {
      ...object,
      days: object.days.map((d) => ({
        ...d,
        stops: d.stops.map((s) => ({ ...s, id: nanoid() })),
      })),
    };

    return Response.json({ ok: true, data: withIds });
  } catch (err) {
    // generateObject throws when the model's output doesn't validate against the
    // schema, or on a provider/network failure — both land here.
    return Response.json({ ok: false, error: "generation_failed" }, { status: 502 });
  }
}
```

Build this version first and get it fully working before layering in anything from §11.

---

## 6. Client API layer — timeout + stale-response guard

```ts
// lib/api.ts
export async function generateTrip(userInput: string, signal: AbortSignal) {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: userInput }),
    signal,
  });
  if (!res.ok) throw new Error("request_failed");
  const json = await res.json();
  if (!json.ok) throw new Error(json.error ?? "unknown");
  return json.data;
}
```

```ts
// in the component: timeout + stale-request guard
const requestId = useRef(0);

async function handleGenerate(userInput: string) {
  const id = ++requestId.current;
  setStatus({ status: "loading" });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000); // leave room under maxDuration=60

  try {
    const raw = await generateTrip(userInput, controller.signal);
    const parsed = TripItinerarySchema.safeParse(raw);
    if (id !== requestId.current) return; // a newer request has since started
    if (!parsed.success) {
      setStatus({ status: "error", kind: "shape" });
      return;
    }
    setStatus({ status: "success", data: raw });
    pushSnapshot(raw); // see §10
  } catch (e) {
    if (id !== requestId.current) return;
    setStatus({
      status: "error",
      kind: e.name === "AbortError" ? "timeout" : "network",
    });
  } finally {
    clearTimeout(timeout);
  }
}
```

---

## 7. App state (discriminated union — one shape, every screen reads it)

```ts
type AppState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; kind: "parse" | "shape" | "empty" | "network" | "timeout" }
  | { status: "success"; data: TripWithIds };
```

`ResultView.tsx` switches on `status` and renders `LoadingState` / `ErrorState` /
`EmptyState` / `TripItineraryView` accordingly — one place, not re-implemented per screen.

### Failure-mode → UI mapping

| Failure | Caught where | User sees |
|---|---|---|
| Malformed JSON | `generateObject` throw (provider-side) | ErrorState: "Couldn't read the AI's response" + Retry |
| Wrong shape | client `safeParse` fails | ErrorState: "Response didn't match the expected format" + Retry |
| Empty response | `days.length === 0` check (server) | ErrorState: "No itinerary came back" + Retry |
| Slow response | 45s `AbortController` timeout | LoadingState → after timeout, ErrorState: "Taking too long" + Retry/Cancel |
| Failed request | `res.ok` false / network throw | ErrorState: "Request failed" + Retry |
| Stale response | `requestId` ref check | silently dropped, no UI state needed |

---

## 8. Component breakdown

```
src/
├── components/
│   ├── PromptInput.tsx        # free-text trip description, disabled while loading
│   ├── ResultView.tsx         # switches on AppState.status
│   ├── LoadingState.tsx
│   ├── ErrorState.tsx         # takes `kind`, shows message + Retry
│   ├── EmptyState.tsx
│   ├── TripItineraryView.tsx  # summary + day tabs
│   ├── DayCard.tsx            # one day: title, stop list, move-up/down controls
│   ├── StopCard.tsx           # one stop: name/time/desc, remove, expand
│   └── HistoryPanel.tsx       # see §10
├── lib/
│   ├── api.ts
│   ├── validateResult.ts
│   ├── diffTrips.ts           # see §10
│   ├── rateLimiter.ts         # see §11.3
│   └── logger.ts              # see §11.4
├── types/
│   └── trip.ts
└── app/
    ├── api/generate/route.ts
    └── page.tsx
```

Reordering: implement with **move-up / move-down buttons** first (reliable, demonstrates
real immutable-array state updates). `@dnd-kit/core` for real drag-and-drop is a reasonable
stretch once the core is solid — see §15.

---

## 9. Mobile pass

- Day tabs collapse to horizontal scroll or a `<select>` under ~480px.
- `StopCard` stacks to full width, touch targets ≥44px for move/remove buttons.
- Test in devtools responsive mode at 375px width before considering it done.

---

## 10. Iteration history & revert

**Why not Git/JJ as a backend for this:** Git/JJ diff *lines of text*. This app's data is
structured JSON, and its core interaction is *reordering array items* — a text diff
represents a reorder as "every line after this point changed," not "item moved from
position 2 to position 5." JJ also has no mature JS/npm embedding (it's a Rust CLI); a
persistent `.git`/`.jj` directory is also awkward to keep alive across a serverless,
no-auth app with no defined "whose repo is this" ownership model.

**Why a generic diff library on the whole object isn't quite right either:** without item
identity, a library like `fast-json-patch` run on a whole array has the same blind spot as
git on a reorder. The fix is to diff by the `id` already assigned to each stop (§3), not by
array position.

```ts
// lib/diffTrips.ts
type FieldChange = { stopId: string; field: string; from: unknown; to: unknown };
type StopMove = { stopId: string; from: [number, number]; to: [number, number] };

function indexStopsById(trip: TripWithIds) {
  const map = new Map<string, { dayIndex: number; pos: number; stop: StopWithId }>();
  trip.days.forEach((day, dayIndex) =>
    day.stops.forEach((stop, pos) => map.set(stop.id, { dayIndex, pos, stop }))
  );
  return map;
}

export function diffTrips(oldTrip: TripWithIds, newTrip: TripWithIds) {
  const oldIndex = indexStopsById(oldTrip);
  const newIndex = indexStopsById(newTrip);

  const fieldChanges: FieldChange[] = [];
  const moves: StopMove[] = [];
  const added: string[] = [];
  const removed: string[] = [];

  for (const [id, loc] of newIndex) {
    const old = oldIndex.get(id);
    if (!old) { added.push(id); continue; }
    if (old.dayIndex !== loc.dayIndex || old.pos !== loc.pos) {
      moves.push({ stopId: id, from: [old.dayIndex, old.pos], to: [loc.dayIndex, loc.pos] });
    }
    (["name", "time", "description", "category", "durationMinutes"] as const).forEach((field) => {
      if (old.stop[field] !== loc.stop[field]) {
        fieldChanges.push({ stopId: id, field, from: old.stop[field], to: loc.stop[field] });
      }
    });
  }
  for (const id of oldIndex.keys()) if (!newIndex.has(id)) removed.push(id);

  return { fieldChanges, moves, added, removed };
}
```

**Storage:** keep a plain array of full snapshots in state:

```ts
type Snapshot = { id: string; timestamp: number; data: TripWithIds };
const [history, setHistory] = useState<Snapshot[]>([]);
```

A full trip (5 days × 5 stops) serializes to roughly 5–8KB. Even 100 snapshots — far more
edits than one demo session produces — is under 1MB. Not a real RAM constraint at this
app's scale.

**Revert:** don't invert a patch (ambiguous if the same field changed more than once) —
clone the *current* state and copy one field's value in from a chosen older snapshot,
matched by stop id, then push that as a new snapshot.

This same mechanism sets up the "refinement loop" stretch goal for free: a follow-up prompt
could ask the model for a *patch* instead of a full itinerary regeneration.

Cut this whole section first if behind schedule — it's a stretch goal, not a requirement.

---

## 11. Scalability: what's built into the foundation vs. what's just a story

The grading rubric doesn't score scale directly, and this app's realistic traffic is a
handful of interviewer clicks — so the goal here isn't to build for load that will never
arrive. It's to make choices now that are (a) cheap enough not to threaten the 2-day budget,
(b) don't foreclose scaling later, and (c) several of which are also straightforward
reliability wins today. Each item below should take minutes, not hours — if one starts
eating real time, cut it and move on; the core (§3–§9) always wins the time-budget conflict.

### 11.1 Provider fallback (build this — cheap, dual-purpose)

`generateObject` is provider-agnostic — switching or adding a provider is a one-line
`model:` change. That makes automatic failover trivial, and it plugs a real gap: a provider
outage or rate limit isn't currently one of the six handled failure modes.

```ts
const attempts = [
  () => generateObject({ model: google("gemini-2.5-flash"), schema: TripItinerarySchema, prompt }),
  () => generateObject({ model: groq("openai/gpt-oss-120b"), schema: TripItinerarySchema, prompt }),
];

async function generateWithFallback() {
  let lastErr: unknown;
  for (const attempt of attempts) {
    try { return await attempt(); } catch (e) { lastErr = e; }
  }
  throw lastErr;
}
```

### 11.2 Edge runtime (try it — near-zero cost, but not load-bearing)

The AI SDK is built with edge-runtime compatibility as an explicit feature. Adding
`export const runtime = "edge";` to the route deploys it closer to users globally with
faster cold starts, for essentially no code change. Caveat: Edge functions have their own
duration ceiling, separate from the Node serverless one — if longer itineraries need the
fuller ~60s headroom from §5, stay on the default Node runtime instead. Worth trying, not
worth fighting.

### 11.3 Rate limiter behind an interface (build the interface + in-memory impl now)

```ts
// lib/rateLimiter.ts
export interface RateLimiter { check(key: string): Promise<boolean> }

export class InMemoryRateLimiter implements RateLimiter {
  private hits = new Map<string, number[]>();
  async check(key: string) {
    const now = Date.now(), windowMs = 60_000, limit = 10;
    const ts = (this.hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (ts.length >= limit) return false;
    ts.push(now);
    this.hits.set(key, ts);
    return true;
  }
}
```

Honest limitation, worth stating out loud rather than hiding: in-memory only works within
one warm instance. Under real horizontal scaling across many instances, each has separate
memory, so the limit isn't actually shared across them. At real traffic, swap in a
`RedisRateLimiter implements RateLimiter` (Upstash/Vercel KV) — same interface, zero
changes to the route handler that calls it. That's the point of the interface: the upgrade
path exists without a rewrite.

### 11.4 Structured log lines (build this — a few lines)

```ts
// lib/logger.ts
export function logEvent(event: string, data: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ event, timestamp: Date.now(), ...data }));
}
```

Costs nothing now. It's the seed of real observability later — log-based metrics and error
tracking both want structured fields, not free text.

### 11.5 Designed for, not built (the interview talking points)

- **Distributed caching** — cache-aside on Redis/Upstash keyed by a hash of the input, for
  repeated/near-duplicate prompts. Real win at traffic; not worth provisioning an external
  service, and a new failure point, for a demo.
- **Persistent, multi-device history** — a real DB storing the *delta* representation from
  §10 (one base snapshot + a sequence of diffs), not full copies. This is exactly where that
  design pays for itself — at real row counts, not at one browser tab's worth of history.
- **Request deduplication** for identical concurrent calls.
- **An async job queue** for generation — only relevant if generations get heavy/long enough
  that synchronous request-response stops working, which isn't this app.

### 11.6 Explicitly not doing, even as a talking point

Kubernetes, microservices, or an event/queue-based architecture. For a single-endpoint,
stateless, LLM-proxy app, that's not "scalable," it's disproportionate — the actual
bottlenecks here are LLM API latency and provider rate limits, not compute orchestration,
and reaching for infra that doesn't address those reads as not having identified the real
bottleneck.

---

## 12. Explicit test checklist before calling it done

Force each failure mode on purpose:

- [ ] Malformed JSON: temporarily mutate the response to break parsing, confirm ErrorState shows
- [ ] Wrong shape: strip a required field from a mocked response, confirm `safeParse` catches it
- [ ] Empty input: submit blank text, confirm it's rejected before hitting the API
- [ ] Empty result: mock `days: []`, confirm it's treated as failure not success
- [ ] Slow response: throttle network in devtools, confirm loading state holds and timeout fires
- [ ] Failed request: point fetch at a bad URL temporarily, confirm ErrorState + Retry
- [ ] Stale response: fire two requests quickly, confirm only the newer result renders
- [ ] Mobile viewport at 375px: every screen still usable, no horizontal scroll on the page body
- [ ] Provider fallback (§11.1): temporarily break the primary provider's call, confirm it falls through to the secondary

---

## 13. Time budget — 2 days, ~10–14 focused hours total

Comfortable pacing, not scope expansion. Report the real total honestly in the README.

**Day 1 (~6–7 hrs)**
| Time | Task |
|---|---|
| 0:00–0:30 | Zod schema (§3), repo scaffold, env vars |
| 0:30–1:30 | Route handler + provider wiring (§5), test prompt directly against the API outside the UI |
| 1:30–3:00 | Client API layer, validation pipeline, every error/loading/empty state, stale-request guard (§6–7) |
| 3:00–5:00 | Core interactive UI: PromptInput, DayCard, StopCard, move-up/down, remove (§8) |
| 5:00–6:00 | Mobile pass + run the full test checklist (§9, §12) |
| 6:00–7:00 | §11.1–11.4: provider fallback, structured logging, rate-limiter interface (cut any of these first if the core needs more time) |

**Day 2 (~4–7 hrs)**
| Time | Task |
|---|---|
| 0:00–1:30 | History/revert (§10) — first thing to cut if the core needs more time |
| 1:30–2:30 | Pick 1–2 stretch goals from §15 if ahead of schedule |
| 2:30–3:30 | README (setup, honest AI-usage note, known limitations, actual time spent), screen recording |
| 3:30–4:00 | Deploy to Vercel, final smoke test on the deployed URL, buffer |

---

## 14. README must cover

- Setup + run instructions (`npm install && npm start` must just work)
- What AI tools were used for, specifically — honesty counts in your favor
- Known limitations
- Actual time spent (not the plan's estimate — what really happened)
- A short note on the scalability foundation choices (§11) and what you'd add next at real
  traffic — this is good "communication & understanding" material even though it's not built
- Small, meaningful commits as you go, not one giant commit at the end

---

## 15. Stretch goals, reprioritized for a 2-day budget

Effort/impact order — a clean core still beats a pile of half-working extras:

1. **Polish move-up/down into real drag-and-drop** (`@dnd-kit/core`).
2. **`localStorage` session persistence** — trivial, satisfies "save and reload sessions" without a DB.
3. **Streaming** (`streamObject` + partial rendering) — the most technically impressive, and the highest risk; attempt only once the core and its error handling are rock solid.
4. **Refinement loop** — follow-up prompt edits the existing trip via a patch instead of full regeneration; reuses the §10 history mechanism.
5. **Dark mode / animation polish** — last, purely cosmetic.
