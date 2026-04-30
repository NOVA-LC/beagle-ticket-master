# Beagle Ticket Master

Local-first multiplayer ticket queue for Beagle's CS-to-Engineering pipeline. Yjs (CRDT) over y-webrtc + y-indexeddb. No backend. Pyodide-in-worker for executable Python tickets. Dollar-weighted Kanban + Cmd-K command palette.

**Stack:** Vite · React 18 · TypeScript · Tailwind · Yjs · y-webrtc · y-indexeddb · Pyodide (web worker, Comlink) · dnd-kit · cmdk · react-router-dom

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

## Architecture notes

- **Single Y.Doc singleton** at `src/lib/yjs/doc.ts`. Each ticket is a `Y.Map`, not a JSON blob; events live in a `Y.Array` and are append-only (deletions are tombstones).
- **Pyodide runs in a Web Worker** via Comlink. The main thread never blocks on pandas import.
- **URL is the source of truth for filters.** `useUrlState` reads/writes search params; the Kanban derives rows from Yjs + filters with no intermediate React state.
- **Race-safe seeding.** `seedIfEmpty` waits for IDB hydration + 1s for any peer sync before seeding. A `_meta.seeded` flag prevents duplicate seeding across concurrent clean clients.
