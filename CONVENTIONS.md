# magica-frontend

Agent-chat frontend for the Magica clone. Next.js App Router + React, TanStack Query for server
state, Zustand for browser state, Trigger.dev Realtime for live runs.

**Design docs:** `LLD.md` — the structure, the rendering model in §5, realtime and recovery in §6,
and the traps this stack sets in §9. Read it before adding anything substantial.

## Rules

- **Node 20.9+** (`.nvmrc` pins 20.20.2), pnpm. `nvm use` before any command.
- **`src/contracts/` is GENERATED. Never hand-edit it.** It is copied from the backend by
  `pnpm sync-contracts`, and `pnpm build` runs `--check` so a stale copy fails the build. Changing a
  contract is a backend change followed by a re-sync commit.
- **No raw `fetch` in a component.** `lib/api-client.ts` holds the only `fetch`; components call
  typed service functions through `useApi()` and TanStack Query. Responses are parsed with the
  contract schema, never cast.
- **Server state is TanStack Query; browser state is Zustand.** Anything the server knows — messages,
  chats, credits — belongs in Query. A message list in Zustand goes stale and never refetches.
- **Query keys come from the `qk` factory** in `lib/query-client.ts`. Hand-written key arrays desync
  and invalidation silently stops working.
- **`qk.activeRun` must use `staleTime: Infinity`.** It mints a fresh realtime token per call, so any
  finite stale time rebuilds the subscription against a free-tier cap of 10 concurrent connections.
- **Tear down a realtime subscription before resubscribing.** Same 10-connection cap; a leaked
  subscription per token refresh looks exactly like a broken stream on a long session.
- **Build all UI from the reference captures** (77 files, 10 folders). The live product is the
  pixel reference — do not invent layout. Sample colours from the captures rather than guessing;
  depth *reverses* between themes, which is why `globals.css` has two full palettes.
- **A block renderer must never crash on an unknown type.** The backend can ship a tool before the
  frontend knows about it; fall back to the registry's `display.label` and `display.icon`.
- **Credits arrive as strings** and stay strings. `Number()` on a credit value loses precision.

## Testing

- **MSW is the backend.** `tests/msw/` holds contract-typed fixtures and handlers for every Phase-1
  route. Extend `fixtures.ts` rather than hand-shaping a response — the fixtures are typed as the
  contracts, so a backend schema change fails `pnpm typecheck` here instead of producing a
  wrong-looking screen.
- `onUnhandledRequest: "error"` is deliberate. A component reaching an unmocked URL is a bug in the
  component.
- **Realtime cannot be mocked.** `useRealtimeRun` and `useRealtimeStream` talk to Trigger.dev, not to
  our API, so MSW never sees them. Drive the streaming overlay in tests by handing it a
  `RunMetadata` object directly — `fixtures.runMetadata` and `fixtures.streamedText` exist for this.
  "Tokens actually appear" is an integration check against the running backend, not a unit test.
- **The default active-run fixture reports a RUNNING run**, which correctly disables the composer.
  Any test about sending must `server.use(noActiveRun)` first, or it will assert against a disabled
  button and the failure will not say why.
- **What `tests/setup.ts` provides**, so it is not rebuilt per file: `matchMedia` and
  `ResizeObserver` stubs; `next/navigation` mocked, with navigation asserted through
  `tests/router-mock.ts`; `@clerk/nextjs` mocked behind a flippable signed-in flag
  (`tests/clerk-mock.ts`); and `react-virtuoso` replaced with a plain list, because jsdom reports
  every element as zero-height and the real virtualizer then renders nothing.
- **jsdom has no cascade.** A test can assert that an element carries a class; it cannot assert the
  colour that class resolves to. Say which of the two a test actually covers rather than implying the
  colour is verified.
- **`jsdom` is pinned to 26.** Version 30 needs a Node 22 API this project does not target.

## Comments

No inline comments. JSDoc only on exported boundaries — **one or two lines saying what it does**, plus
at most one sentence for an invariant a caller can break. No narration of how the code came to be, no
defending a choice against alternatives. Strict TS and Zod schemas are the documentation. Reasons
live in the design docs, not in the code.

## Commits

- Subject line only unless a body is genuinely needed. One commit per coherent unit of work, not one
  per file.
- `git add` explicit paths, never `git add -A`.
- Never commit secrets. Keys live only in gitignored `.env`.
