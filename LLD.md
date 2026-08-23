# Low-Level Design

How this client is built: what owns which state, how a live turn and a finished one end up on screen
through the same components, and the traps this stack sets.

`src/contracts/` is generated from the backend and is the authority on every shape. This document
describes the design around those schemas rather than restating them.

---

## 1. Four rules

Everything else follows from these.

**No component calls `fetch`.** One HTTP client, one place tokens are attached, one place errors
become typed. A component that fetches is a component nobody can test without a network.

**Server state and UI state never mix.** TanStack Query owns everything the server said; Zustand
owns everything it did not. If you find yourself syncing one into the other, the data is in the
wrong store.

**One authority renders a run.** A turn is either live or persisted, never both — and the transition
between them must not blank the screen or duplicate it.

**Live and persisted render through the same components.** A renderer that can tell which source it
is looking at has broken reload recovery, because the two will drift.

---

## 2. Structure

```
src/
├── app/                          App Router
│   ├── layout.tsx                root document
│   ├── providers.tsx             auth → query client → theme → tooltips → toasts
│   ├── globals.css               design tokens: two full palettes
│   ├── (app)/                    the shell group
│   │   ├── layout.tsx            renders the shell — deliberately not an auth boundary
│   │   ├── chat/page.tsx         the new-chat screen (public)
│   │   ├── chat/[chatId]/        layout.tsx is the auth boundary; page.tsx renders the screen
│   │   ├── chat/recent/          the task list
│   │   ├── usage/                credit usage
│   │   └── …                     placeholder surfaces
│   └── sign-in/                  hosted sign-in
├── proxy.ts                      auth middleware — exposes the session, enforces nothing
├── contracts/                    GENERATED from the backend. Never hand-edited
├── lib/                          non-React building blocks and thin hooks
├── queries/                      one file per server-state concern
├── stores/ui.ts                  the only Zustand store
├── templates/                    empty-state prompt gallery
└── components/
    ├── ui/                       Radix primitives
    ├── shell/                    app shell, sidebar, top bar, search palette, empty state
    ├── chat/                     the chat screen, message list, composer, live run
    ├── blocks/                   block and tool-card renderers, plan cards
    ├── questions/                the docked question panel
    ├── panels/                   the tool detail panel
    ├── files/ credits/ tasks/    modals and secondary screens
    └── usage/                    usage tables
```

### `lib/`

| Module | Owns |
|---|---|
| `api-client.ts` | the only `fetch`. Typed methods, bearer auth, error mapping |
| `use-api.ts` | binds the auth token getter to the client; what components actually call |
| `query-client.ts` | the `qk` query-key factory, retry policy, client construction |
| `env.ts` | validated public environment |
| `timeline.ts` | **the rendering model** — normalises a live run *and* a stored message into one shape |
| `transcript.ts` | flattens message pages and removes the row the overlay is currently rendering |
| `waitpoints.ts` | parses loose JSON payloads into their kind's schema |
| `uploader.ts` | direct uploads: one assembly per file |
| `format.ts` | credits, durations, timestamps, byte sizes |
| `prose.ts` | removes URLs already rendered as media |
| `failure.ts` | turns any thrown thing into user-facing text plus a trace id |
| `models.ts`, `task-files.ts`, `cn.ts`, `use-hydrated.ts`, `use-debounced.ts` | supporting |

---

## 3. The API layer

`lib/api-client.ts` exposes one `request<T>(path, init, schema, getToken)` and a `createApi`
factory of typed methods. Components never import it directly — they call `useApi()`, which
memoises the client against the auth hook.

**Bearer tokens, never cookies.** Client and API are separate origins, so cookie auth cannot work.
The token is fetched **immediately before each request**: the JWT lives about a minute, so caching
it produces intermittent, hard-to-reproduce 401s.

**Responses are parsed, never cast.** A successful body goes through the contract schema before any
component sees it, so backend drift surfaces as a typed error at the boundary rather than as
`undefined` deep in a render.

**The body parse is guarded.** An unrouted path returns the framework's HTML 404; calling `.json()`
unguarded throws and discards the status, turning a routing mistake into an unrecognisable error.

**Retries are selective.** Only internal errors and rate limits retry. A schema failure never
retries — it means the backend changed shape and no number of attempts will fix it. Anything
unrecognised is treated as a transport failure and retried, because that is the safe default for a
network.

**Contracts are synced, not published.** `pnpm sync-contracts` copies the backend's schemas in with
a generated-file header; the copy is committed, because this repository builds alone. `pnpm build`
runs `sync-contracts --check` first, so a drifted copy fails the build rather than a screen. The
check no-ops when the backend is not on disk, so a deploy from a clean checkout still builds.

---

## 4. State

### TanStack Query owns

Chat list, message history (both infinite), the active run, credits, usage, attachments, model
availability — one file each under `queries/`.

Defaults worth knowing: a 30-second stale time, and **no refetch on window focus** — alt-tabbing
mid-turn would otherwise fight the streaming overlay.

`qk` is a key factory rather than inline arrays, so the list prefix is shared by every filtered and
searched variant and one invalidation covers them all.

Two deliberate exceptions to "always refetch":

- **The active run has an infinite stale time.** Each fetch mints a fresh realtime token, and
  refetching on a timer would rebuild the subscription against a connection cap.
- **Some responses seed the cache instead of triggering a refetch.** A send response already
  contains the active run; refetching would mint a second token for the same run. A top-up response
  already contains the new balance.

### Zustand owns

One store: drafts, per-chat model override, sidebar collapse, which modals and panels are open,
which runs are mid-stop, plan-mode flags, toasts, and which step groups are expanded.

**Only drafts and sidebar collapse persist.** Two calls are worth defending:

- The per-chat model override is **not** persisted, because a restored local value would outrank
  what the server recorded on the chat.
- Expanded step groups live in the store rather than in the component, because virtualized rows
  unmount when scrolled past and would silently re-collapse.

### Local state

Genuinely ephemeral things only: the optimistic user bubble (keyed by chat so a route change cannot
duplicate it), dismissed interaction ids, in-flight upload items, per-block remembered reasoning,
and table sort/selection.

**Optimistic updates are rationed.** Only feedback ratings patch the cache, with rollback. The
optimistic user bubble is held in component state and never written into the message cache: a
hand-built message object in a cache whose every other row was parsed from a response is a lie
waiting to be read as truth.

---

## 5. The rendering model

This is the most important section in the repository.

`lib/timeline.ts` exports two functions that produce the **same** shape:

```
timelineFromRun(metadata, streamedText, rememberedReasoning) ─┐
                                                              ├─▶ Timeline { segments, tools, assetUrls }
timelineFromMessage(message) ─────────────────────────────────┘
```

Everything downstream renders a `Timeline` and cannot tell which produced it. `streaming` is a *row
state*, never a source discriminator.

**How prose is reassembled.** The run metadata snapshot carries block *structure* only; the text
arrives on a separate append-only stream. Each text block records how many characters it consumed,
and the renderer slices the stream accordingly. Only text blocks consume it — reasoning travels in
its own metadata field, so counting it would shift every later block by the whole thinking
transcript.

**Why reasoning is remembered.** The snapshot reports only the *current* block's reasoning, so an
earlier one would blank the moment a later one opened. The overlay keeps what each block said as it
passes.

**Renderers are registries with fallbacks.** An unknown block type renders nothing rather than
throwing; an unknown tool falls back to a generic card driven only by the registry's own label and
icon; an unknown icon name falls back to a default. The backend can therefore ship a tool this
client has never compiled against, and the screen degrades instead of breaking.

---

## 6. Realtime and recovery

`components/chat/LiveRun.tsx` is the only file that talks to the realtime SDK. It subscribes to two
things: the run's metadata snapshot and the append-only text stream.

**Teardown before resubscribe, made structural.** The subscription is keyed on run id *and* access
token, so a token change unmounts the subtree — whose cleanup aborts both subscriptions — before the
replacement mounts. The subscription effect does not depend on its client, so changing the token in
place would leak the old connection against a per-plan connection cap. Making it a key change means
no one has to remember.

**The live run is a list item**, not an overlay outside the scroller, so there is one scrolling
context and no second scrollbar.

**Degradation is a ladder.** The token is refreshed proactively well before expiry. Subscription
errors are counted; past a small bound the client flips to polling REST on an interval. A pill
renders the state, and nothing at all while healthy.

**Recovery is entirely REST**, which is what makes it one code path rather than a special case:
history comes from the conversation query, the active-run query returns any in-flight run *with a
fresh token and any pending interaction*, and the live component resubscribes. A run that has been
accepted but not yet dispatched is returned too and polled briefly, with a pending row on screen —
so the turn appears the instant the message lands rather than seconds later.

**The active-run route answering `null` is itself the terminal signal.** There is no cancelled
status to watch for, which is exactly what the mid-stop latch in the store exists to bridge: hold
from the click until the run leaves the route *and* the conversation refetch has settled, or the
control flips back and forth.

**Interactions render from the active run**, the source that survives a reload — realtime metadata's
only job is to invalidate that query.

---

## 7. Uploads

One assembly per file, because each is signed with an expected file count of one.

The flow: ask the API to sign, upload directly to the transform provider, then report completion
back to the API. Two details are load-bearing:

- **The signed parameters are passed through verbatim.** Re-serialising the JSON invalidates the
  signature.
- **The finished file is read from the assembly's uploads**, not from its results. An upload-only
  assembly performs no transformation step, so the results collection is empty.

Progress, retry and cancellation are per file, and the composer renders each as a chip.

---

## 8. Testing

Two layers. Vitest with jsdom and Testing Library for components and logic — **33 files, 367
tests** — and Playwright for the paths that only exist in a real browser against a real server.

**Mocked HTTP is the backend.** Handlers cover every route and fixtures are typed as the contracts,
so a backend schema change fails `pnpm typecheck` rather than producing a wrong-looking screen.
Unhandled requests are configured to **error**: a component that reaches a URL nobody mocked is a
bug in the component.

Named override handlers exist for the states that are hard to reach: no active run, waiting on a
plan, waiting on questions, an expired interaction, rate limited, upload quota exceeded, and failing
cancel and retry.

**The test harness fakes as little as possible.** Only the auth hooks are mocked — the API client
still runs end to end against mocked HTTP. The virtualizer is replaced with a plain list because
jsdom reports zero heights and the real one would render nothing. Layout APIs jsdom lacks are
stubbed. The store is reset from a snapshot captured before any test runs.

The render helper mounts the toast host and disables retries, so a failure-path test cannot pass
against a screen that showed nothing.

**Out of the unit layer's reach by construction:** the realtime transport, which mocked HTTP cannot
intercept — the overlay is driven from fixtures instead; virtualization itself; and anything
requiring the CSS cascade, since jsdom has none. A test can assert a class, never the colour it
resolves to.

### End-to-end

Two Playwright projects, split by what they cost.

**`pnpm e2e` — the public project.** Drives the anonymous surface with no authentication and no
backend state: that the new-chat screen is served directly rather than behind a redirect, that the
first send asks for an account instead of calling the API, that the draft survives that prompt, the
command palette chord, and theme persistence across a reload. Cheap enough to run on every change.

**`pnpm e2e:live` — the live project.** Signs in through a stored session and exercises a real turn
against a running API and worker: a message is sent, the answer streams back and renders, and a
reload mid-conversation rebuilds the transcript from the database. This is the only automated proof
that the realtime path works, and it spends real credits — so it is opt-in rather than continuous.

The split matters: the state most likely to break silently is the one that costs money to observe,
so it gets a test rather than a manual checklist, but not one that runs unattended.

**Still not covered:** the degradation ladder. Nothing yet severs a subscription on demand, so
reconnect-then-poll and the pill that reports it remain verified by hand.

---

## 9. Traps in this repository

| Trap | Symptom | Guard |
|---|---|---|
| Caching the auth token | intermittent 401s that never reproduce locally | fetch it immediately before each request |
| Changing a realtime token in place | the old subscription leaks and the connection cap is hit | key the component on run id *and* token so teardown runs first |
| Refetching the active run on a timer | a new realtime token per fetch, rebuilding the subscription | infinite stale time; seed it from the send response |
| A renderer branching on live-versus-persisted | reload recovery drifts from the live view, silently | both go through one timeline builder |
| Counting reasoning toward stream offsets | every later text block is shifted by the thinking transcript | only text blocks consume the stream |
| Unmounting the overlay on terminal | the turn blanks between the stream ending and the row landing | unmount when the persisted row arrives non-streaming |
| Expanded-state held in a virtualized row | rows unmount when scrolled past and silently re-collapse | keep it in the store |
| A panel rendered by the row that opens it | the panel vanishes when its row scrolls out of view | the screen renders it; the store holds only an id |
| `res.json()` unguarded | an HTML 404 from an unrouted path throws and discards the status | guard the parse |
| Retrying a schema failure | three attempts at something no retry can fix, delaying the message | retry only internal and rate-limit errors |
| Writing a hand-built object into the message cache | a fabricated row sits beside parsed ones and is trusted equally | optimistic UI stays in component state |
| A restored local model override | outranks what the server recorded on the chat | do not persist it |
| `Number()` on a credit value | silent precision loss on large balances | BigInt arithmetic, strings on the wire |
| Asserting a resolved colour in jsdom | there is no cascade; the assertion is meaningless | assert the class |
| A fixture whose run status disagrees with the route it came from | tests pass against a state the backend cannot produce | build fixtures from the contracts |

---

## 10. Accessibility

Not incidental, and not a final pass:

- The streaming region is a polite live region, non-atomic, so tokens are announced as they arrive
  rather than re-reading the whole answer.
- The search palette is a combobox over a listbox with an active-descendant reference, so focus
  never leaves the input while arrow keys move the selection.
- Step groups expose expanded state; usage tables expose sort state; tab strips use proper tab
  semantics; send failures announce as alerts.
- **Unavailable controls use `aria-disabled`, not `disabled`**, precisely so the tooltip explaining
  *why* stays reachable by keyboard and screen reader. A control that is off with no reason given is
  worse than one that is absent.
- Reduced-motion preferences disable the spinner animation and the backdrop blur.
