import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'
import { IndexeddbPersistence } from 'y-indexeddb'
import type { TicketEvent, TicketStatus } from './types'

/**
 * Bumped from v1 → v2 in Phase 6 so the new 5-ticket seed (with full event
 * histories) reaches users who already have the Phase-1 3-ticket seed cached
 * in IndexedDB. v1 caches stay around but are unreferenced.
 */
const ROOM = 'beagle-ticket-master-v2'

/** Distributes Omit across union members so each variant retains its own fields. */
type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never

/** Single Y.Doc for the whole app. Imported as a module — instantiated once. */
export const doc = new Y.Doc()

/**
 * Root collection: ticketId -> ticket Y.Map. Typed as Y.Map<unknown> so it is
 * structurally assignable to the wider Y.Map<unknown> hook signatures; callers
 * cast `.get(id)` to `Y.Map<unknown>` when they need to access nested fields.
 */
export const tickets: Y.Map<unknown> = doc.getMap('tickets')

/** IndexedDB persistence — survives refresh on the same origin/browser. */
export const indexeddbProvider = new IndexeddbPersistence(ROOM, doc)

/** WebRTC peer sync + presence (awareness) — public signaling defaults are fine for dev. */
export const webrtcProvider = new WebrtcProvider(ROOM, doc)

/** Awareness instance (presence/cursors) — provided by y-webrtc, backed by y-protocols. */
export const awareness = webrtcProvider.awareness

/**
 * Atomically append an event to a ticket's audit log. Caller provides everything
 * except `id`, which we generate. Tombstone-style — never mutate or remove existing
 * events; only append.
 */
export function appendTicketEvent(
  ticketId: string,
  event: DistributiveOmit<TicketEvent, 'id'>,
): void {
  const ticket = tickets.get(ticketId) as Y.Map<unknown> | undefined
  if (!ticket) return
  const events = ticket.get('events') as Y.Array<Y.Map<unknown>>
  doc.transact(() => {
    const ev = new Y.Map<unknown>()
    ev.set('id', crypto.randomUUID())
    for (const [k, v] of Object.entries(event)) {
      ev.set(k, v as unknown)
    }
    events.push([ev])
  }, 'event-append')
}

/**
 * Idempotent legacy-status migration. Maps Phase-1 capitalized statuses to the
 * Phase-3 lowercase enum. Runs once after IDB hydrates; if no legacy data exists
 * (e.g., new v2 room) it no-ops.
 */
const LEGACY_STATUS_MAP: Record<string, TicketStatus> = {
  Triage: 'triage',
  'In Progress': 'scripting',
  Blocked: 'triage',
  Done: 'done',
}

function migrateLegacyStatuses() {
  doc.transact(() => {
    tickets.forEach((value) => {
      const t = value as Y.Map<unknown>
      const s = t.get('status')
      if (typeof s === 'string' && LEGACY_STATUS_MAP[s]) {
        t.set('status', LEGACY_STATUS_MAP[s])
      }
    })
  }, 'migrate-legacy-status')
}

void indexeddbProvider.whenSynced.then(migrateLegacyStatuses)
