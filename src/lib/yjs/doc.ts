import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'
import { IndexeddbPersistence } from 'y-indexeddb'
import type { Ticket, TicketEvent, TicketStatus } from './types'

const ROOM = 'beagle-ticket-master-v1'

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

/** Doc-level metadata — used to mark "seeded" so concurrent tabs don't re-seed. */
const meta: Y.Map<unknown> = doc.getMap('_meta')

/** IndexedDB persistence — survives refresh on the same origin/browser. */
export const indexeddbProvider = new IndexeddbPersistence(ROOM, doc)

/** WebRTC peer sync + presence (awareness) — public signaling defaults are fine for dev. */
export const webrtcProvider = new WebrtcProvider(ROOM, doc)

/** Awareness instance (presence/cursors) — provided by y-webrtc, backed by y-protocols. */
export const awareness = webrtcProvider.awareness

/**
 * Returns an existing ticket Y.Map or creates one with an empty events Y.Array.
 * Always called inside a transaction by callers that mutate.
 */
export function getOrCreateTicket(id: string): Y.Map<unknown> {
  let t = tickets.get(id) as Y.Map<unknown> | undefined
  if (!t) {
    t = new Y.Map<unknown>()
    t.set('events', new Y.Array<Y.Map<unknown>>())
    tickets.set(id, t)
  }
  return t
}

let seedAttempted = false

/**
 * Race-safe seed.
 *
 * 1. Wait for IndexedDB to hydrate any local state.
 * 2. Wait 1s — gives WebRTC peers a chance to push state we'd otherwise stomp on.
 * 3. Bail if `_meta.seeded` is set OR if the tickets map is non-empty.
 * 4. Atomic transaction so even if two clean clients race past the guard, the `set`s
 *    converge by ticket id.
 */
export async function seedIfEmpty(seed: Ticket[]): Promise<void> {
  if (seedAttempted) return
  seedAttempted = true

  await indexeddbProvider.whenSynced
  await new Promise<void>((resolve) => setTimeout(resolve, 1000))

  if (meta.get('seeded') || tickets.size > 0) return

  doc.transact(() => {
    meta.set('seeded', true)
    for (const s of seed) {
      const t = getOrCreateTicket(s.id)
      t.set('id', s.id)
      t.set('humanId', s.humanId)
      t.set('title', s.title)
      t.set('status', s.status)
      t.set('priority', s.priority)
      t.set('assignee', s.assignee)
      t.set('mrrAtRisk', s.mrrAtRisk)
      t.set('properties', s.properties)
      t.set('createdAt', s.createdAt)

      const events = t.get('events') as Y.Array<Y.Map<unknown>>
      const ev = new Y.Map<unknown>()
      ev.set('id', crypto.randomUUID())
      ev.set('type', 'created')
      ev.set('by', 'system')
      ev.set('at', s.createdAt)
      events.push([ev])
    }
  }, 'seed')
}

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
 * it no-ops.
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
