# UI Specification — screens, routes, and the decisions behind them

Companion to `LLD.md`. **`LLD.md` says *when* something is built; this file says *what* it looks
like and *which capture proves it*.** Every screen below names the capture files it was read from, so
a claim can be checked rather than trusted.

**Precedence when two sources disagree**

1. `Agent Chat Hackathon _ Work Trial.pdf` — the scope authority. Wins everything.
2. The captures in the reference library — the pixel authority for anything the PDF does not name.
3. `ui-flows.md` — behaviour observed in the recordings, for states no still frame shows.
4. This file — decisions made where 1–3 were silent or in conflict.

Capture paths are written relative to the reference library (`06-messages/chat__…`). The library
itself is **not** in this repo and never enters it; only the filenames travel, the same way `LLD.md`
already cites them.

Measurements are read off captures at the widths noted. They are start values to verify in the
browser beside the capture, not gospel.

---

## 0. What the PDF requires of the UI, verbatim

The lines below are the requirements this document exists to satisfy. Everything here answers one of
them.

| PDF § | Requirement |
|---|---|
| 4 Layout | "Responsive chat shell with persistent navigation, message list, pinned composer, and optional artifact panel" |
| 4 Composer | "Multiline input, OpenRouter Free status, attachments, media picker, **plan mode**, send, interrupt, and stop states" |
| 4 Accessibility | "Keyboard navigation, focus management, screen-reader labels, and visible error recovery" |
| 4 Responsive | "Desktop and mobile layouts preserve the same conversation and controls" |
| 4 Fidelity | "Match the live product's spacing, empty states, transitions, loading states, and copy" |
| 5 Content Blocks | "Render text, thinking, tool use, tool result, reasoning, citations, and usage **without losing ordering**" |
| 5 Failure States | "Failed and cancelled turns remain visible, retryable, and distinguishable from successful messages" |
| 8 Chat Management | create, cursor-paginated list **and message history**, search titles + message content, favourite, delete |
| 9 Conversation Stream | "A **virtualized** message list with a stable pinned composer and **no duplicate terminal messages**" |
| 9 Status Model | "thinking → working → complete, failed, cancelled, or **stopping**" |
| 9 Tool Detail | "sanitized tool inputs, outputs, duration, credits, and user-safe failure details" |
| 9 Reconnect | "bounded retries, token refresh, and REST fallback when realtime transport fails" |
| 10 Credits | balance, per-tool cost, per-turn total, ledger, insufficient-credits block with a clear message |
| 11 Diagnosability | "Every failed turn must be explainable from the UI alone — status, safe error message, tool outcomes, partial output, and retry path" |
| Winners | "virtualized messages, stable selectors" · "easy to add … **result renderers**" |

Two of these overturn assumptions worth calling out explicitly:

- **Virtualization is required, not an optimization.** §9 names it in the requirement itself and the
  §9 names it explicitly. It stays in Phase 1 (step 8) — see UI-14.
- **Plan mode is required and the reference has no such control.** A deliberate,
  README-flagged divergence — see D-1.

---

## 1. Route map

| Route | Screen | Auth | Phase | Reference URL |
|---|---|---|---|---|
| `/` | redirect → `/chat` | **public** | **1** | — |
| `/chat` | New chat. Composer only in Phase 1; full empty state in Phase 3 | **public** | **1** | `app.magica.com/chat` |
| `/chat/[chatId]` | **The chat screen** | required | **1** | `app.magica.com/chat/{id}` |
| `/chat/recent` | Tasks page (chat list) | required | 3 | `app.magica.com/chat/recent` |
| `/sign-in/[[...rest]]` | Clerk catch-all | public | 0 | Clerk-hosted equivalent |
| `/projects` `/library` `/tools` `/api-mcp` `/unfair-advantage` | Placeholder pages | required | 7 | same paths |

Everything except `/sign-in` lives under `src/app/(app)/`. That layout is **not** an auth boundary —
see UI-18. Each surface that reads a user's own data protects itself, and no route is protected by a
path pattern (see `proxy.ts`).

### 1.1 Navigation flow

```
                            ┌──────────────────┐
  not signed in  ─────────▶ │  /sign-in        │ ── Clerk ──┐
                            └──────────────────┘            │
                                                            ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │                        (app) — signed-in shell                         │
   │                                                                        │
   │   "/" ────────────────────────────────▶ /chat        (redirect)         │
   │   sidebar "New task" ─────────────────▶ /chat                           │
   │   template card click ────────────────▶ /chat        (prefills only)    │
   │                                                                        │
   │   /chat  ──send──▶ router.replace ────▶ /chat/{id}   (server creates)   │
   │                                                                        │
   │   sidebar "Tasks" / "Recent tasks" ───▶ /chat/recent ──row──▶ /chat/{id}│
   │   Tasks row context menu ─────────────▶ stays on /chat/recent           │
   │                                                                        │
   │   /chat/{id}  ─ files icon ───────────▶ Files modal      (overlay)      │
   │                ─ credits chip ────────▶ Credits popover  (overlay)      │
   │                ─ tool card expand ───▶ Tool detail panel (overlay)      │
   │                ─ asset click ─────────▶ Image preview    (overlay)      │
   │                ─ waitpoint pending ──▶ docked question panel           │
   │                                          (REPLACES the composer)        │
   └────────────────────────────────────────────────────────────────────────┘
```

Overlays never change the URL. They are React state, not routes — the captures show the chat content
staying exactly where it was behind every one of them.

### 1.2 Two routing decisions

**`/chat` is the new-chat page, and `/` redirects to it.** The reference puts the empty state at
`/chat`, not at the root — visible in the address bar of both empty-state captures — so cloning the
URL costs one redirect. This differs from the file map in `LLD.md` §1, which put the empty state at
`app/page.tsx`.

**There is no `/chat/new`.** The send route creates the chat when its path id is `new`, because
there is no `POST /chats`. That sentinel belongs in the API call, not in the address bar: the
reference never shows such a URL, and inventing one is a fidelity miss on the first route anyone
lands on. `/chat` renders with
the sentinel as its chat id, which means: skip the chat query (a `GET /chats/new` would 404), render
the composer, and on send `router.replace` to the real id.

---

## 2. The shell — geometry shared by every screen

Captures: `01-shell/empty-state__{light,dark}.png` · `01-shell/sidebar__collapsed-rail__dark.png` ·
`01-shell/mobile-430__{empty-state-templates,sidebar-drawer-open}__dark.png` ·
`06-messages/chat__user-bubbles+assistant-footer__light.jpg`

```
┌──────────┬───────────────────────────────────────────────────────────┐
│ sidebar  │  top bar:  [model pill ⌄]              [files] [credits]  │
│  260px   ├───────────────────────────────────────────────────────────┤
│          │                                                           │
│  nav     │            ┌───────────────────────────────┐              │
│          │            │   content column ~820px max   │              │
│  Recent  │            │   centred in the remaining    │              │
│  tasks   │            │   width                       │              │
│          │            └───────────────────────────────┘              │
│  ──────  │                                                           │
│  footer  │            ┌───────────────────────────────┐              │
│          │            │   composer — same width,      │              │
│  user    │            │   pinned to the bottom        │              │
└──────────┴────────────└───────────────────────────────┘──────────────┘
```

**The sidebar is a 240px panel inset 8px from the window edge, not a flush 260px column.** An
earlier reading of 260px was wrong. Measured twice, independently, and the two agree:

| Capture | Device scale | Gutter | Sidebar |
|---|---|---|---|
| `01-shell/empty-state__light.png` | 1.0 | 8 px | 240 px |
| a 2560px live capture | 1.25 (menu bar = 30 device px against 24 CSS px) | 10 device → 8 CSS | 299 device → 239 CSS |

The canvas shows through on the panel's left and above it, so the shell pads and the panel rounds.
Its fill is `--bg-subtle` (`#f9f9f9`) in light; in dark it is the same value as the canvas, which is
the depth reversal `globals.css` already carries.

Content column ≈ 820px, composer aligned to the same column, centred in the space *left of* the
sidebar so it shifts when the sidebar collapses. Nav rows sit on a **38px pitch**; the solid pill in
the top bar is **32px** tall.

### 2.1 Breakpoint ladder

| Width | Sidebar | Evidence |
|---|---|---|
| ≥ 1024px | expanded, 260px | all desktop captures |
| ~930px | collapses to an icon rail (~48px) | `05-plan-cards/progress-tracker__2of3-nextstep__narrow-930__dark.png` |
| ~640px | gone entirely; content is full width | `04-tool-cards/ai-gen__expanded-fields__narrow-640__dark.png` |
| ≤ 768px (mobile) | overlay drawer ~2/3 width, content dimmed behind | `01-shell/mobile-430__sidebar-drawer-open__dark.png` |

The two "narrow" captures are the responsive evidence: they were taken at those widths in the real
product, so the ladder is observed rather than invented.

### 2.2 Sidebar anatomy

**Expanded (260px).** Header: `Magica` wordmark, search icon, panel-collapse icon. Nav rows (icon +
label, ~36px tall, rounded hover): New task · Tasks · Projects · Library · Tools · API / MCP ·
Unfair Advantage. Section label `Recent tasks` (small, muted) then chat rows — single line,
truncated with an ellipsis, active row has a filled background. Empty: centred muted `No tasks yet`.

**Footer, collapsible.** Collapsed shows `⋮ More`. Expanded shows `⋮ Less` then: `Available Credits`
+ balance (right-aligned, monospace-ish) · green pill `+15M credits on 21 Sep '26` · `Add Credits`
(solid dark, full width) · `Settings` | `Updates` (two ghost buttons side by side) · `Invite team
members →` · a theme trio segmented control (system / light / dark icons) · the user row (avatar +
name).

**Collapsed rail (~48px).** Icon-only, same order, plus a gear pinned at the bottom. No labels, no
Recent tasks.

**Signed out, the sidebar is the same sidebar.** Same nav in the same order, same `No tasks yet`.
Only the footer changes: the `Magica 101` card and `⋮ More` stay, and below them come `Claim Offer`,
the theme trio and a single full-width **`Sign in`** button — no balance, no `Add Credits`, no
`Settings` / `Updates`, no team invite, no account row. Observed in the live product; see UI-18.

**User menu** (`01-shell/user-menu__dark.png`) opens upward from the user row: avatar + name + email
header, `Manage account`, `Sign out`. This is Clerk's `<UserButton/>` surface — we render Clerk's
component and accept its menu rather than rebuilding it (UI-6).

### 2.3 Top bar

Left: the model pill — a small rounded chip, avatar-ish glyph + label + chevron. The reference reads
`Magica Auto`; ours reads the OpenRouter free model (UI-4). **There is no model selector in the
composer** — the model is chat-level and lives here. Right: folder icon (files in this task) and the
credits chip `⚡ 29.96M`. On the empty state the right side shows an `Upgrade` pill instead and there
is no folder icon — nothing to scope files to.

---

## 3. Screen — the chat screen · `/chat/[chatId]` · Phase 1

The product's primary screen. Captures, in the order they answer questions:

| Question | Capture |
|---|---|
| Overall layout, bubbles, footer | `06-messages/chat__user-bubbles+assistant-footer__light.jpg` |
| First row of a new turn | `03-streaming/thinking__first-row-newchat__light.jpg` |
| Thinking row streaming mid-token | `03-streaming/working-1step__thinking-expanded-token__light.jpg` |
| A full expanded step timeline | `06-messages/completed-cards…` → `05-plan-cards/completed-cards__collapsed-subtitle__light.jpg` |
| Skill / Reasoned / Model-schema rows | `04-tool-cards/step-timeline__skill+reasoned+model-schema__light.jpg` |
| Tool card running, expanded | `04-tool-cards/ai-gen__running-expanded-viewmore__light.jpg` |
| Tool card completed + credits chip | `04-tool-cards/ai-gen__completed+verify-2nd-gen__light.jpg` |
| Tool card failed + red error | `04-tool-cards/ai-gen__FAILED-red-error+self-recovery__dark.png` |
| Terminal text + inline asset | `03-streaming/terminal-text-streaming__image-inline__light.jpg` |
| Two collapsed step groups | `06-messages/terminal__two-step-groups__light.jpg` |
| Footer + hover affordances, dark | `06-messages/footer__credits-icons-time__dark.png` |
| Scroll-to-bottom + image hover | `06-messages/capabilities-answer+scroll-btn+image-hover__light.jpg` |
| Interrupted turn | `06-messages/interrupted__response-was-interrupted-pill__dark.jpg` |
| Mid-run reload | `09-recovery/post-reload__sidebar-skeletons+resumed-thinking__light.jpg` |

### 3.1 User message

Right-aligned bubble, `--surface` background, heavily rounded (≈16px), padding ≈10px/16px, max width
≈ 70% of the column. No avatar.

**Attachments render above the text, inside the same bubble container, and larger than you would
guess** — the image is roughly the full bubble width with the text sitting beneath it. See the user
bubble in `03-streaming/working-1step__thinking-expanded-token__light.jpg`.

Hover reveals, below and right of the bubble: the timestamp and a copy icon
(`06-messages/footer__credits-icons-time__dark.png`).

While an attachment image is still loading, the reference shows a **grey block the size of the
image**, not a collapsed row — visible in the reload capture. Assets need a sized placeholder.

### 3.2 Assistant message

No bubble, no avatar. Plain markdown prose on the canvas, left-aligned, ≈16px with generous
line-height. Bold lead-ins, ordered and unordered lists and inline images all appear in the captures,
so the renderer is real markdown, not `white-space: pre-wrap`.

Order within one assistant message, repeated per segment:

```
[ step group header ]        Working · N steps ⌄   /   Completed N steps ⌄
  [ timeline rows ]          thinking · tool cards · step updates · usage
[ prose ]                    text blocks, rendered as markdown
[ assets ]                   generated images/videos, once, after the text
[ footer ]                   credits · copy · fork · like · dislike · time
```

The two-step-groups capture is the proof that prose sits **outside** the group: `Completed 5 steps`
then a paragraph, then `Completed 6 steps` then another paragraph and the image.

### 3.3 Step group

`Working · N steps` while the segment is live, `Completed N steps` once it is done. Small and muted;
the group is collapsible and **defaults to collapsed once completed** — the terminal capture shows a
header with no rows under it, and `05-plan-cards/completed-cards__collapsed-subtitle__light.jpg`
shows the same header expanded after a click.

**The chevron is present only while the group is open.** Measured: in
`06-messages/terminal__two-step-groups__light.jpg` the two collapsed headers carry no glyph at all,
and in the expanded captures a `⌄` follows the label. No capture can show a hovered-but-closed
header, so hover and keyboard focus reveal it — the header is the click target either way, and an
affordance nobody can find is worse than that small divergence.

**A group holding a failed tool stays expanded.** Every capture of a *collapsed* group is a group
that succeeded, so this costs no fidelity, and the alternative hides the tool's error behind a click
on a turn whose whole job is to explain itself. The rule lives on the timeline segment rather than in
a renderer, so live and persisted turns inherit it from the same place (UI-20).

`Working · N steps` also **emphasises the count** — the label is muted and the `N steps` is not.
`Completed N steps` is uniformly muted.

`N` counts timeline rows in the segment — reasoning blocks *and* tool invocations, not just tools.

### 3.4 Timeline rows

| Block / tool | Row | Renderer | Capture |
|---|---|---|---|
| `thinking` (live) | brain icon (`--fg`) + muted italic `Thinking ⌄`, body in a bordered box at `--fg`, streaming token by token. The transcript is trimmed — models end reasoning with a newline, and `whitespace-pre-wrap` would make the box reserve a blank line for it | `ThinkingRow` | `03-streaming/working-1step__thinking-expanded-token__light.jpg` |
| `thinking` (done) | same row, label becomes italic `Reasoned ⌄` | `ThinkingRow` | `04-tool-cards/step-timeline__…light.jpg` |
| `text` | markdown prose, outside the group | `TextBlock` | `06-messages/terminal__two-step-groups__light.jpg` |
| `usage` | muted token counts inside the step group, so a collapsed turn hides them (UI-9) | `UsageRow` | not captured |
| `citations` | muted link list | `CitationsRow` | not captured (UI-9) |
| `step_update` | clipboard icon + `Step update — <key>: <status>` + ✓ | `StepUpdateRow` | `04-tool-cards/ai-gen__FAILED-red-error+self-recovery__dark.png` |
| `load_skill` / `read_skill_asset` | lightning icon + `Skill` + ✓ + duration, one line, not expandable | `SkillRow` | `10-questions/asking-questions__card-expanded+waiting__dark.png` (`7ms`, `5ms`, `2.9s`) |
| `get_model_schema` | wrench icon + `Model schema` + status + duration + chevron; body = one `Model ID` row | `ModelSchemaCard` | `04-tool-cards/model-schema__cached-7ms+seedance__light.jpg` |
| `gpt_image_2` / `crop_image` / `merge_videos` | sparkles icon + `AI Generation` + status + duration, credits chip right; body = detail rows + `View more` + output | `AiGenerationCard` | `04-tool-cards/ai-gen__running-expanded-viewmore__light.jpg` |
| `submit_plan` | clipboard icon + plan microstates (§4) | `PlanCard` | all of `05-plan-cards/` |
| `ask_questions` | speech-bubble icon + `Asking questions` / `User input received` | `QuestionsCard` | all of `10-questions/` |
| anything unknown | generic card from the registry's `display.label` + `display.icon` | `ToolCard` | — |

**Durations are always rendered**, including cache hits: `110ms`, `5.6s`, `7ms`, `1m 5s`, `4m 25s`.
A `7ms` row is a cache hit and is information, not noise.

### 3.5 Tool card anatomy

```
 ✦  AI Generation   ✓  🖼  ⏱ 1m 5s                          0.21M  ⌄
   ┌──────────────────────────────────────────────────────────────┐
   │  Tool      generate                                          │
   │  Model     gpt-image-2-edit                                  │
   │  Prompt    Convert this app UI screenshot into …             │
   │  Size      Auto                                              │
   │  Quality   High                                              │
   │  View more                                                   │
   │  Error: 400 Your request was rejected by the safety system…  │  ← failed only, red
   └──────────────────────────────────────────────────────────────┘
```

- Header: icon · bold label · status glyph · optional modality glyph · clock + duration. Right edge:
  credits chip (completed only) and the expand chevron.
- **Colour hierarchy, sampled rather than chosen.** Icons `--fg`, labels `--fg`, durations `--fg`.
  The reasoning label is `--fg-muted` while its own transcript is `--fg` — the one row whose label is
  quieter than its body.
- **Icons are colour-coded per tool, not uniformly neutral.** Measured: the skill bolt is `--amber`,
  the `get_model_schema` wrench is `--info` `#5073ea`, and the brain, sparkles and clipboard are plain
  `--fg`. Curiously `Get Pricing` uses the same wrench glyph *un*coloured, so the colour is a property
  of the tool rather than the icon. Anything unmeasured stays neutral rather than guessing.
- **Status glyphs are circled** — `CircleCheck` in `--success`, `CircleX` in `--danger`. A bare tick
  is the wrong shape.
- **The reasoning row is the exception to the header layout**: no duration at all, and its chevron
  sits beside the label. Every other row shows a duration and pushes the chevron to the far right.
- **`Output` is a labelled detail row placed after `View more`**, not a strip below the box — the
  reference orders an AI Generation card `Tool · Model · Prompt · Size · Quality · View more · Output`,
  so the output is never what `View more` is hiding. A **hairline divider** separates it from the
  fields above.
- **`View more` opens the tool detail side panel; it does not expand the card.** Confirmed by
  clicking it in the live product: the card's visible fields do not change and the right-hand panel
  opens with the same detail plus `Credits used`. The card shows five rows; the panel is where the
  rest live, and both read the same ordering helper so they cannot describe one call differently.
- **Detail-row text is 12px**, against 15px prose. Measured by comparing the same word — `Quality` —
  in both, after fixing each screenshot's device scale from a known height: 10.4 CSS px of glyph in
  the reference against our 12.5. The reasoning transcript is the same 12px.
- **`Model` comes from `ToolInvocationDTO.subModelId`**, not from the tool input. The input records
  what was asked for; the sub-model is chosen at execution time, which is why the reference can show
  `gpt-image-2-text` for a call whose input never mentions it.
- Body: a two-column label/value grid, label column ≈ 90px and muted. In light themes the body has a
  hairline border; in dark it is a raised filled surface. Depth reverses — that is why `globals.css`
  carries two palettes.
- `View more` is an accent-coloured link. It **opens the tool detail panel**; it does not reveal the
  remaining fields in place. It renders only when there are more fields than the card shows.
- A failed card keeps its detail rows and appends the provider's sanitized error as a red paragraph
  **inside the same body**, after `View more`. The error is **12px — the same size as the detail
  rows**, not the prose size: `Error: 400 Your` and `Quality` have 15px and 16px ink bands in the same
  lossless capture. No credits chip, because nothing was charged — the failed header carries only the
  chevron on its right edge (`ai-gen__FAILED-red-error+self-recovery__dark.png`).

| Status | Glyph | Notes |
|---|---|---|
| `pending` | none / muted | rare, brief |
| `running` | spinner ⟳ | accent-coloured |
| `completed` | ✓ in a circle | green-ish |
| `failed` | ⊗ in a circle | red |
| `cancelled` | muted, no duration emphasis | derived from run status |

### 3.6 Assets

Rendered once, after the prose, ≈425px wide at an 820px column, rounded ≈8px.

**Hover shows two dark rounded icon buttons at the top-right**, and each carries a tooltip below it:
`Use as reference` on the left and `Download` on the right. We ship only `Download` — using an output
as the next turn's input needs the attachment pipeline, so it is a deliberate omission (D-10) rather
than a miss.

**Clicking the image opens the Image Preview modal**, not a new tab.

`ui-flows.md` records that the reference briefly renders a generated image **twice** during terminal
streaming — once from the markdown link and once in the asset strip — before settling. We render
assets once, after the text. Recorded as D-5.

### 3.7 Assistant footer

Two lines, both small and muted:

```
 ⓢ 0.42M credits
 ⧉   ⑃   👍   👎   2:58 PM
```

Nothing else. No token counts — the reference reports them nowhere, and the footer is the one part of
a turn that is always on screen.

Icons in order: copy · fork/branch · like · dislike, then the time. **Like and dislike render
disabled with a tooltip until Phase 6** — `PATCH /messages/:id/feedback` is a Phase-6 route, and a
button wired to nothing is a bug someone will click. Fork is not in scope at all and is disabled on
the same grounds (UI-7).

### 3.8 Composer

Captures: `02-composer/*` · every chat capture.

```
┌────────────────────────────────────────────────────────────────┐
│ [attachment chips, when present]                               │
│ Send a message...                                              │
│                                                                │
│ 📎  ⌥plan                                        🎙   ( ↑ )     │
└────────────────────────────────────────────────────────────────┘
```

- Corner radius **16px**, measured off the composer's top-left curve in the 1x chat capture.
- **The light composer is a vertical gradient, not a flat fill** — `#f2f2f2` at the top to `#f9f9f9`
  at the bottom, read from the lossless empty-state PNG. In dark it is flat `#191919` with a
  `#1b1b1b` hairline, which is exactly `--surface` on `--border`.
- **Resting height is ~132px, and it is the same on both screens.** An earlier reading of 96px for
  the new-chat composer was wrong. Four measurements:

  | Screen | Capture | Height |
  |---|---|---|
  | new chat | `01-shell/empty-state__light.png`, 1x lossless | **133px** |
  | new chat | a 2560px live capture, 1.25x | **132px** |
  | conversation | `04-tool-cards/ai-gen__FAILED-safety…__dark.png`, 1.25x lossless | **141px** |
  | conversation | `06-messages/capabilities-answer…__light.jpg`, 1x lossy | 126px |

  The two screens differ by under ten pixels and **the sign of the gap flips between capture pairs**,
  so it is measurement noise, not a second box model. One box model, one resting height:

  | | value |
  |---|---|
  | padding top | 16 |
  | text area at rest | **64** |
  | gap | 4 |
  | send button | 34 |
  | padding bottom | 16 |
  | border | 2 |
  | **total** | **136** |

  The `--danger`-tinted stop control replaces the send arrow in that 34px slot without changing the
  box (§3.8 above).
- Placeholder: `Send a message...` inside a chat, `Assign a task or ask anything...` on the empty
  state. Use exactly this copy.
- Auto-grows with content; Enter sends, Shift+Enter inserts a newline.
- Left icon row: paperclip (attach popover) and, in the reference, a plug = "Connect apps" tooltip.
  Integrations are out of scope, so **the plug slot becomes our plan-mode toggle** (D-1).
- Right: mic (visual only, out of scope) and the send control — a circular arrow that becomes a
  **red rounded square stop** while a run is active.
- Attachment chip: small thumbnail with a round ✕ badge on its top-right corner, above the textarea
  (`02-composer/attachment-chip__thumbnail-x__light.jpg`).
- Attach popover, anchored above the paperclip: caption "Add a file from your device or select one
  from your library", then `Select Asset` (ghost, full width) and `+ Upload` (solid, full width).

**The stop control is the send button's disc in red**, not a different shape or size. Measured on a
lossless dark capture whose device scale was fixed from the 24 CSS px menu bar: the disc is 43 device
px → **34 CSS px**, the same footprint as the send arrow, and it holds a **14 CSS px** rounded square.

- The square's fill is `#ba3a28` — **exactly the `--danger` already sampled from the failed tool
  card**, so the stop button needs no red of its own.
- The disc behind it is a separate tint, `--danger-surface`: `#441812` in dark, read losslessly, and
  ≈`#e6d0d2` in light, read off a JPEG and therefore approximate. **It is not `--danger` at an
  opacity** — in both themes its green and blue channels land on the far side of the canvas from
  anywhere an alpha blend could reach, so an opacity utility reproduces neither.
- Captures: `04-tool-cards/ai-gen__FAILED-safety+reasoned-retry+tracker-1of3__dark.png` (lossless,
  the authority for both sizes and the square's colour) ·
  `06-messages/capabilities-answer+scroll-btn+image-hover__light.jpg` (the light disc).

### 3.9 Floating scroll-to-bottom

A circular ⬇ button centred on the content column, visible only when scrolled up
(`06-messages/capabilities-answer+scroll-btn+image-hover__light.jpg`).

Measured at 1x: **≈31px across**, and its lower edge sits **24px above the composer's top border**
(button bottom 932, composer border 957). The diameter is a chord estimate rather than a clean read —
the capture places the button over a white region of a generated image, so no edge of the disc
resolves against its background. 32px is the value built; the fill and border have **no evidence
behind them** for the same reason.

### 3.10 Turn states

| State | Rendering | Capture |
|---|---|---|
| `thinking` | `Thinking ⌄` row alone at the top-left, user bubble top-right, stop button already red | `03-streaming/thinking__first-row-newchat__light.jpg` |
| `working` | `Working · N steps ⌄` header, N incrementing live | `04-tool-cards/step-timeline__…` |
| `waiting` | plan card actionable, or `Waiting for your input...` under a questions card | `05-plan-cards/actionable__…` · `10-questions/asking-questions__card-expanded+waiting__dark.png` |
| `stopping` | client-only, held from Stop click until terminal | not captured — derived (`stoppingRuns`) |
| `complete` | `Completed N steps`, prose, assets, footer | `06-messages/terminal__two-step-groups__light.jpg` |
| `failed` | partial output + tool outcomes preserved, `errorMessage`, Retry | `04-tool-cards/ai-gen__FAILED-safety+reasoned-retry+tracker-1of3__dark.png` |
| `cancelled` | full-width bordered row `ⓘ Response was interrupted`, muted, then the footer | `06-messages/interrupted__response-was-interrupted-pill__dark.jpg` |

The interrupted state is derived from `status === 'cancelled'`, **not** from a `"(Response stopped)"`
text suffix. The reference's own API appends that suffix; rendering it as content would put a string
in the transcript that the user never typed.

**The interrupted row, measured** off `06-messages/interrupted__response-was-interrupted-pill__dark.jpg`
at 1x. It sits between the step group and the footer, so the partial output above it does not move.

| Property | Value | How it was read |
|---|---|---|
| Width | the full content column (x 417→1259) | its edges align with the step-group header and the user bubble |
| Fill | **none** — the interior reads identical to the canvas | sampled mid-row, away from the text |
| Border | 1px, `--border` | an 8px JPEG block averaging 19 against a 17 canvas is a 27-value hairline |
| Height | ≈40px — 15px text on a 24px line, 8px padding each side | border bands centred at y 235.5 and 275.5 |
| Icon | 16px, 12px in from the left edge, 8px before the text | ink bounded x 428→444, y 246→261 |
| Text size | **15px**, the same as prose — *not* the step group's 14px | `Response` and the 15px bubble line `You…p` have identical 14px cap-to-descender bands in the same frame |
| Text colour | `--fg-subtle`, one step dimmer than the step-group header | ink 0.51 of the way from canvas to `Completed 9 steps`, which is `--fg-muted` |

A **failed** turn reuses that row's geometry in `--danger`, carrying `message.errorMessage`. No
capture shows a terminal failed turn — the two `04-tool-cards/ai-gen__FAILED*` captures are of failed
*tool cards* inside a run that was still going — so the colour swap is inference from the row that is
captured, not a reading of one that is not.

**Retry sits at the row's far end**, so the captured left-hand side is unchanged (D-2). It is disabled
with a tooltip while another run holds the chat, rather than firing a request the server would refuse.

### 3.11 Reload recovery

`09-recovery/reload__fullpage-spinner.jpg` → a blank page with a small centred spinner.
`09-recovery/post-reload__sidebar-skeletons+resumed-thinking__light.jpg` → the chat paints **before**
the sidebar list, so Recent tasks is a stack of skeleton bars while the messages are already there.
Attachment images show sized grey placeholders. The `Thinking` row resumes live at the bottom and the
composer already shows the red stop.

That ordering is a requirement, not an accident: the chat query and the chats query are independent,
and the chat must not wait for the list.

---

## 4. Screen — plan approval (inline, in the chat screen) · Phase 4

Captures: all 14 files in `05-plan-cards/`. The plan card is a timeline row, **not an overlay** — the
PDF calls it an "approval overlay" but the reference renders it inline, and the reference wins on
appearance.

Microstates, in lifecycle order:

1. `Plan submitted ⟳` — brief, while the plan registers (`plan-submitted__spinner__light.jpg`)
2. **Actionable card** (`actionable__runall-stepbystep-requestchanges__light.jpg`) —
   Title (bold) + overview paragraph · numbered steps, each with a title, a description and a
   right-aligned per-step credit chip `◈ ~0.2108M` · `Estimated total` row ·
   action row: left hint `Enter run all` (a kbd chip + muted text), right
   `Request Changes` (ghost) · `Step by Step` (ghost) · `Run All` (solid dark, ▶).
3. **Request Changes** (`request-changes__inline-textarea__light.jpg`) — a textarea expands in-card,
   placeholder `What would you like changed? (e.g., 'Skip the narration' or 'Use a more cinematic
   style')`, hint `⌘ + Enter to submit changes`.
4. `Changes requested ↻ ⏱36.3s` in **orange**, collapsed to a header + one-line subtitle
   `Convert Screenshot to Dark Mode (1 steps)`, expandable to detail rows ending in
   `Result  Changes requested: Also add a bit of flair`
   (`changes-requested__orange+result__light.jpg`).
5. `Plan approved ⟳` → `Plan approved ✓ ⏱9.3s`, same collapse behaviour, `Result  Approved by user`
   (`plan-approved__{pending-spinner,done-9.3s}__light.jpg`).
6. Completed cards collapse to header + subtitle + chevron; click re-expands
   (`completed-cards__collapsed-subtitle__light.jpg`).

**Step-by-step mode** (`05-plan-cards/step-mode__*`, `06-messages/step-mode__*`): approval sends
`executionMode: "step_by_step"`, then the transcript shows
`📋 Setting up execution plan — <title> (3 steps) ✓` → bold `Execution mode is step-by-step…` →
`📋 Step update — <key>: in_progress ✓` → the tool runs → `Step update — …: completed — <note>` →
`Step 1 is done — here's the image:` + a remaining-steps list + a check-in question, and **the turn
ends**. The user sends `Next step.` and a new turn continues.

**Plan progress card** (`progress-tracker__{0of3-checklist,1of3-progressbar-cost}__dark.png`):
bold title left, `1/3` right, a thin accent progress bar beneath, then step rows — green ✓ with a
completion note / accent spinner / empty checkbox — each with the **actual** cost right-aligned
(`0.16M`). It persists across turns and reloads, from `metadata.activePlan` live and
`chat.activePlan` on read, through the same component.

**Per-step credits come from the server.** `submit_plan` steps are priced through the tool registry.
The frontend renders the number it is given and never computes or estimates one.

---

## 5. Screen — the Options waitpoint ("Asking questions") · Phase 6

Captures: all 7 files in `10-questions/`. This is the PDF's "Options" waitpoint (p109) and it is
called out under "easy to add … waitpoint types" (p538).

**In the transcript** — a timeline card: `💬 Asking questions ⟳` + chevron; body is a label/value
table with `Message` (a framing sentence) then `Q1 *`, `Q2 *`, … where the asterisk means required;
`View more` when there are more than about four rows. Directly under the card, in plain prose:
`Waiting for your input...`. On resolve the header retitles to **`User input received`** and every row
renders `question → answer` (`user-input-received__resolved-answers__dark.png`).

**The input panel is docked at the bottom and replaces the composer.** Header: the question text
left, `‹ n of m ›` pager and `✕` right. One question at a time.

| Type | Body | Footer | Keyboard hint |
|---|---|---|---|
| image | `Images (0/3)`, dashed drag-and-drop zone with an upload glyph, `Drag & drop your files or Browse Files`, then a full-width `Select from Assets` row | `Save & Next` (disabled until valid) · `Skip` | `Enter to submit · Esc to skip` |
| text | single-line `Type your answer...` | `Save & Next` · `Skip` | `Enter to submit · Esc to skip` |
| select | numbered options, one tagged `Recommended`, chevron on the focused row, a `✎ Something else` escape hatch on the footer's left | `Skip` only | `↑↓ to navigate · Enter to select · Esc to skip` |

Hints render below the panel as centred kbd chips.

Behaviour that matters: **skip is always available, even on required questions** — the UI never
blocks and the agent handles the gap in reasoning. `✕` leaves the waitpoint pending and must leave a
way back in. Answers accumulate client-side and submit **once**. The tool can be called again in the
same turn, so a second, smaller round (`1 of 2`) is a normal state
(`asking-questions__round2-after-skips+answers-inline__dark.png`).

---

## 6. Screen — empty state · `/chat` · Phase 3

Captures: `01-shell/empty-state__{light,dark}.png` · `02-composer/template-prefill__*` ·
`01-shell/mobile-430__empty-state-templates__dark.png`

Centred column: indigo ghost logo · a **live clock** `2:10 ᴾᴹ` (small, meridiem superscripted) ·
h1 `Your AI worker` · subtitle `Work at the speed of thought.` · the composer with the
`Assign a task or ask anything...` placeholder · a row of template category tabs
(`All · Viral Video Formats · Video Special Effects · Content Creation · Branding & Design ·
Image & Editing`) · a three-column masonry grid of template cards (image, bold title, one-line
description).

**A template card is one tile.** The artwork runs flush to the card's top and side edges, and the
title and description sit on a `--surface` panel *inside the same rounded container* — not as loose
text on the canvas below the image. Measured off a dark capture: panel fill `#191919`, 52px tall,
about 10px of padding, title at `--fg` over a description at `--fg-muted`, both truncated to one line.

Clicking a template **prefills the composer** and does not send
(`02-composer/template-prefill__image-editing__dark.png` shows the composer holding a long generated
prompt while the grid stays put). Template cards load as grey skeleton blocks.

Sidebar shows `No tasks yet`. Top bar has no folder icon.

**The empty state's column is 900px, not the conversation's 820px.** Measured off the reference at
two very different viewport widths — 2553 CSS px and ~2000 — and it is 900 in both, so it is a fixed
maximum rather than a fraction of the viewport.

**Vertical rhythm**, in CSS px from the top of the viewport, read off a dark capture at a known 1.25
device scale. The shell above it is an 8px pad plus a 56px top bar, so the first figure is 111px of
padding inside the content area:

| Element | Top | Height |
|---|---|---|
| ghost mark | 175 | 30 |
| clock | 230 | 13 |
| `Your AI worker` | 258 | 19 |
| `Work at the speed of thought.` | 298 | 14 |
| composer top border | **364** | 132 |
| category tab row | **528** | **33** |
| first template card | **594** | — |

That gives a **32px** gap from the composer to the tab row and **32px** from the tab row to the first
card. The tab row sits on a `--surface` band in the dark capture; the light capture shows the row on
the canvas with no band, and `--surface` is close enough to white there that one token serves both.

---

## 7. Screen — Tasks · `/chat/recent` · Phase 3

Captures: `01-shell/tasks-page__{list-filter-select,skeletons-filter-search,select-mode-0selected,select-mode-2selected,context-menu-pin-rename-delete}` (4 dark, 1 light)

- h1 `Tasks` left. Toolbar right: `Filter by All ⌄` (ghost) · `Select tasks` (ghost) · `⊕ New task`
  (solid pill).
- Full-width search field, magnifier + `Search tasks...`.
- Rows: title left, relative date right (`3 minutes ago`, `1 hour ago`, `4 hours ago`), no dividers,
  generous row height, hover background.
- Loading: eight skeleton bars of varying width plus a short bar in the date column.
- **Select mode**: `Select tasks` becomes `Done`; a header row appears with a master checkbox and
  `2 Selected` on the left, and move-to-project / trash / ✕ icons on the right; each row gains a
  checkbox and selected rows are highlighted.
- **Row context menu**: `Pin to top` · `Rename` · `Duplicate` · `Add to project ▸` (submenu:
  `Create project`) · `Delete` (red).

Search covers titles **and message content** (PDF §8). `Duplicate` and `Add to project` belong to
Projects, which is out of scope — they render disabled with a tooltip (UI-7).

---

## 8. Overlays

| Overlay | Kind | Anchor / geometry | Phase | Capture |
|---|---|---|---|---|
| Tool detail | right-side **overlay**, **538px** measured, full height, shadowed | content behind stays put and is clipped, **not** squeezed — the plan card under it is cut mid-word rather than reflowed | 5 | `04-tool-cards/detail-side-panel__light.jpg` |
| Tool detail, maximized | full-window, `Restore` tooltip on the toggle | same content, only the width changes | 5 | `04-tool-cards/detail-fullscreen__input-images__light.jpg` |
| Files in this task | centred modal ≈470px | header `All files in this task` + `Select all` + `⤓ Download all` + ✕; tab pills `All¹ Documents Images¹ Videos Audio Code files`; day group `Today`; row = thumb + name + `PNG · 02:55 PM · 1.3 MB` | 6 | `07-modals/files__loaded-1-image__light.jpg`, `…loading-spinner…` |
| Media library | large **sheet** over the content column, not a small modal | header `Media Library / 0 files` + ✕; search + refresh + `Upload Media`; `Your Media` tabs `All / Generated / My Uploads / Favorites`; Sort/Filter; grid/list toggle; right rail `All / My folders` | 6 | `07-modals/media-library__{empty,loading-skeletons}__light.jpg` |
| Image preview | centred wide modal, two columns | left preview + expand + ✕; right rows `File Name` (editable, pencil) / `Created on` / `Source` / `Size` / `Dimensions`; 2×2 actions `Add to Favorite · Copy Link · Download · Delete File` (red) | 6 | `07-modals/image-preview__details-actions__light.jpg` |
| Image preview of a **generated** asset | same modal, two extra rows | a scrollable `Prompt` block with its own `Copy` button at the top, and a `Model` row (`gpt-image-2-text`). `Source` reads `Generated in chat` rather than `Uploaded`. So the panel is source-aware: the captured file was an upload, which is why it shows neither | 6 | observed live, no capture in the library |
| Credits popover | anchored under the credits chip, right-aligned | `MONTHLY PLAN` · `Available Credits` + balance · `Add Credits` · green renewal pill · `UPGRADE PLAN` row · footer `View usage` \| `Billing details` | 6 | `08-credits/popover__{monthly-plan,plan-balance-usage}__light.jpg` |
| Add credits | centred modal ≈390px | title + subtitle · `$1 = 1 million credits` note · `Amount` chips `$20/$50/$100/$200` · `Custom amount` · summary `Credits / Total` · auto-recharge banner · `Cancel` / `Purchase Credits` | 6 | `07-modals/add-credits__amounts-autorecharge__light.jpg` |
| Attach popover | above the paperclip | `Select Asset` / `+ Upload` | 6 | `02-composer/attach-popover__select-asset-upload__light.jpg` |
| Settings / Upgrade / Clerk | reference-only | — | — | `07-modals/{settings__account__dark,upgrade__*,clerk__*}` |

**The panel's body is not the card's two-column grid.** It is a flowing list of `Label: value` lines
at ~15px, on a **42px field pitch**, with the prompt wrapping full width — measured off
`detail-side-panel__light.jpg` at 1x. `Input Images:` carries a rule under the label with the
thumbnails beneath it. The header is the tool's own icon and label on the left, maximize and close on
the right.

`Escape` closes it. It is an overlay rather than a modal — the transcript behind stays readable, so
there is no focus trap and no backdrop.

The side panel and the image preview can be open **at the same time** (`ui-flows.md`), so overlay
state is not a single slot.

Ours diverge on payment: no `$` amounts, no upgrade plan, no billing details (D-3).

---

## 9. Component → file → capture → phase

| Component | File | Capture | Phase |
|---|---|---|---|
| `MessageList` | `components/chat/MessageList.tsx` | `06-messages/chat__…` | 1 |
| `MessageRow` | `components/chat/MessageRow.tsx` | `06-messages/chat__…` | 1 |
| `Composer` | `components/chat/Composer.tsx` | `02-composer/*` | 1 |
| `StreamingOverlay` | `components/chat/StreamingOverlay.tsx` | `03-streaming/*` | 1 |
| `AssistantFooter` | `components/chat/AssistantFooter.tsx` | `06-messages/footer__…dark.png` | 1 |
| `AssetStrip` | `components/chat/AssetStrip.tsx` | `03-streaming/terminal-text-streaming__…` | 1 |
| `AttachmentChip` | `components/chat/AttachmentChip.tsx` | `02-composer/attachment-chip__…` | 6 |
| `ScrollToBottom` | `components/chat/ScrollToBottom.tsx` | `06-messages/capabilities-answer+scroll-btn…` | 2 |
| `TurnOutcome` | `components/chat/TurnOutcome.tsx` | `06-messages/interrupted__…dark.jpg` | 2 |
| `ConnectionPill` | `components/chat/ConnectionPill.tsx` | none — UI-21 | 2 |
| `Toaster` | `components/Toaster.tsx` | none — UI-19 | 2 |
| `TextBlock` `ThinkingRow` `UsageRow` `CitationsRow` `StepUpdateRow` | `components/blocks/` | §3.4 | 1 |
| `StepGroup` | `components/blocks/StepGroup.tsx` | `06-messages/terminal__two-step-groups…` | 1 |
| `ToolCard` (generic fallback) | `components/blocks/ToolCard.tsx` | — | 1 |
| `AiGenerationCard` | `components/blocks/AiGenerationCard.tsx` | `04-tool-cards/ai-gen__*` | 1 |
| `ModelSchemaCard` | `components/blocks/ModelSchemaCard.tsx` | `04-tool-cards/model-schema__…` | 1 |
| `SkillRow` | `components/blocks/SkillRow.tsx` | `04-tool-cards/step-timeline__…` | 1 |
| `PlanCard` | `components/blocks/PlanCard.tsx` | `05-plan-cards/*` | 4 |
| `PlanProgressCard` | `components/blocks/PlanProgressCard.tsx` | `05-plan-cards/progress-tracker__*` | 6 |
| `QuestionsCard` | `components/blocks/QuestionsCard.tsx` | `10-questions/*` | 6 |
| `QuestionPanel` | `components/questions/QuestionPanel.tsx` | `10-questions/question__*` | 6 |
| `Sidebar` `TopBar` `CreditsChip` `ThemeToggle` `UserFooter` | `components/shell/` | `01-shell/*` | 3 (ThemeToggle: 0) |
| `EmptyState` `TemplateGallery` | `components/shell/` | `01-shell/empty-state__*` | 3 |
| `TasksPage` rows, toolbar, select mode, context menu | `app/(app)/chat/recent/` | `01-shell/tasks-page__*` | 3 |
| `ToolDetailPanel` | `components/panels/ToolDetailPanel.tsx` | `04-tool-cards/detail-*` | 5 |
| `FilesModal` `MediaLibrary` `ImagePreview` `AddCredits` | `components/modals/` | `07-modals/*` | 6 |

---

## 10. UI decisions

Numbered so a review can cite one. Reasons that outlive this file belong in the design docs.

**UI-1 — Shadcn/ui is adopted, and this closes the open question.** The PDF lists
`UI Components — Shadcn/ui` in the non-negotiable stack table, so it is a requirement rather than a
preference. The full screen sweep also shows why: five Radix-backed primitives carry real
accessibility weight the PDF grades — `dialog` (four modals, plus the focus trap), `popover` (attach,
credits), `dropdown-menu` (filter-by, model pill), `context-menu` **with a submenu** (task rows), and
`tooltip` (disabled controls, `Restore`, `Connect apps`, the `⌘⇧O` hint). Collapsibles, tabs and
checkboxes stay hand-rolled — they are a few lines each and the captures do not match shadcn's
defaults anyway. Phase 1 pulls in `cn` + `tooltip` only; later phases add a primitive when the phase
that needs it lands.

**UI-2 — `/chat` runs on the `new` sentinel and skips the chat query.** `GET /chats/new` would 404.
On send, the created chat's real history is prefetched *before* `router.replace`, so the screen never
flashes a spinner between the send and the first read and no `ChatDTO` has to be fabricated.

**UI-3 — `/chat` is the new-chat page; `/` redirects.** Clones the reference URL for one redirect,
and supersedes the `/chat/new` route in `LLD.md` §1's file map.

**UI-4 — the model pill shows the OpenRouter free model and its status.** The PDF asks for
"OpenRouter Free status" in the composer; the reference has no composer-level model control and puts
`Magica Auto` in the top bar. We keep the reference's placement and satisfy the requirement there,
because a second control in the composer would be a redesign.

**UI-5 — credits are strings, formatted with BigInt arithmetic.** `Number()` on a credit value loses
precision. Display is microcredits / 1e6 with an `M` suffix and 2–3 decimals: `5880 → 0.01M`,
`420000 → 0.42M`, `29994120 → 29.99M`. One pure, unit-tested function.

**UI-6 — Clerk's `<UserButton/>` renders the user menu.** The captured menu is avatar + name + email
+ Manage account + Sign out, which is exactly Clerk's surface. Rebuilding it would mean rebuilding
account management behind it.

**UI-7 — out-of-scope controls render disabled with a tooltip, never wired to nothing.** Applies to
like/dislike before Phase 6, fork, mic, `Duplicate`, `Add to project`, and the placeholder nav pages.
People click these; disabled-with-a-reason is honest, silently inert is a bug.

**UI-8 — the send control becomes the red stop while a run is active**, wired to
`POST /runs/:id/cancel`. It takes our own `AgentRun.id`, never Trigger.dev's `triggerRunId` — the two
are not interchangeable and only the former resolves a cancel.

`ActiveRun.status` is only `queued | running | waiting` and `GET /chats/:id/active-run` filters on
exactly those, so a cancelled run makes that route answer **`null`**. There is no `"cancelled"` value
to watch for; that null is the signal. `stoppingRuns` holds the control in its stopped state across
the window between the click and the persisted row arriving — the run is gone from the active-run
route before the cancelled row has been read back, and without the hold the button would flip to a
send arrow and back.

**UI-9 — `usage` and `citations` both render inside the step group.** Neither appears in any capture,
and both are named in the PDF's content-block list. A finished group is collapsed, so at rest neither
is visible — which is what the reference shows — and both are reachable on expand, which is what the
brief asks for. **The assistant footer reports no token counts**: an earlier build put them there and
it was the wrong call, because the reference surfaces token usage nowhere at all and the footer is
always visible.

**UI-10 — plain `<img>` for remote assets, not `next/image`.** Asset hosts are arbitrary CDNs, so
`images.remotePatterns` cannot be enumerated. Costs one ESLint rule off.

**UI-11 — assets and attachments render with a sized placeholder.** The reload capture shows grey
blocks at the image's dimensions, not collapsed rows. Without this, a reload mid-run reflows the
whole transcript as images arrive.

**UI-12 — timestamps and the live clock render after hydration.** Both depend on the viewer's locale
and clock, which the server cannot know; rendering them during SSR guarantees a mismatch. Same
`useSyncExternalStore` pattern `ThemeToggle` already uses.

**UI-13 — no `TopBar` in Phase 1.** It is Phase 3 in `LLD.md` and pulling it forward means pulling
the credits query and the model pill forward with it. The chat screen looks top-bare until Phase 3.

**UI-14 — `react-virtuoso` stays in Phase 1, as step 8.** The PDF names a virtualized message list
in §9, so it is required surface rather than an optimization. It is still built **last** in the
phase — virtualization on top of working rows is easy, debugging both at once is not. Two
consequences of doing it properly:

- **The live run is a list item, not something rendered under the list.** One scroller, so the
  streaming turn scrolls with the conversation and `followOutput` keeps it in view.
- **History pages on `startReached`, and the "load older" button is gone.** No capture shows such a
  control; the reference pages by scrolling. The paging logic is tested against `useChatTranscript`
  directly, because jsdom reports every element as zero-height and the real virtualizer renders
  nothing there — `react-virtuoso` is replaced by a plain list in tests, and virtualization itself is
  a browser check.

**UI-15 — one authority renders a run at a time.** While a `StreamingOverlay` is mounted for a run,
the message list filters out any persisted row with `status === 'streaming'` for that run. The PDF
requires "no duplicate terminal messages" explicitly.

**UI-16 — overlay state is not a single slot.** The side panel and the image preview can be open
together in the reference, so the UI store holds them independently.

**UI-17 — the docked question panel replaces the composer rather than floating over it.** The
capture shows the composer gone, not covered, and the pager and hints occupying its space.

**UI-18 — the chat screen is public; signing in is triggered by an action, not by arriving.** The
reference lets an anonymous visitor reach `/chat` and asks for an account only when they act, so a
blanket boundary on the shell would gate a screen the product leaves open. Consequences:

- `(app)/layout.tsx` carries no auth check. `chat/[chatId]/layout.tsx` does, because a conversation
  belongs to a user and cannot be read anonymously.
- Sending while signed out opens Clerk's modal instead of calling the API, so no request ever leaves
  without a token. The draft is already in the UI store, so the prompt survives the round trip.
- After signing in the visitor presses send once more. Auto-resuming would need a pending-intent flag
  and a listener on the session flipping, which is a race for one keystroke.
- **None of the 77 captures shows an anonymous state** — the two `clerk__*` files are the signed-in
  Manage Account modal — so this rests on direct observation of the live product, recorded here
  because the earlier blanket boundary was an assumption, never evidence.
- **What an anonymous visitor sees is no longer open.** Observed live: the full sidebar with its nav
  and `No tasks yet`; a footer of `Magica 101` · `⋮ More` · `Claim Offer` · the theme trio · a
  full-width `Sign in`; and a top bar of the model pill, a centred `Magica 101` pill, and
  `Sign in` / `Sign up` — with **no credits chip and no folder icon**. Acting on any of them opens
  Clerk's modal, which is the same gate the composer already uses. §2.2 and §2.3 carry the detail.

**UI-19 — one error surface per kind of failure.** A send failure stays inline beneath the composer,
because that is where its restored draft is and the user is already looking there. A cancel or retry
failure has no such anchor, so it goes to a toast. Both carry the backend's `traceId`.

Toasts **do not dismiss themselves on a timer**: the whole point of the `traceId` is that it can be
quoted, and a message that disappears before it is read cannot be. They are capped so a run of
failures cannot stack without limit. **No capture shows a toast anywhere in the reference** — this is
our own design, listed under §15's known gaps rather than presented as observed.

**UI-20 — a step group holding a failed tool stays expanded.** A finished group collapses, which is
what every terminal capture shows; but every capture of a collapsed group is a group that *succeeded*.
Leaving a failure collapsed would put the tool's error one click away on the one turn whose whole job
is to explain itself. The flag is computed on the timeline segment, not in a renderer, so live and
persisted turns get it from the same place.

**UI-21 — the reconnecting pill reports state that already exists.** `LiveRun` already tracks
`live | reconnecting | polling` across the token refresh, the bounded retries and the REST fallback;
the pill renders it and computes nothing. It has no capture — the reference gives no sign of its
transport — so the copy is ours. Silence during a degraded stream is indistinguishable from a turn
that has stopped moving, which is the failure this exists to prevent.

---

## 11. Deliberate divergences from the reference

Each one is README-flagged. The PDF invites this: "if you spot something in the reference that seems
off or could be better, just flag it."

| # | Divergence | Why |
|---|---|---|
| D-1 | **Plan-mode toggle in the composer**, in the slot the reference gives the "Connect apps" plug | PDF §4 requires plan mode in the composer; the reference has no such control (plans are agent-initiated). Integrations are out of scope, so the slot is free |
| D-2 | **Retry on an interrupted turn.** The reference has none — its user simply re-sent | The PDF requires retryable failed/cancelled turns in five places |
| D-3 | **No payment surfaces.** Add Credits is a free top-up: no `$` rows, no upgrade plan, no billing details | Paid services are out of scope. Same modal shape and copy where it still applies |
| D-4 | **Insufficient-credits state is our own design** | Reaching it in the reference would burn the whole credit balance. Built from the captured vocabulary — the failed-tool card's pill, colour and card language |
| D-5 | **Generated assets render once**, after the text. Any link or image in the prose whose URL is already an asset is dropped | The reference briefly double-renders during terminal streaming (markdown link + asset strip) before settling. Ours also has to survive the model writing the URL into its own prose: a free model does that however firmly the system prompt forbids it, so the guard belongs in the renderer, not the prompt |
| D-6 | **No `hasMoreMessages` field** | It is exactly `messagesNextCursor !== null`. Fidelity is judged on the visible product, not on our own API shape |
| D-7 | **Voice input not built**; mic is visual only | Out of scope, and the PDF never asks for it |
| D-8 | **Projects / Library / Tools / API-MCP / Unfair Advantage are placeholder pages** | Locked scope: the sidebar rows exist for fidelity, the pages do not |
| D-9 | **Clerk stays on its development instance**, watermark included | A production instance needs a custom domain we will not buy |
| D-10 | **No `Use as reference` button on a generated asset** — only `Download` | Feeding an output back as the next turn's input needs the attachment pipeline, which is Phase 6 at the earliest. One button that works beats two where one lies |

---

## 12. Loading and skeleton inventory

"Skeletons are not optional polish" — five distinct loading states are captured, and anyone
comparing screens sees a blank flash where the reference shows a skeleton.

| Where | Loading treatment | Capture |
|---|---|---|
| Hard reload, before the shell paints | full-page centred spinner on a blank canvas | `09-recovery/reload__fullpage-spinner.jpg` |
| Sidebar Recent tasks after reload | stack of skeleton bars — the chat paints first | `09-recovery/post-reload__sidebar-skeletons+resumed-thinking__light.jpg` |
| Attachment / asset images | grey block at the image's size | same capture |
| Tasks page list | eight skeleton bars + a short date bar each | `01-shell/tasks-page__skeletons-filter-search__light.jpg` |
| Template gallery | grey card blocks in the masonry grid | `01-shell/empty-state__light.png` (populated) + `ui-flows.md` |
| Media library | `Loading file count...` subtitle + skeleton tile grid | `07-modals/media-library__loading-skeletons__light.jpg` |
| Files modal | centred spinner | `07-modals/files__loading-spinner__light.jpg` |

---

## 13. Keyboard and accessibility map

PDF §4 grades "keyboard navigation, focus management, screen-reader labels, and visible error
recovery".

| Surface | Keys | Notes |
|---|---|---|
| Composer | `Enter` send · `Shift+Enter` newline | |
| Plan card | `Enter` run all (hint rendered in-card) | |
| Request-changes textarea | `⌘+Enter` submit | hint rendered in-card |
| Question panel — text / image | `Enter` submit · `Esc` skip | hints rendered under the panel |
| Question panel — select | `↑↓` navigate · `Enter` select · `Esc` skip | |
| Sidebar New task | `⌘⇧O`, revealed as a chip on hover | `01-shell/sidebar__newtask-shortcut-hover__light.jpg` |
| Modals | focus trap, `Esc` closes, focus returns to the opener | Radix `dialog` (UI-1) |
| Streaming text | `aria-live="polite"` region so a screen reader follows the answer | |
| Tool cards / step groups | native `button` toggles with `aria-expanded` | |
| Status glyphs | never colour alone — glyph + text label | ✓/⟳/⊗ carry `aria-label` |

---

## 14. Formatting rules

| Value | Rule | Examples |
|---|---|---|
| Credits | BigInt string → microcredits / 1e6 + `M`, to a fixed number of **significant digits**, never fixed decimals. Two for amounts, four for balances and estimates. Never `Number()` | `0.010M credits` · `0.42M credits` · `0.0059M` · `29.96M` · `~0.2108M` |
| Duration | ms under 1s; `s` with one decimal under a minute; `Nm Ns` above | `110ms` · `7ms` · `5.6s` · `9.3s` · `1m 5s` · `4m 25s` |
| Message time | today → locale 12-hour; older → `MMM d`; a different year adds it. Client-side only | `2:53 PM` · `Aug 21` · `Aug 21, 2025` |
| Task list dates | relative | `3 minutes ago` · `1 hour ago` · `4 hours ago` |
| File rows | `TYPE · time · size` | `PNG · 02:55 PM · 1.3 MB` |
| Plan estimates | `~` prefix, server-supplied | `~0.2108M` · `Estimated total ~0.2108M credits` |
| Renewal pill | `+15M credits on 21 Sep '26` | green pill |

---

## 15. Capture index — all 77, by the screen they serve

**01-shell (12)** — §2, §6, §7. `empty-state__{light,dark}` · `sidebar__collapsed-rail__dark` ·
`sidebar__newtask-shortcut-hover__light` · `user-menu__dark` ·
`tasks-page__{list-filter-select,skeletons-filter-search,select-mode-0selected,select-mode-2selected,context-menu-pin-rename-delete}` ·
`mobile-430__{empty-state-templates,sidebar-drawer-open}__dark`

**02-composer (4)** — §3.8, §6. `attach-popover__select-asset-upload__light` ·
`attachment-chip__thumbnail-x__light` · `template-prefill__{content-creation__light,image-editing__dark}`

**03-streaming (5)** — §3.1–3.4, §3.10. `thinking__first-row-newchat__light` ·
`new-turn__thinking-start__dark` · `working-1step__thinking-expanded-token__light` ·
`planning-pipeline-skills-schemas-light` · `terminal-text-streaming__image-inline__light`

**04-tool-cards (10)** — §3.4, §3.5, §8. `ai-gen__{running-expanded-viewmore__light,completed+verify-2nd-gen__light,output-row__light,expanded-fields__narrow-640__dark,FAILED-red-error+self-recovery__dark,FAILED-safety+reasoned-retry+tracker-1of3__dark}` ·
`model-schema__cached-7ms+seedance__light` · `step-timeline__skill+reasoned+model-schema__light` ·
`detail-side-panel__light` · `detail-fullscreen__input-images__light`

**05-plan-cards (14)** — §4. `plan-submitted__spinner__light` ·
`actionable__runall-stepbystep-requestchanges__light` · `request-changes__inline-textarea__light` ·
`changes-requested__{orange+result,with-duration-36s}__light` ·
`plan-approved__{pending-spinner,done-9.3s}__light` · `completed-cards__collapsed-subtitle__light` ·
`progress-tracker__{0of3-checklist,1of3-progressbar-cost,2of3-nextstep__narrow-930}__dark` ·
`step-mode__{start__light,approved+setup__light,approved+setup+step-update__dark}`

**06-messages (7)** — §3.1–3.10. `chat__user-bubbles+assistant-footer__light` ·
`footer__credits-icons-time__dark` · `terminal__two-step-groups__light` ·
`capabilities-answer+scroll-btn+image-hover__light` ·
`interrupted__response-was-interrupted-pill__dark` ·
`step-mode__{step1-done-checkin+transparency,terminal+next-step-draft}__dark`

**07-modals (14)** — §8. `files__{loaded-1-image,loading-spinner}__light` ·
`media-library__{empty,loading-skeletons}__light` ·
`image-preview__{details-actions__light,open-animation}` · `add-credits__amounts-autorecharge__light` ·
`settings__account__dark` · `upgrade__{monthly__light,yearly__light,yearly__dark,switch-confirm}` ·
`clerk__{profile,security}`

**08-credits (2)** — §8. `popover__{monthly-plan,plan-balance-usage}__light`

**09-recovery (2)** — §3.11, §12. `reload__fullpage-spinner` ·
`post-reload__sidebar-skeletons+resumed-thinking__light`

**10-questions (7)** — §5. `questions-flow__prompt+skill-rows+upload-1of5__dark` ·
`asking-questions__{card-expanded+waiting,round2-after-skips+answers-inline}__dark` ·
`question__{free-text-2of5,single-select-recommended-4of5,single-select-5of5}__dark` ·
`user-input-received__resolved-answers__dark`

### Known gaps in the reference — design these, do not guess and do not skip

1. **Insufficient credits** — deliberately never captured; reaching it would burn the balance. D-4.
2. **Mobile chat with an active turn** — the mobile empty state and drawer are captured, an active
   streaming turn at 430px is not.
3. **Search with results** — the Tasks-page search *field* is captured, an active query is not.
4. **`usage` and `citations` rows** — named in the PDF, absent from every capture. UI-9.
5. **The generated-asset image preview** — the library only captured an *uploaded* file's preview, so
   the `Prompt` and `Model` rows were found by clicking a generated one in the live product.
6. **`stopping` state** — named in the PDF's status model, not captured. Derived client-side.
7. **A terminal failed turn.** Both `ai-gen__FAILED*` captures show a failed *tool card* inside a run
   that kept going; none shows the message-level failed state at rest. Its row borrows the geometry of
   the captured interrupted row.
8. **Error toasts.** No capture shows one. UI-19.
9. **Any degraded-transport state.** The reconnecting and polling states are ours. UI-21.
10. **The scroll-to-bottom button's fill and border.** The one capture places it over a white region
    of an image, so no edge resolves. Its diameter is a chord estimate; its colours have no evidence.
