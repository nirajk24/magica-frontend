# magica-frontend

The client for an agent chat product: a Next.js App Router application for a long-running,
tool-using AI agent.

A turn can take minutes. It streams text and reasoning, opens tool cards that fill in as they run,
sometimes stops to ask a question, and must survive a reload halfway through. The design problem is
therefore not "render a chat" but **keep one screen truthful across two sources** — a live stream
and a database — without writing the timeline twice.

The API lives in [magica-backend](https://github.com/nirajk24/magica-backend), which is also the
source of `src/contracts/` — generated here, never hand-edited. Its public REST surface is
documented at [magica-8fc30897.mintlify.site](https://magica-8fc30897.mintlify.site).

| | |
|---|---|
| **Design docs** | [`LLD.md`](./LLD.md) — state, the rendering model, realtime, traps · [`UI-SPEC.md`](./UI-SPEC.md) — every screen, measured values, numbered decisions · [`CONVENTIONS.md`](./CONVENTIONS.md) — day-to-day rules |

---

## Setup

Requires **Node 20.9+** (`.nvmrc` pins 20.20.2) and **pnpm**.

```bash
nvm use
pnpm install
cp .env.example .env         # API base URL + auth keys
pnpm dev                     # app on :3000
```

A full local run is **three processes**: this app, the backend API on `:3001`, and the backend's
agent worker. Without the worker, sends are accepted and no turn ever runs.

### Environment

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | backend origin — the client calls `${it}/api/v1` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | authentication |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | hosted sign-in path |
| `NEXT_PUBLIC_API_DOCS_URL` | hosted API reference; optional — absent, the settings pane hides the link |

### Checks

```bash
pnpm typecheck && pnpm lint && pnpm test    # 367 tests across 33 files
pnpm build                                  # fails on drifted contracts before it builds
pnpm sync-contracts                         # re-copy the backend's schemas

pnpm e2e                                    # Playwright, anonymous surface — no backend needed
pnpm e2e:live                               # a real streamed turn; needs the API and worker up
```

Unit tests make **zero** live network calls: mocked HTTP serves contract-typed fixtures, and an
unhandled request is a failing test rather than a silent hole. `pnpm build` runs the contract drift
check first, so a stale copy fails the build rather than a screen.

The end-to-end suite is split by what it needs. The **public** project drives the anonymous surface
and runs anywhere. The **live** project signs in and exercises a real turn end to end — including a
reload mid-conversation — so it is opt-in and spends real model credits.

---

## Project structure

```
magica-frontend/
├── LLD.md                    state, the rendering model, realtime, the traps
├── UI-SPEC.md                every screen with its measured values and numbered decisions
├── CONVENTIONS.md            layering, testing rules, comment style
├── scripts/sync-contracts.ts copies the backend's Zod schemas; --check fails the build on drift
├── src/
│   ├── app/                  App Router
│   │   ├── providers.tsx     auth → query client → theme → tooltips → toasts
│   │   ├── globals.css       design tokens — two full palettes, not one inverted scale
│   │   └── (app)/            the shell group; the auth boundary sits on the chat route
│   ├── contracts/            GENERATED from the backend. Do not edit
│   ├── lib/
│   │   ├── api-client.ts     the only fetch: typed methods, bearer auth, error mapping
│   │   ├── query-client.ts   the query-key factory and retry policy
│   │   ├── timeline.ts       ★ normalises a live run AND a stored message into one shape
│   │   ├── transcript.ts     page flattening and live/persisted de-duplication
│   │   ├── uploader.ts       direct uploads, one signed assembly per file
│   │   └── format.ts         credits as BigInt, durations, timestamps
│   ├── queries/              one file per server-state concern
│   ├── stores/ui.ts          the only client store
│   └── components/
│       ├── shell/            app shell, sidebar, top bar, search palette, empty state
│       ├── chat/             chat screen, virtualized list, composer, live run
│       ├── blocks/           block + tool-card renderers, plan cards
│       ├── questions/        the docked question panel
│       ├── files/ credits/ tasks/ usage/   modals and secondary screens
│       └── ui/               Radix primitives
├── e2e/                      Playwright: an anonymous-surface project and an opt-in live-turn one
├── playwright.config.ts
└── tests/
    ├── unit/                 33 files, 367 tests
    └── msw/                  handlers and fixtures, typed as the contracts
```

---

## Architecture in brief

Full detail in [`LLD.md`](./LLD.md). The central problem and its answer:

```
   TWO SOURCES                                           ONE SCREEN
   ───────────                                           ──────────

   ┌─ while the turn runs ─────────────┐
   │ realtime metadata snapshot        │   structure: blocks, tool states,
   │   (latest value, bounded)         │──▶ segments, pending interaction ─┐
   │ realtime text stream              │   prose: sliced per block by      │
   │   (append-only, replayable)       │──▶ the characters it consumed     │
   └───────────────────────────────────┘                                   │
                                                                           ▼
                                                            ┌──────────────────────────┐
   ┌─ after it lands, or on reload ────┐                    │  lib/timeline.ts         │
   │ GET /chats/:id  → MessageDTO      │                    │  ── one shape ──         │
   │   contentBlocks, toolInvocations, │───────────────────▶│  { segments, tools,      │
   │   assets, usage, feedback         │                    │    assetUrls }           │
   └───────────────────────────────────┘                    └────────────┬─────────────┘
                                                                         │
                                            nothing below can tell which │
                                            source produced it           ▼
                              ┌──────────────────────────────────────────────────────┐
                              │ MessageTimeline → StepGroup → block renderers        │
                              │   text · thinking · tool card · usage · plan card    │
                              │   unknown type → renders nothing, never throws       │
                              └──────────────────────────────────────────────────────┘

   Recovery is therefore not a special case: reload → fetch history → ask for an
   active run → resubscribe. The same components render whatever arrives.
```

**One fetch, one place.** No component calls the network. `lib/api-client.ts` attaches the bearer
token, maps errors to a typed shape, and **parses every response against the contract schema** — so
a backend change surfaces at the boundary rather than as `undefined` deep in a render.

**Server state and UI state never mix.** TanStack Query owns everything the server said; one Zustand
store owns everything it did not. Syncing one into the other means the data is in the wrong place.

**Live and persisted turns render through the same components.** `lib/timeline.ts` normalises both a
live run and a stored message into one shape, and nothing downstream can tell which it received.
This is what makes reload recovery a single code path instead of a second implementation — and it is
the whole reason the screen can be rebuilt from the database mid-turn.

**Realtime degrades rather than breaks.** One component owns the subscription and is keyed on run id
and token, so teardown always precedes resubscribe — a leaked subscription would exhaust a
connection cap. Tokens refresh proactively; repeated errors fall back to polling; a pill shows the
state and nothing while healthy.

**Renderers fail soft.** An unknown block type renders nothing, an unknown tool falls back to a
generic card driven by the registry's own label and icon, an unknown icon falls back to a default.
The backend can ship a tool this client has never compiled against.

**Virtualization is a requirement, not an optimization.** The message list is virtualized, the live
run is a list *item* so there is one scroller, history pages backwards as you scroll, and
auto-scroll only engages when already at the bottom.

---

## Design decisions and trade-offs

**Auth boundaries sit where data is read, not in middleware.** Middleware exposes the session and
enforces nothing; each data-bearing route checks and redirects. A path pattern that disagrees with
the router leaves a resource reachable, and that class of bug is invisible until someone finds it.

**The chat screen is public.** An anonymous visitor can reach it and type; the first send opens
sign-in rather than failing. Because the draft lives in the UI store, it survives the round trip.

**Optimistic updates are rationed** to the one case where the outcome is certain — a feedback
rating, with rollback. The optimistic user bubble stays in component state and never enters the
message cache: a hand-built object sitting beside rows parsed from responses would be trusted
equally and is a lie waiting to be read as truth.

**Cache seeding over refetching** wherever a response already carries the data. Refetching the
active run after a send would mint a second realtime token for the same run.

**Credits are BigInt strings end to end**, formatted to significant digits. `Number()` anywhere on
that path silently loses precision on a large balance.

**Two full colour palettes, not one inverted scale.** Depth reverses between themes: in light the
sidebar recedes below the canvas, in dark it sits flush and raised surfaces come forward instead. A
single scale with inverted values produces a dark theme that looks subtly wrong everywhere and can't
be fixed by tuning one value.

**Unavailable controls render disabled with a reason**, using `aria-disabled` rather than `disabled`
so the explanation stays reachable by keyboard and screen reader — rather than being hidden, which
makes a partial surface look complete.

**Trade-offs accepted:** mocked HTTP cannot intercept the realtime transport, so the unit suite
drives the overlay from fixtures and the transport is proven by the live end-to-end project
instead — which means that proof costs real credits and is opt-in rather than continuous.
Virtualization and anything depending on the CSS cascade are outside jsdom's reach by construction.
Contracts are a committed copy rather than a published package, which is right for two repositories
moving together and wrong at larger scale.

---

## What I would improve with more time

- **Contracts as a versioned package** rather than a synced copy, so the client depends on a release.
- **Automated coverage of the degradation ladder.** The live end-to-end project proves a turn
  streams and survives a reload; forcing the transport to *fail* — and asserting the
  reconnect-then-poll fallback and the pill that reports it — still needs a driver that can sever a
  subscription on demand.
- **Anchoring a new turn to the top of the viewport on send**, pinning the question and reserving
  room below it — planned and deliberately deferred, because none of it is testable in jsdom and it
  would be the first mechanism shipped on a visual check alone.
- **A media library backed by its own screen**, rather than the current view over a task's files.
- **Richer skeletons** for the remaining loading states.
