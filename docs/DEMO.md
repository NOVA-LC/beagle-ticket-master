# DEMO.md — Beagle CS-to-Engineering Ticket Master

**Live demo:** https://beagle-ticket-master.vercel.app

## 30-second hook

> "I thought about your comment that CS is doing a lot of report-setup. The dashboard I shipped is great for clients — but the *internal* bottleneck I noticed is CS-to-Engineering data requests. Watch this."

## The three killshots

### 1. MRR-at-risk sorting
"We don't sort by date. We sort by money."
- Open the board: BGL-101 ($1,648) is at the top, BGL-105 ($0) is at the bottom.
- Whatever Eng works on next is whatever costs Beagle the most if it stays broken.

### 2. Bidirectional `[[Westlake]]` linking with auto-context
"CS doesn't paste a Slack link and ask 'what's this account?' anymore."
- Open BGL-101. Hover the `[[Westlake Communities]]` chip in the timeline.
- AIContext popover surfaces: 41% verified coverage, 17 uninsured units, **$138K/year liability exposure**.
- The same context follows the entity across every ticket that mentions it. CS reps stop re-explaining accounts.

### 3. In-ticket Python execution
"Eng doesn't fork a Jupyter notebook to run a one-off script. The ticket *is* the notebook."
- Same ticket, scroll to the Python runner (already pre-warmed; Pyodide loads on app boot).
- Click Run. Pandas reconciliation streams stdout line-by-line, persists as a `script_run` event in the ticket's audit log.
- Refresh the page — the run is still there. Open in a second browser — it's there too.

## What's NOT built (and why)

This is a prototype. Showing the seams is honest:

- **No auth, no multi-tenant, no real backend.** The whole app is a static SPA + Yjs CRDT over y-webrtc + y-indexeddb. Going to multi-tenant means a real backend (Postgres, auth, rate limits, abuse handling). That's a real engineering project — not a frontend prototype.
- **No fulltext search.** Cmd-K does fuzzy matching on titles + ids + property tags. A real "search across comment bodies" needs an index (Tantivy, Meilisearch, Postgres FTS).
- **No native mobile.** The web build is responsive at 375px (Kanban becomes a tab switcher) but there's no Capacitor/RN wrapper. CS reps reading on phones during commutes is a real use case worth a separate phase.
- **No notifications.** Beagle's CS team is in Slack — push notifications would route there, not browser-native. That's a 1-day Slack integration, not a frontend phase.
- **`entities.ts` is hardcoded.** Properties are seeded with hardcoded summaries. In production this comes from a real properties table + an LLM-generated context summary refreshed on a schedule.

## Architecture (text diagram)

```
                              ┌───────────────────────────┐
                              │  React SPA (Vite build)   │
                              │  Tiptap · dnd-kit · cmdk  │
                              │  Tailwind · Radix         │
                              └────────────┬──────────────┘
                                           │
                              ┌────────────┴──────────────┐
                              │  Singleton Y.Doc          │
                              │  tickets: Y.Map<id, Y.Map>│
                              │  events: Y.Array<Y.Map>   │
                              └────────────┬──────────────┘
                                           │
              ┌────────────────────────────┼────────────────────────────┐
              │                            │                            │
   ┌──────────▼──────────┐    ┌────────────▼────────────┐    ┌──────────▼──────────┐
   │ y-indexeddb         │    │ y-webrtc                │    │ Pyodide Web Worker  │
   │ persistence on      │    │ peer sync via signaling │    │ Comlink-exposed API │
   │ refresh + offline   │    │ (3 fallback servers)    │    │ stdout streaming    │
   └─────────────────────┘    └────────────┬────────────┘    └─────────────────────┘
                                           │
                              ┌────────────┴──────────────┐
                              │ Other browser tabs/peers  │
                              │ on the same Beagle Yjs    │
                              │ "room" — no backend       │
                              └───────────────────────────┘
```

Key properties:
- **Local-first.** Any tab can read/write offline; IndexedDB persists across reload.
- **CRDT merge.** Two peers editing simultaneously merge automatically — no conflict-resolution UI required.
- **Worker isolation.** Pyodide/pandas import takes ~12s cold. Doing that on the main thread would freeze every UI on the page; the worker keeps React responsive throughout.

## Demo URLs

| URL | Purpose |
|---|---|
| `/` | Kanban — sorted by MRR |
| `/ticket/bgl-101` | The hero ticket: Westlake reconciliation with the historical pandas run |
| `/?simulate=david` | Solo-laptop "second peer" simulator — David's cursor moves, comments post every 30s |
| `/demo` | DEV-only autoplay walkthrough (not present in prod build) |
| `/?reset=hard` | Wipe IndexedDB + re-seed (use between rehearsals) |
| `/?minMrr=1000` | High-Liability filter |

## Performance budget on the live demo

- Initial JS: 580 KB → 182 KB gzipped. Kanban + palette + AppLayout.
- Lazy ticket-detail chunk: 528 KB → 171 KB gzipped. Tiptap + Radix + Pyodide hook + react-simple-code-editor.
- Pyodide runtime + pandas wheel: served from `cdn.jsdelivr.net`, ~10 MB on first visit, cached afterward.
- Pyodide is preloaded at app boot — by the time you click Run, it's ready.
