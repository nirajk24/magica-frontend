# Magica Frontend — Low-Level Design & Phased Build Plan

Companion to the backend's `LLD.md` and the shared `ARCHITECTURE.md`. The backend owns behaviour;
this repo owns rendering. **Every visual decision here traces to a capture in the reference library
(`docs/reference/design/`, 77 files, 10 folders) — nothing is designed from imagination.**

**Before writing code, read `docs/dry-run-phase0-1.md`.** A paper trace of Phases 0–1 found two
blockers that land in *this* repo: auth is **Bearer, never cookies** (F1), and `runId` vs
`triggerRunId` must never be conflated (F2). Both are already folded into the sections below.

---

## 0. The four rules that keep this repo honest

**1. No raw `fetch` in a component. Ever.**
`component → query hook → api-client → typed contract`. A component that fetches is a component you
cannot test, cannot cache, and cannot make consistent with the rest of the screen.

**2. Server state and UI state are different things, stored differently.**

| | TanStack Query | Zustand |
|---|---|---|
| Owns | anything the server knows: chats, messages, credits, active run | anything only this browser knows: draft text, which panel is open, sidebar collapsed |
| Survives reload | yes — refetched | no, unless explicitly persisted to localStorage |
| Wrong use | storing a draft here (it isn't server state) | storing messages here (they'd go stale and never refetch) |

If you ever find yourself syncing one into the other, the data is in the wrong store.

**3. One authority renders a run at a time.**
While a `StreamingOverlay` is mounted for `runId`, the message list **filters out** any persisted row
with `status === "streaming"` for that run. Otherwise you get two bubbles saying the same thing — a
duplicate the PDF explicitly calls out. One rule, one place: the list selector.

**4. Live and persisted render through the same components.**
`RunMetadata.blocks` (live) and `Message.contentBlocks` (persisted) are the same shape — one is a
projection of the other. The block renderer map does not know which it is looking at. **That
equivalence is why reload recovery is free rather than a second code path.** If you write an
`if (isLive)` branch inside a renderer, you have broken it.

---

## 1. Repo layout

```
magica-frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx              Phase 0 — html shell, fonts, theme class
│   │   ├── providers.tsx           Phase 0 — ClerkProvider > QueryClientProvider > ThemeProvider
│   │   ├── page.tsx                Phase 3 — empty state (new task)
│   │   ├── chat/[chatId]/page.tsx  Phase 1 — THE screen
│   │   ├── chat/recent/page.tsx    Phase 3 — Tasks page
│   │   └── sign-in/[[...rest]]/    Phase 0 — Clerk catch-all
│   ├── contracts/                  ★ synced copy — `pnpm sync-contracts`. NEVER hand-edited
│   ├── lib/
│   │   ├── api-client.ts           Phase 0 — the only fetch() in the repo
│   │   ├── query-client.ts         Phase 0 — defaults + query key factory
│   │   ├── realtime.ts             Phase 1 — useRunStream(): metadata + text + token refresh
│   │   ├── env.ts                  Phase 0 — Zod over NEXT_PUBLIC_*
│   │   └── uppy.ts                 Phase 6
│   ├── queries/
│   │   ├── use-chat.ts             Phase 1 — chat + messages page
│   │   ├── use-send-message.ts     Phase 1 — mutation + optimistic user bubble
│   │   ├── use-active-run.ts       Phase 1 — recovery + token minting
│   │   ├── use-cancel-run.ts       Phase 2
│   │   ├── use-retry-message.ts    Phase 2
│   │   ├── use-resolve-waitpoint.ts Phase 4
│   │   ├── use-chats.ts            Phase 3 — sidebar list (infinite)
│   │   └── use-credits.ts          Phase 3
│   ├── stores/ui.ts                Phase 1 — drafts (persisted), panels, sidebar
│   ├── components/
│   │   ├── ui/                     shadcn primitives
│   │   ├── shell/{Sidebar,TopBar,CreditsChip,ThemeToggle,UserFooter}.tsx
│   │   ├── chat/{MessageList,MessageRow,StreamingOverlay,Composer,
│   │   │         AttachmentChip,ScrollToBottom,AssistantFooter}.tsx
│   │   ├── blocks/                 ★ THE RENDERER REGISTRY
│   │   │   ├── index.ts            blockRenderers + toolCardRenderers maps
│   │   │   ├── TextBlock.tsx  ThinkingRow.tsx  StepGroup.tsx
│   │   │   ├── ToolCard.tsx        generic fallback — reads registry `display`
│   │   │   ├── AiGenerationCard.tsx  ModelSchemaCard.tsx  SkillRow.tsx
│   │   │   ├── PlanCard.tsx        Phase 4
│   │   │   └── QuestionsCard.tsx   Phase 6
│   │   ├── panels/ToolDetailPanel.tsx
│   │   ├── questions/QuestionPanel.tsx   Phase 6 — docked, replaces composer
│   │   └── modals/{FilesModal,MediaLibrary,ImagePreview,AddCredits}.tsx
│   └── templates/gallery.ts
└── tests/{unit,e2e}/
```

---

## 2. Foundation (Phase 0)

### 2.1 `lib/api-client.ts` — the only `fetch` in the repo

```ts
class ApiError extends Error {
  constructor(public code: ErrorCode, message: string,
              public traceId: string, public details?: unknown) { super(message); }
}

async function request<T>(path: string, init: RequestInit,
                          schema: z.ZodType<T>): Promise<T> {
  const token = await getToken();                 // ← immediately before EVERY fetch. ~60s JWT.
  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1${path}`, {
    ...init,
    headers: { "Content-Type": "application/json",
               Authorization: `Bearer ${token}`, ...init.headers },
  });
  const json = await res.json();
  if (!res.ok) {
    const e = ApiErrorEnvelope.parse(json).error;
    throw new ApiError(e.code, e.message, e.traceId, e.details);
  }
  return schema.parse(json.data);                 // ← parse, don't cast
}

export const api = {
  getChat:      (id: string, cursor?: string) => request(`/chats/${id}?…`, {}, ChatWithMessages),
  sendMessage:  (id: string, body: SendMessage) => request(`/chats/${id}/messages`,
                   { method: "POST", body: JSON.stringify(body) }, SendMessageResult),
  getActiveRun: (id: string) => request(`/chats/${id}/active-run`, {}, ActiveRun.nullable()),
  cancelRun:    (id: string) => request(`/runs/${id}/cancel`, { method: "POST" }, Ok),
  retryMessage: (id: string) => request(`/messages/${id}/retry`, { method: "POST" }, SendMessageResult),
  resolveWaitpoint: (id: string, r: WaitpointResolution) => …,
  listChats:    (q: ChatsQuery) => …,
  getCredits:   () => …,
};
```

**Bearer, not cookies — and this is not a preference (dry-run F1).** Two repos means two Vercel
origins. A Clerk session cookie set on the frontend domain is never sent to the backend domain, so
`credentials: "include"` fails on the first real cross-origin request — in production, not locally.
The token comes from Clerk's `getToken()` and is fetched **immediately before every request**: the JWT
lives about 60 seconds, so caching it in a module variable produces intermittent 401s that look like
a backend bug. The backend runs `clerkMiddleware({ authorizedParties: [FRONTEND_URL] })` with CORS in
the same middleware and the **OPTIONS short-circuit before auth** — a preflight carries no
Authorization header, so auth-first answers 401 and the real request is never sent.

`schema.parse(json.data)` rather than `as T` is the point. If the backend changes a field, you find
out at the boundary with a readable error, not three components deep as `undefined`.

**`ApiError.code` is the discriminant the UI switches on** — `INSUFFICIENT_CREDITS` opens the top-up
CTA, `RUN_ALREADY_ACTIVE` is swallowed (a run is already going), `VALIDATION_ERROR` renders
field-level copy. `traceId` goes in a copyable corner of the error toast; a grader who reports a bug
with a traceId is a grader you can actually help.

### 2.2 `lib/query-client.ts` — keys as a factory, not strings

```ts
export const qk = {
  chats: (f?: ChatsFilter) => ["chats", f ?? "all"] as const,
  chat: (id: string) => ["chat", id] as const,
  activeRun: (chatId: string) => ["active-run", chatId] as const,
  credits: () => ["credits"] as const,
  attachments: (f: AttachmentFilter) => ["attachments", f] as const,
};
```

Hand-written key arrays scattered across files is how invalidation silently stops working. One
factory means `qk.chat(id)` is the same key everywhere.

**`qk.activeRun` must be `staleTime: Infinity`.** It mints a **fresh token on every call**, so a
30-second stale time means the token changes every 30s, `useRealtimeRun`'s `accessToken` prop changes,
and the subscription tears down and rebuilds — against a free-tier cap of **10 concurrent realtime
connections**. Symptom: a stream that dies a few minutes in, intermittently, only in the deployed app.

It is refetched **only** on: send, run-terminal, and the ~12-minute refresh timer. Nothing else.

Defaults for everything else: `staleTime: 30s`, `refetchOnWindowFocus: false` (it would refetch
mid-stream and fight the overlay), and `retry: shouldRetry`.

**`retry` is a predicate, not a count.** A flat `retry: 3` repeats every failure, so a 400, a 402 or
a 409 is sent three times before the UI can show the message it already has — and an
`INSUFFICIENT_CREDITS` answer takes three round trips to reach the top-up CTA. `shouldRetry` retries
only `INTERNAL` and `RATE_LIMITED`, never a `ZodError` (contract drift will not fix itself), and
always retries an unrecognised error, because that is a dropped connection and it is what retries
are for.

### 2.3 `stores/ui.ts`

```ts
export const useUI = create(persist((set) => ({
  drafts: {} as Record<string, string>,           // PERSISTED — survives reload (localStorage)
  setDraft: (chatId, text) => …,
  sidebarCollapsed: false,                        // persisted
  // NOT persisted — transient:
  openPanel: null as { type: "tool"; invocationId: string } | null,
  stoppingRuns: new Set<string>(),                // the PDF's "stopping" state, client-only
}), { name: "magica-ui", partialize: (s) => ({ drafts: s.drafts,
                                               sidebarCollapsed: s.sidebarCollapsed }) }));
```

**Why drafts are localStorage and not the server:** the reference product's `PATCH send-message` is a
presence heartbeat, not draft sync — it carries no content field (api-notes, corrected in decision
#20). So server-side draft sync would be inventing a feature. `partialize` is what stops the
transient fields being written to disk.

---

## 3. The rendering model — the most important section

### 3.1 One component, two data sources

```
                    ┌─ RunMetadata.blocks  (live, projection)  ─┐
  MessageTimeline ──┤                                            ├──▶ blockRenderers[type]
                    └─ Message.contentBlocks (persisted, full)  ─┘
```

```tsx
// components/blocks/index.ts
export const blockRenderers: Record<string, FC<BlockProps>> = {
  text: TextBlock, thinking: ThinkingRow,
  tool_use: ToolCardSwitch, usage: UsageRow, citations: CitationsRow,
  step_update: StepUpdateRow,
};

export const toolCardRenderers: Record<string, FC<ToolCardProps>> = {
  gpt_image_2: AiGenerationCard,
  crop_image: AiGenerationCard,
  merge_videos: AiGenerationCard,
  get_model_schema: ModelSchemaCard,
  load_skill: SkillRow, read_skill_asset: SkillRow,
  submit_plan: PlanCard,
  ask_questions: QuestionsCard,
};

// Unknown type → generic fallback using the registry's `display.label` + `display.icon`.
// It must NEVER crash: a backend that ships a new tool before the FE knows about it
// still renders something sensible. That is what forward-compatible means here.
```

Adding a block type or a bespoke card = **one map entry**. This mirrors the backend registry, and it
is the frontend half of the "one authoritative registry" claim: labels and icons come from
`ToolInvocationDTO.display`, which comes from `defineTool`.

### 3.2 Step groups

`segment` on each block drives the reference's repeated `Working · N steps` / `Completed N steps`
collapsible groups. Group blocks by `segment`, render a `StepGroup` header per group.

**N counts timeline rows in the segment — reasoning blocks AND tool invocations, not just tools.**
(This was corrected in session 4; the earlier rule produced one giant group for a 10-step turn.)

### 3.3 `useRunStream` — the realtime hook

```ts
export function useRunStream(chatId: string) {
  const { data: activeRun } = useActiveRun(chatId);          // mints a fresh 15-min token
  // TWO IDS (dry-run F2): `triggerRunId` (run_xxx) is the ONLY one useRealtimeRun accepts;
  // `runId` (our UUIDv7) is what cancel/retry take. Conflating them fails late and confusingly.
  const { run } = useRealtimeRun(activeRun?.triggerRunId, {
                    accessToken: activeRun?.publicAccessToken,
                    enabled: !!activeRun?.triggerRunId });   // NOT !!activeRun — triggerRunId is
                    // null for the first moment after send, and subscribing to undefined throws
  const { parts } = useRealtimeStream<string>(STREAM_AGENT_TEXT, { … });  // replays from 0

  // 1. token refresh at ~12 min AND on auth error / unexpected close while non-terminal.
  //    TEAR DOWN the old subscription explicitly before resubscribing (F13) — the free tier allows
  //    10 concurrent realtime connections, so a leaked one per refresh silently stops updates on a
  //    long session, which looks exactly like a broken stream. Never rely on garbage collection.
  // 2. after 3 bounded retries → REST polling every 5s (the doc's required fallback)
  // 3. on terminal → invalidate qk.chat(chatId); overlay unmounts once the persisted row appears
  return { metadata: run?.metadata as RunMetadata | undefined,
           streamedText: parts.join(""), connection };
}
```

Three failure paths, all required by the doc, all in one hook:
**token expiry** (runs with waitpoints legally outlive a 15-min token), **bounded retries**, and
**REST fallback**. Streams v2 replays from chunk 0 on resubscribe, so a reconnect is lossless — this
is confirmed in HAR2, not assumed.

### 3.4 Reload recovery, as code

```
1. useChat(chatId)        → render persisted messages (incl. streaming/failed partials)
2. useActiveRun(chatId)   → null? done, static view.
                            otherwise subscribe (§3.3)
3. metadata.phase         → status pill · approval card · tool cards
4. terminal               → invalidate qk.chat → overlay unmounts when the persisted row lands
                            (id-based dedupe on assistantMessageId — no flicker)
```

Step 4's dedupe is why there's no flash of duplicate content: the overlay only unmounts once the row
it was previewing actually exists in the cache.

---

## 4. The phases

### Phase 0 — Scaffold · ~2h

Next.js App Router + TS strict, Tailwind, shadcn init, Clerk provider + middleware, `sign-in`
catch-all, `api-client`, `query-client`, `env`, `pnpm sync-contracts`.

**Theme tokens first, before any component.** Pull the palette from the light and dark captures
(`01-shell/empty-state__{light,dark}.png`) into CSS variables. Retro-fitting dark mode after building
20 components is a day you don't have.

**DoD** — sign in with Google, land on a protected page, `GET /api/v1/health` proxied through
`api-client` with a parsed response, dark/light toggle flips every token.

---

### Phase 1 — The chat screen · ~8h · matches backend Phase 1

**Goal:** send a prompt, watch it stream with correctly interleaved thinking/tool/text rows, see the
asset, **reload mid-run and it keeps going**.

**Build order inside the phase** (each step visibly works before the next):

1. `chat/[chatId]/page.tsx` + `MessageList` + `MessageRow` — render persisted messages from REST.
   Static, no realtime. Reference: `06-messages/chat__user-bubbles+assistant-footer__light.jpg`.
2. `Composer` — textarea, auto-grow, Enter sends / Shift+Enter newlines, draft to Zustand,
   disabled while a run is active. Reference: `02-composer/*`.
3. `useSendMessage` — optimistic user bubble, then reconcile. On `RUN_ALREADY_ACTIVE`, swallow.
4. Block renderers: `TextBlock`, `ThinkingRow` (collapsible, `Thinking ⌄` → `Reasoned ⌄` at
   completion), `ToolCard` generic, `AiGenerationCard`.
   Reference: `03-streaming/*`, `04-tool-cards/*`.
5. `StreamingOverlay` + `useRunStream` — live blocks from metadata, prose from the text stream.
6. `StepGroup` — group by `segment`.
7. Reload recovery + the single-authority filter.
8. `react-virtuoso` for the list — do this **last**; virtualization on top of working rows is easy,
   debugging both at once is not.

**Two details that look small and aren't:**

- **The thinking row streams.** `metadata.reasoningText` fills the expanded row token by token. The
  capture `03-streaming/working-1step__thinking-expanded-token__light.jpg` shows a partial word
  mid-render. An empty box until terminal is a visible fidelity miss.
- **Attachments render above the user bubble text**, larger than you'd guess. See
  `06-messages/chat__user-bubbles+assistant-footer__light.jpg`.

**DoD**
- Send → tokens appear → tool card goes running → completed with duration + credit chip → asset shows
- Rows are in the right order, interleaved, grouped by segment
- **Hard-reload mid-run → messages from REST, stream resubscribes, run finishes in front of you**
- No duplicate bubble at the moment the overlay hands over
- Timeline is visually diffable against `03-streaming/` and `04-tool-cards/`

**Tests** — RTL: `blockRenderers` renders each type; unknown type renders the fallback and does not
throw; the single-authority filter hides a streaming row while an overlay owns the run.

---

**`/chat` ships in Phase 1 — the new-chat route, corrected.** Earlier drafts of this plan put it at
`/chat/new`. That URL does not exist in the reference: `app.magica.com/chat` **is** the new-chat page
and `/` redirects to it, which the empty-state captures show in the address bar. `new` is the id the
send route accepts in its path, and an API detail has no business appearing in a URL.

There is no `POST /chats`, the sidebar is Phase 3 and the full empty state is Phase 3 — so without
this route there is no way to start a conversation in Phase 1.

```
/           → redirect to /chat
/chat       → chatId sentinel 'new' → SKIP the chat query (GET /chats/new would 404)
            → composer, centred, no transcript area
send        → POST /chats/new/messages → server creates the chat
            → prefetch the real history → router.replace(`/chat/${chatId}`)
```

Keep it minimal: composer only, no greeting, no gallery, no sidebar. Phase 3 adds the ghost logo,
the live clock, "Your AI worker" and the template gallery above it. **This is also the demo's first
five seconds**, so it is not throwaway scaffolding.

### Phase 2 — States and failures · ~4h · matches backend Phase 2

Stop button (send arrow → red square; `stoppingRuns` set locally and held until terminal), failed
turn (`errorMessage` + partial output + tool outcomes + **Retry**), cancelled turn (gray
`Response was interrupted` pill — derived from status, *not* from a `"(Response stopped)"` text
suffix), reconnecting pill, `ScrollToBottom`, `AssistantFooter` (credits · copy · **like/dislike rendered DISABLED — `PATCH /messages/:id/feedback` is a Phase-6 route (review #22); disabled-with-tooltip is honest, wired-to-nothing is a bug a grader will click** ·
time), error toasts carrying `traceId`.

Reference: `06-messages/interrupted__response-was-interrupted-pill__dark.jpg`,
`04-tool-cards/ai-gen__FAILED-safety+reasoned-retry+tracker-1of3__dark.png`.

**DoD** — every failed turn is explainable from the screen alone, with a way forward. That sentence
is the graded requirement, verbatim.

---

### Phase 3 — The shell · ~5h

`Sidebar` (nav, Recent tasks, live reorder by `updatedAt`, active row, collapsed icon rail ~930px,
footer with credits + Add Credits + Settings + theme trio + Clerk `<UserButton/>`), `TopBar` (model
pill, files icon, credits chip), empty state (ghost logo, live clock, "Your AI worker", template
gallery), Tasks page (`/chat/recent`: h1, filter, search field, relative dates, skeletons).

Reference: all of `01-shell/`, plus `08-credits/`.

**Skeletons are not optional polish** — five distinct loading states are captured
(`09-recovery/*`, `07-modals/files__loading-spinner`), and a grader comparing screens will see a
blank flash where the reference shows a skeleton.

---

### Phase 4 — Plan approval · ~4h · matches backend Phase 4

`PlanCard` with every captured microstate — `Plan submitted ⟳` → actionable (`Request Changes` ·
`Step by Step` · `Run All`, with the `Enter run all` hint) → `Changes requested` (orange ⟲ +
duration + Result row) → `Plan approved ⟳ → ✓ 9.3s` → collapsed to header + `(N steps)` subtitle.
Request Changes opens an in-card textarea with `⌘+Enter to submit changes`.

Reference: all 13 files in `05-plan-cards/`.

**Per-step credit chips come from the server** (`submit_plan` steps are priced through the registry).
The frontend never computes or estimates a cost — it renders the number it is given.

---

### Phase 5 — Tool detail + assets · ~3h

`ToolDetailPanel` as a right-side **overlay, not a layout squeeze** (the captures show content
staying put), maximize → fullscreen with a `Restore` tooltip, detail rows
(Tool / Model / Prompt / Size / Quality / Aspect Ratio / Resolution + `View more`), asset strip,
image hover → expand + download.

Reference: `04-tool-cards/detail-side-panel__light.jpg`,
`04-tool-cards/detail-fullscreen__input-images__light.jpg`.

---

### Phase 6 — Deferred-by-design · ~10h · ordered, stop anywhere

| Order | Item | Notes |
|---|---|---|
| 1 | `QuestionsCard` + `QuestionPanel` | docked panel **replaces the composer**. Three input types, `n of m` pager, ✕ leaves the waitpoint pending and shows a "resume answering" affordance, answers accumulate client-side and submit **once**. Keyboard: `Enter` submit · `Esc` skip · `↑↓` navigate. Reference: all 7 files in `10-questions/` |
| 2 | Uppy + Transloadit uploads | attachment chip with progress, cancel, retry, stable order; `Select from Assets` |
| 3 | Plan progress card | from `metadata.activePlan` live and `chat.activePlan` on reload — same component |
| 4 | Media library, Files modal, Image preview | `07-modals/*` |
| 5 | Credits popover, Add Credits | `08-credits/*` |
| 6 | Mobile ≤768px | sidebar becomes an overlay drawer; captures at 430×932 |

---

### Phase 7 — Polish · last, and timeboxed

Hover states, focus rings, transitions, accessibility pass (keyboard nav, ARIA live region for
streaming text, focus trap in modals — the doc has an accessibility row), template gallery art.

**Timebox this hard.** Fidelity is 20% and polish 10%, but they are earned by *structure matching the
captures*, not by pixel-peeping one component. When time runs out, stop; do not trade Phase 1–4
correctness for a hover state.

---

## 5. Fidelity method — how to actually match the reference

1. **Open the capture. Put it beside the browser.** Never build a component from memory or from this
   document's prose.
2. **Steal the structure before the styling.** Get the DOM hierarchy and spacing rhythm right; colour
   and radius are quick fixes afterwards, layout is not.
3. **Both themes as you go.** Every capture folder has light and dark. Retro-fitting dark mode is the
   classic day-three disaster.
4. **The captures are the spec for states too** — `05-plan-cards/` alone has 13 microstates. If a
   state has a capture, it is in scope; if it doesn't, check `ui-flows.md` before inventing one.
5. **One deliberate exception:** the insufficient-credits state has no capture (reaching it would burn
   the whole credit balance). Design it in the captured language — same card, pill and colour
   vocabulary as the failed-tool card — and note it in the README as a known, deliberate gap
   (decision #34).

---

## 6. Traps specific to this repo

| Trap | Symptom | Guard |
|---|---|---|
| `refetchOnWindowFocus` on | alt-tab mid-stream refetches and fights the overlay | off in query defaults |
| Zustand holding messages | stale content that never refetches | server state → TanStack, always |
| No single-authority filter | two identical bubbles during handover | filter `status==='streaming'` while an overlay owns the run |
| `if (isLive)` inside a renderer | live and persisted views drift apart | same component, one shape |
| Virtualizing too early | can't tell if the bug is rows or the virtualizer | virtuoso last |
| Realtime subscription not closed | free tier caps at **10 concurrent connections** | close on unmount AND explicitly before every token-refresh resubscribe (F13); one tab for the demo |
| Persisting the whole Zustand store | transient panel state restored on reload | `partialize` to drafts + sidebar only |
| `as T` instead of `schema.parse` | backend drift surfaces as `undefined` deep in a component | parse at the api-client boundary |
| Hand-written query keys | invalidation silently stops working | the `qk` factory |

---

## 7. Sequencing against the backend

The two repos interlock. Frontend never waits, because MSW gives it the contract before the server has it.

| BE phase | FE phase | Unblocks |
|---|---|---|
| 0 foundation | 0 scaffold | contracts synced — **FE can now mock every route from the Zod schemas** |
| 1 slice | 1 chat screen | the demo path |
| 2 reliability | 2 states | stop / retry / failure rendering |
| 5 chat mgmt | 3 shell | sidebar list, search, pin |
| 4 plan approval | 4 plan card | waitpoints |
| 6 deferred | 6 deferred | questions, uploads, library |

**The synced `contracts/` directory is COMMITTED to this repo (review #23).** These are two
independent repos, so Vercel's frontend build has no sibling checkout to sync from — an uncommitted
`contracts/` means the deploy fails at import time. Consequences:
- `contracts/` is committed, and never hand-edited. The backend is the source of truth.
- The build script runs `pnpm sync-contracts --check`, which exits non-zero if the committed copy
  differs from the backend's. Drift then fails the build instead of shipping two disagreeing schemas.
- Re-sync is a deliberate commit ("sync contracts"), which also gives a reviewer a clean audit trail
  of when the contract changed.

**Contracts are the handshake.** `pnpm sync-contracts` copies `contracts/` from backend to frontend;
the frontend builds against MSW handlers generated from those same schemas. So a frontend phase can
start the moment the contract exists — not when the endpoint works.
