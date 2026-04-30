# CLAUDE.md — Project context for AI agents

This file is the entry point for any LLM continuing the Beagle Ticket Master build. Read it before touching code; many architectural choices here are non-obvious and are the result of explicit constraints in earlier phases.

## Product context

Beagle is a PropTech company selling a renter's-insurance-waiver program to multifamily property managers. This tool is **internal only** — it's how CS reps escalate data/script requests to the Data Eng team. The core problem it solves: CS Slacks Eng a Westlake reconciliation request, Eng asks for context, three days of ping-pong. This app fuses a ticket queue with an embeddable Python runtime, sorted by **MRR at risk**.

Internal users:
- **CS reps** — file tickets, attach property names, escalate to Eng
- **Data Eng team** — pick up tickets, run reconciliation scripts inline, mark resolved

## Stack

- **Vite 6** + **React 18** + **TypeScript** (strict)
- **Tailwind 3** + handful of vendored shadcn-style primitives (no full shadcn install — see `src/components/ui/`)
- **Yjs** + **y-webrtc** (peer sync + presence/awareness) + **y-indexeddb** (persistence)
- **Pyodide 0.27.7** in a Web Worker via **Comlink**
- **dnd-kit** (Kanban DnD)
- **cmdk** (command palette)
- **react-router-dom** v6 (Browser router, useSearchParams for filter state)

No backend. The whole app is a static SPA — Vercel just serves `dist/`.

## Build phases — what's done, what's next

### ✅ Phase 1 — Yjs base + multiplayer board
Y.Doc singleton at `src/lib/yjs/doc.ts`. Tickets are `Y.Map`s (not JSON blobs). Each ticket owns an append-only `events` `Y.Array`. WebRTC + IndexedDB providers bind to the same doc. Custom `useYMap` / `useYArray` / `useYAwareness` hooks use `useSyncExternalStore` for tearing-free updates. Live cursors via awareness, throttled to 50ms.

### ✅ Phase 2 — Executable ticket (CodeRunner)
Pyodide runs in `src/workers/python.worker.ts` (Comlink-exposed). Streamed stdout/stderr via `pyodide.setStdout({ batched })` → main thread. 30s runaway-script timeout via `worker.terminate()` + respawn. Successful runs append a `script_run` event to the ticket's audit log.

### ✅ Phase 3 — Dollar-weighted Kanban + Cmd-K palette
`RevenueKanban` at `/`: three main columns (Triage / Scripting / Review) + collapsed Done rail. dnd-kit handles drag-between-columns; drop = `ticket.set('status', newStatus)` + audit event. Cmd-K palette at app root: Jump (fuzzy ticket search), Action on current ticket (sub-pages via Tab for status / assign / tag), Filter board (URL-based), Navigate. Position memory per `route + page`.

### ✅ Phase 4 — Tiptap composer with bi-link entities
`<Composer />` is mounted on the ticket detail (between CodeRunner and RunHistory). Tiptap React + StarterKit (no dropcursor/gapcursor). Custom `BiLink` extension uses `@tiptap/suggestion` with `char: '['` + an `allow()` callback that requires the prior char to also be `[` — that's the canonical workaround for Tiptap's single-char trigger limit when you need `[[`. Bi-links render via a React node view that wraps a Radix Popover; hover-OR-click anchored, with manual delays so crossing the trigger→content gap doesn't flicker. `AIContext` reads from `src/lib/entities.ts` (no API yet). Drafts persist to `localStorage` keyed by `draft:ticket:<id>`, debounced 500ms; restore-banner on mount with relative timestamp + dismiss. `SlashMenu` extension scaffolds `/run` (inserts a Python code block) and `/template` (stub). Comments serialize to markdown via a custom Tiptap-JSON walker (`composer/markdown.ts`) and append as `comment` events to the ticket's audit log.

### ✅ Phase 5 — Master AppLayout + data router
Migrated from `<BrowserRouter>` JSX to `createBrowserRouter` (data-router pattern). Mounted `<AppLayout>` shell with collapsible sidebar (⌘\\ toggles, localStorage-cached), top header with brand mark + click-to-open palette + awareness avatars + user menu, and `<main>` scroll container. Sidebar nav active-state matches by **pathname AND filter params** so Inbox/High-Liability/Reconciliations don't all light up at once. New `<TicketDetail>` page at `/pages/TicketDetail.tsx` is a 70/30 split-pane: main pane has inline-editable title (controlled `<input>`, not Tiptap — see "Editable title trade-off" below), AIContextStrip (collapsible if any property tag matches a registered entity), full `<EventTimeline>` rendering all event types (comments via read-only Tiptap so bi-link AIContext popovers stay interactive), `<CodeRunnerCollapsible>` (auto-expanded if last event was a script_run), and a sticky-bottom Composer. Sidebar pane is `<MetadataSidebar>` with Status/Assignee selects, editable MRR field, tag chips, linked tickets, watchers stub, timestamps. `<NotFound>` is the route error fallback.

Comments now persist BOTH `body` (markdown) and `bodyJson` (Tiptap JSON snapshot). Read-only timeline renders via Tiptap with the JSON; markdown is the export format. Legacy comments without bodyJson fall back to a `<pre>` of the markdown.

### ✅ Phase 6 — Hyper-specific 5-ticket seed + race-safe seeding
Replaced the Phase-1 3-ticket seed with 5 tickets that have full event histories: BGL-101 (Westlake — 103 Uninsured Error, with the historical pandas reconciliation run captured as a `script_run` event), BGL-102 (Pinecrest action list request), BGL-103 (Yardi sync ingestion failure with auto-resolved key rotation), BGL-104 (compliance dashboard portfolio mismatch), BGL-105 (auto-trigger reconciliation feature request).

`src/lib/seed.ts` now owns both the data AND the race-safe `seedIfEmpty(doc, tickets)` function. The race algorithm:
1. Await `indexeddbProvider.whenSynced` (so we don't seed over local state).
2. If `tickets.size > 0` → bail.
3. Race `webrtcProvider.on('synced')` vs a 1000ms timeout.
4. If 'synced' wins → a peer has data, bail.
5. If timeout wins AND `tickets.size === 0` → seed atomically inside `doc.transact`, with a `_meta.seeded` flag set inside the transaction as defense-in-depth against simultaneous fresh clients.

Each seed comment's `body` (markdown) is parsed at build-time into a Tiptap JSON `bodyJson` field — `[[entity-id]]` references resolve through the entity registry into `biLink` nodes. This means seeded comments render with interactive AIContext popovers in the read-only timeline (the demo's punchline).

The Yjs room name was bumped `v1` → `v2` so users with cached Phase-1 data get fresh state. Old IDB databases are unreferenced but not auto-deleted.

### ✅ Phase 7 — Polish to demo quality
Sonner replaces the homegrown toaster (same `toast()` import surface, swipe-to-dismiss, Undo affordances on status changes). `<ErrorBoundary>` wraps every route inside AppLayout — chrome (sidebar, palette, header) keeps working when a route subtree throws. `<GlobalShortcuts>` provider owns `g i`/`g h` chord shortcuts (1.5s window), `c` (compose new ticket modal — full Radix Dialog with title + assignee), `j`/`k`/`Enter` board navigation via custom events, and `⌘/` to focus search. `<KeyboardCheatsheet>` on `?` is a Radix Dialog with grouped shortcut tables. Status pills got the dot-plus-label treatment with one shared color token per status (zinc/blue/amber/emerald). MRR badge keeps text as primary signal + 💰 emoji + tier-color bg. `TicketCard` is `memo`'d; selected card shows a `ring-2 ring-blue-500` for j/k navigation. Mobile Kanban (≤767px) becomes a tab switcher (Triage / Scripting / Review / Done) with 44px touch targets. Cmd-K palette is full-screen on mobile. CodeRunner shows a state dot in its header (slate idle / amber running / emerald ready / red error). Toast on every status drag with one-click Undo that re-applies in a single transaction. Inter font features (`tnum`, `ss01`, `cv11`) for tabular numerics. Global 120ms hover / 80ms press transitions. NotFound now reads the missing ticket id from the URL and offers "Compose new ticket →" as a CTA. dnd-kit `KeyboardSensor` added for keyboard drag-drop. axe-core wired in dev mode (lazy-imported so it never ships to prod). Composer has `role="textbox" aria-multiline="true" aria-label="Comment"`.

### 🔜 Phase 8 — *not yet built*
Open candidates: real watchers (Yjs `watchers` Y.Array per ticket), notification system (browser notifications on @-mentions or status_change-while-watching), threaded replies on comments, settings page, real entities populated from Yjs property metadata, sortableKeyboardCoordinates for proper cross-column keyboard DnD, full inline `/run` execution as a node view inside the composer.

## Hard architectural rules — DO NOT VIOLATE

1. **The Y.Doc lives in a singleton.** Never construct a second `Y.Doc()` for tickets. Add new collections to the existing doc via `doc.getMap('newCollection')`.
2. **Each ticket is a `Y.Map`, not a JSON blob.** Serializing the whole ticket as a string defeats CRDT merging. New fields go on the map directly.
3. **Events are append-only.** Deletions are tombstones (`type: 'comment_deleted'` event with `targetId`). Never remove from the `events` `Y.Array`.
4. **No CDN script tags.** Pyodide is imported from npm via `import { loadPyodide } from 'pyodide'`. (Pyodide's *asset URL* points to jsdelivr — see "Pyodide note" below; the spec banned `<script>` tags, not data URLs.)
5. **Pyodide stays in a worker.** Pandas import takes ~12s cold; on the main thread that freezes the UI. Use the existing `usePyodide` hook.
6. **URL is the source of truth for board filters.** Filter state lives in `useSearchParams`, not `useState`. The Kanban derives `rows` from `useYMap(tickets)` + `useUrlState()`; there is no third place that holds filter state.
7. **dnd-kit `activationConstraint: { distance: 6 }`** is what makes click-to-navigate and drag-to-move coexist on the same card. Don't drop the constraint.
8. **No triple-coding for severity.** Pick at most two of {color, icon, weight, copy}. Current `MrrBadge` uses bg-color + 💰 emoji = two signals. Don't add bold or alarm copy.

## Non-obvious decisions worth knowing

### Pyodide indexURL → jsdelivr CDN
The npm `pyodide` package only contains the **runtime** (`pyodide.mjs`, `pyodide.asm.wasm`, `python_stdlib.zip`, `pyodide-lock.json`). It does NOT contain the package wheels (pandas ~13MB, numpy ~3MB). Earlier phases planned to copy `node_modules/pyodide/*` to `public/pyodide/` via a postinstall script — that runs and the runtime files do get copied — but `loadPackage('pandas')` would 404 without the wheels.

Three options were considered:
- (A) Download the full `pyodide-{version}.tar.bz2` from GitHub releases at build time (~200MB)
- (B) Set `indexURL` to `https://cdn.jsdelivr.net/pyodide/v0.27.7/full/`
- (C) Write a custom `lockFileURL` that points wheels to CDN and runtime to local

We picked **(B)**. The postinstall script (`scripts/copy-pyodide.mjs`) still runs to keep the runtime locally available in case we want to swap to (A) or (C) later, but at runtime the worker fetches everything from jsdelivr. If you switch to a self-hosted setup, change `PYODIDE_INDEX_URL` in `src/workers/python.worker.ts` and download the full distribution into `public/pyodide/`.

### Worker imports `pyodide` directly + Vite externalization warnings
At build time you'll see warnings like `Module "node:fs" has been externalized for browser compatibility, imported by ".../pyodide.mjs"`. These are harmless — Pyodide branches on environment at runtime and never executes the Node-only paths in a browser worker. The externalized stub is never invoked. **Do not** try to "fix" these with `optimizeDeps.exclude` or polyfills; the current setup works.

### Seed bodies → Tiptap JSON at build time
`src/lib/seed.ts` ships a tiny `[[entity]]` → biLink Tiptap-JSON parser. Every seed comment is converted into both a markdown `body` AND a `bodyJson` so the read-only timeline renders interactive bi-link chips on freshly-seeded tickets. If you add a new seed comment that references an entity not in `src/lib/entities.ts`, the bracketed reference renders as literal text (parser fallback) — add the entity rather than letting the demo go flat.

### Race-safe seeding lives in seed.ts, not doc.ts
`doc.ts` no longer owns seeding. `seed.ts` imports `doc, tickets, webrtcProvider, indexeddbProvider` and exposes `seedIfEmpty(doc, tickets)`. `main.tsx` calls it once at module load (before React mounts). Don't move it back inside a component effect — StrictMode would invoke it twice and you'd race against yourself.

### Status enum migration
Phase 1 used capitalized statuses (`'Triage'`, `'In Progress'`, `'Blocked'`, `'Done'`). Phase 3 lowercased them (`'triage'`, `'scripting'`, `'review'`, `'done'`). `doc.ts` runs an idempotent migration on IDB hydrate (`migrateLegacyStatuses`). If you add new statuses, update the enum in `src/lib/yjs/types.ts` AND extend the migration map.

### Event shape: flat fields, discriminated union
Events are a discriminated union on `type` with **flat fields** at the top level (no `payload` wrapper). E.g. `script_run` has `code`, `stdout`, `stderr`, `durationMs`, `runBy` directly on the event. `appendTicketEvent` accepts `DistributiveOmit<TicketEvent, 'id'>` so adding a new event variant requires zero changes to the helper signature — just extend the union in `types.ts`.

### Y.Map type variance
Yjs types are invariant in their value parameter. `Y.Map<Y.Map<unknown>>` is **not** assignable to `Y.Map<unknown>`. `tickets` is therefore typed as `Y.Map<unknown>` and consumers cast `tickets.get(id)` to `Y.Map<unknown> | undefined`. This is the simplest workaround — don't try to fix it with generics on the hooks (`useYMap<T>(map: Y.Map<unknown>)` is the contract).

### Tiptap `[[` two-char trigger
`@tiptap/suggestion`'s `char` config is single-character. `char: '[['` would silently truncate to `[` and fire on every word. The fix in `src/components/composer/BiLink.ts` is `char: '['` + `allow({state, range}) => state.doc.textBetween(range.from - 1, range.from) === '['`. The `command` callback then deletes from `range.from - 1` (one to the left of the captured range) so the leading `[` is gone too. Don't try to "cleanup" by changing the trigger — this is the working approach.

### Tiptap node view for bi-links uses Radix Popover (not HoverCard)
The spec asked for Radix Popover specifically. Hover behavior is wired manually with `onPointerEnter`/`onPointerLeave` on both Trigger and Content + a small delayed-close timer. `data-state` attribute on `.aicontext` drives the keyframe fade-in/out (120ms in, 80ms out, defined in `index.css`). If the gap between trigger and content gets bigger than 6px, increase `sideOffset` rather than the close delay.

### Editable title trade-off
Phase 5 spec asked for "Tiptap single-line" inline-editable title. We ship a controlled `<input>` instead. Why: a Tiptap instance per ticket header (one per `/ticket/:id` mount) would add ~200ms of init time and an editor instance to GC; a single-line title doesn't need rich text. Behavior is identical from the user side (click to edit, Enter commits, Escape reverts, blur commits). If you later need marks in titles, swap `EditableTitle.tsx` for a Tiptap with a custom Document that has `content: 'text*'` and a `handleKeyDown` that traps Enter.

### Sidebar nav active-state matches both path AND filter params
`useIsActive()` in `Sidebar.tsx` is the canonical way: parse the link target as a URL, compare both pathname and the filter params declared on each NavItem. NavLink's default would highlight every nav item that points to `/`, which is wrong when filters disambiguate them.

### Sticky composer is sticky inside `AppLayout`'s scroll container
`<main>` in `AppLayout.tsx` is `overflow-auto` — that's the scroll context. The Composer in `pages/TicketDetail.tsx` uses `sticky bottom-0 -mx-6` to span the gutter and stick relative to that container. Don't add `overflow: auto` on intermediate divs — that would break sticky positioning.

### Avatar + cn — vendored
`src/components/ui/avatar.tsx` is a 20-line component, not the Radix-backed shadcn version. `src/lib/utils.ts` is just clsx, not clsx + tailwind-merge. Neither is wired through shadcn's CLI. Add new shadcn components by either running `npx shadcn add <component>` (which will create `components.json` for you) or by vendoring them by hand here.

### `?simulate=david` URL flag
`getCurrentUser()` reads `?simulate=` to pretend to be a known persona. Used for screencast demos where you want a labeled "CS Rep David" cursor in one tab and your real engineer cursor in another. Keep this — it's how the live-cursors story is demoed.

## Local dev

```bash
npm install        # postinstall copies Pyodide runtime to public/pyodide/
npm run dev        # http://localhost:5173
```

Two browser windows on `localhost:5173` are peers via WebRTC defaults — moves and edits replicate in ~50ms.

## Deploy

Deployed to Vercel. `vercel.json` has SPA rewrites that exclude `/assets`, `/pyodide`, and `/favicon.ico` from the catch-all so static asset paths still resolve. The first cold build is slow because npm install pulls Pyodide (~50MB). Subsequent builds reuse npm cache.

## File tree (truncated)

```
src/
  lib/
    utils.ts                 # cn() — clsx wrapper
    user.ts                  # getCurrentUser() with ?simulate= persona resolver
    url-state.ts             # useUrlState() — board filters live in search params
    yjs/
      doc.ts                 # Y.Doc singleton, providers, seedIfEmpty, appendTicketEvent, legacy migration
      types.ts               # TicketStatus enum, TicketEvent discriminated union
      seed.ts                # 3 seeded tickets (BGL-101/102/103)
      useYMap.ts             # tearing-free Y.Map snapshot via useSyncExternalStore
      useYArray.ts           # same for Y.Array
      useYAwareness.ts       # awareness states for cursors
    python/
      usePyodide.ts          # singleton worker, status state, run() with timeout-respawn
  workers/
    python.worker.ts         # Comlink-exposed Pyodide API
  components/
    ui/
      avatar.tsx             # vendored
      toaster.tsx            # 30-line toast emitter (not sonner)
    StatusPill.tsx
    LiveCursors.tsx          # awareness-driven labeled cursors
    CodeRunner.tsx           # editor + run + streamed output
    RunHistory.tsx           # accordion of past script_run events
    TicketDetail.tsx         # / wrapped routes here
    kanban/
      MrrBadge.tsx           # bg-color tier + 💰 emoji (two signals max)
      TicketCard.tsx         # draggable, navigate-on-click
      Column.tsx             # droppable, 'main' | 'rail' variant
      RevenueKanban.tsx      # the / route, FilterChips
    palette/
      usePaletteActions.ts   # action list given route + page
      CommandPalette.tsx     # Cmd-K modal, sub-pages via Tab/Backspace
  App.tsx                    # <Routes>, mounts LiveCursors + CommandPalette + Toaster
  main.tsx                   # BrowserRouter
  index.css                  # @tailwind + Prism token colors
```
