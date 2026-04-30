# PRE_DEMO_CHECKLIST.md

Run through this top-to-bottom 10 minutes before Rishab joins the call.

## Reset state

- [ ] Visit `https://beagle-ticket-master.vercel.app/?reset=hard` — wait for the URL to drop the param (means IDB was cleared).
- [ ] Page reloads with a fresh seed. Confirm BGL-101 through BGL-105 are visible on the Kanban.

## Pyodide pre-warm

- [ ] Open the Network tab, filter by `cdn.jsdelivr.net`. After ~5–10s you should see `pyodide.asm.wasm`, `python_stdlib.zip`, and `pandas-*.whl` complete with HTTP 200s.
- [ ] Open BGL-101 (or any ticket). Expand the CodeRunner. Top-left state dot is **emerald** ("Python ready"), not amber/slate.

## Visual confirmation

- [ ] Cleared browser cache + cookies before this session (`⌘⇧⌫` on Chrome → "Cookies and other site data" + "Cached images and files").
- [ ] Two browser windows opened side-by-side: one regular, one incognito (or `?simulate=david`).
- [ ] Live cursors visible from one window in the other within ~50ms.
- [ ] Connection status strip in top-right says **"Live · 1 peer"** (green dot).

## Demo readiness

- [ ] All 5 seed tickets present, MRR-sorted.
- [ ] BGL-101 timeline shows: David's escalation comment → Lila's status change → @-mention reply with `[[westlake-communities]]`/`[[yardi-sync]]`/`[[BGL-103]]` chips → captured pandas `script_run` with the Westlake unit list.
- [ ] `⌘K` opens the palette; type "westlake" — top result is "Open ticket BGL-101 — Westlake Communities…".
- [ ] In the composer, type `[[w` — Tippy popover suggests Westlake Communities.
- [ ] Hover the rendered bi-link chip — AIContext popover fades in within ~150ms with the **$138K/year liability exposure** line.

## Mobile spot-check

- [ ] DevTools → Toggle device toolbar → iPhone SE (375 × 667).
- [ ] Sidebar collapses to a hamburger drawer.
- [ ] Kanban becomes a tab switcher (Triage / Scripting / Review / Done) with 44px touch targets.
- [ ] Cmd-K palette is full-screen on mobile.

## Backup plan

- [ ] Backup laptop signed in to https://beagle-ticket-master.vercel.app with the same `?reset=hard` reset performed.
- [ ] Screen recording of the full 90-second demo flow saved to local + cloud (in case live network craters).
- [ ] Tabs on backup laptop pre-opened: Kanban + BGL-101 + `?simulate=david` window.

## Post-demo

- [ ] Rotate the GitHub PAT and Vercel token if either was used during this session.
- [ ] Note what Rishab asked / pushed back on — those become Phase 9 candidates.
