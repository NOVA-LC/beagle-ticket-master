# Beagle Ticket Master

Local-first multiplayer ticket queue for Beagle's CS-to-Engineering pipeline. Yjs (CRDT) over y-webrtc + y-indexeddb. No backend. Pyodide-in-worker for executable Python tickets. Dollar-weighted Kanban + Cmd-K command palette.

**Stack:** Vite · React 18 · TypeScript · Tailwind · Yjs · y-webrtc · y-indexeddb · Pyodide (web worker, Comlink) · dnd-kit · cmdk · react-router-dom · Tiptap · Tippy.js · Radix Popover

## Getting started

```bash
npm install   # postinstall copies Pyodide assets to public/pyodide/
npm run dev   # http://localhost:5173
```

## Demo: Cmd-K → Westlake → status change → persists

1. `npm run dev`, open `http://localhost:5173`. The Kanban shows 3 seeded tickets across Triage / Scripting / Review, sorted by MRR at risk.
2. Press **⌘K** (or **Ctrl+K**), type `Westlake` — fuzzy-matches *Open ticket BGL-101 — Westlake Communities…* — hit Enter. URL becomes `/ticket/bgl-101`.
3. Press **⌘K** again. The palette now shows *Action on current ticket*. Press **Tab** on **Change status →** (or just press **s** without opening), pick **Review**, hit Enter. Toast: *Use S next time*.
4. Click *← Back to queue* (or hit **Inbox** in the palette). BGL-101 now sits in the **Review** column. Hard-refresh — IndexedDB rehydrates state. Open a second browser window — y-webrtc replicates the move within ~50ms.

## Multiplayer cursors

Open the same URL in two windows (one of them with `?simulate=david` for a labeled "CS Rep David" cursor). Move the mouse in one — the labeled cursor tracks in the other within ~50ms.

## Executable tickets

Open any ticket detail (e.g. `/ticket/bgl-101`). Click **Run** — Pyodide loads pandas (~12s first time, instant after — IndexedDB-cached), runs the Westlake reconciliation script, streams stdout line-by-line, and persists the run to the ticket's append-only audit log. Refresh to verify it survived.

Keyboard shortcuts inside a ticket:
- `⌘↵` / `Ctrl+↵` — Run script
- `s` — Change status
- `a` — Assign to
- `t` — Add property tag
- `r` — Re-run last script

## 90-second screen-recording demo

**Setup:** Open https://beagle-ticket-master.vercel.app at 1440×900. Have a second window queued.

**0:00–0:25 — Board.** Land on the Kanban: 5 tickets, sorted by MRR at risk. The MRR badges grade red→amber→slate per threshold. Press `?` — keyboard cheatsheet appears, briefly. Esc. Drag **BGL-102** (Pinecrest) from *Triage* to *Scripting*. Toast bottom-right: *"Moved BGL-102 to Scripting · Undo"*. Click Undo — card snaps back, audit trail records both moves.

**0:25–0:55 — Ticket.** Press ⌘K, type "westlake", hit Enter — routes to BGL-101. Sidebar metadata: status pill with blue dot, $1,648 MRR badge in red, Westlake Communities tag, linked tickets chips. Timeline already has David's escalation comment, Lila's status change, the inter-ticket bi-link reply, and the historical pandas run. Click *Run a Python script* → expand, Run. Pyodide loads from CDN (~3-8s warm), output streams. Toast: *"Ran 1.2s · output below"*.

**0:55–1:30 — Composer.** Scroll to the sticky composer. Type `[[wes` — Tippy popover offers Westlake Communities. Enter. Hover the blue chip — AIContext popover fades in (~120ms): *"…41% verified coverage rate, 17 uninsured units, **$138K/year in liability exposure**"*. Type a sentence, ⌘↵ to submit. Comment lands in the timeline with the bi-link still interactive. Hard refresh — IndexedDB rehydrates everything including the new comment. Open a second browser window — y-webrtc replicates state in ~50ms; awareness avatars stack in the top-right.

## Demo: multiplayer seeding

1. Open a fresh browser → see all 5 tickets (BGL-101…105) populated by `seedIfEmpty`. The timeline on BGL-101 already has a comment from David, a status change to Scripting, an @-mention reply with bi-links to `[[westlake-communities]]`, `[[yardi-sync]]`, and `[[BGL-103]]`, and a captured pandas reconciliation `script_run` event.
2. Open a second browser window → tickets sync via y-webrtc. The race-safe seed detects peer state and skips re-seeding (no duplicate events).
3. Open a third window in **incognito** (no IndexedDB cache) → still receives full state from peer 1 within ~50ms; again no re-seed because peer.synced fires before the 1s timeout.

## Demo: full ticket flow

1. `npm run dev` — visit `/`. Three tickets, sorted by MRR.
2. Drag **BGL-102** from *Triage* → *Scripting*. Card moves; status_change event lands in the audit log.
3. ⌘K → "Open BGL-101" → `/ticket/bgl-101`. Right-side **Properties** sidebar shows status, assignee, MRR, tags, linked tickets.
4. Click **Run a Python script** → expand the runner. Click *Run* — Pyodide loads from CDN, pandas reconciliation streams. Run persists in the timeline.
5. In the sticky Composer at the bottom, type a comment with `[[Westlake Communities]]`. Hover the link — AIContext popover fades in with the $138K exposure line. ⌘↵ submits.
6. Refresh — everything (drag, run, comment, status change) persisted via IndexedDB.

## Demo: bi-link composer + AI context

1. Open `/ticket/bgl-101`. The Composer sits below the Run pane.
2. Type `[[wes` — Tippy popover opens with *Westlake Communities*. Press Enter (or click). The bi-link inserts as a styled blue chip.
3. Hover the chip — the AIContext popover fades in (~120ms) and shows: *"Westlake Communities currently has a 41% verified coverage rate, 17 uninsured units, and **$138K/year in liability exposure**…"*. Click *Show open tickets for this property* — the Kanban filters to that property.
4. Type a paragraph + a bi-link. **Refresh.** The composer mounts with a *Draft restored — N minutes ago* banner and your full content rehydrated. × dismisses + clears.
5. Hit ⌘↵ to submit. The comment lands as a `comment` event on the ticket's append-only Y.Array.

## Architecture notes

- **Single Y.Doc singleton** at `src/lib/yjs/doc.ts`. Each ticket is a `Y.Map`, not a JSON blob; events live in a `Y.Array` and are append-only (deletions are tombstones).
- **Pyodide runs in a Web Worker** via Comlink. The main thread never blocks on pandas import.
- **URL is the source of truth for filters.** `useUrlState` reads/writes search params; the Kanban derives rows from Yjs + filters with no intermediate React state.
- **Race-safe seeding.** `seedIfEmpty` waits for IDB hydration + 1s for any peer sync before seeding. A `_meta.seeded` flag prevents duplicate seeding across concurrent clean clients.
