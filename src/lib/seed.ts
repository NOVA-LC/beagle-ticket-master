import * as Y from 'yjs'
import { doc, indexeddbProvider, tickets, webrtcProvider } from './yjs/doc'
import type { Ticket, TicketEvent } from './yjs/types'
import { ENTITIES } from './entities'

type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never

interface SeedTicket extends Omit<Ticket, 'createdAt'> {
  createdAt: number
  events: DistributiveOmit<TicketEvent, 'id'>[]
}

const ts = (iso: string): number => new Date(iso).getTime()

/**
 * The exact pandas reconciliation script that pre-fills the CodeRunner editor
 * (Phase 2). The seeded BGL-101 `script_run` event records a historical run of
 * this same code, so opening the ticket and clicking "Run" reproduces (close
 * to) the persisted output.
 */
const PANDAS_RECONCILIATION_SCRIPT = `import pandas as pd

# Westlake Communities — waiver enrollment reconciliation
data = [
    {"unit": "101", "tenant": "Martinez, Jose A.", "waiver": True,  "billed": True},
    {"unit": "102", "tenant": "Chen, Wei",         "waiver": True,  "billed": False},
    {"unit": "103", "tenant": "Patel, Priya",      "waiver": False, "billed": False},
]
df = pd.DataFrame(data)
missing = df[(df.waiver) & (~df.billed)]
print(f"Westlake reconciliation — {len(df)} units")
print(f"Missing waiver charges: {len(missing)}")
print(missing[["unit","tenant"]].to_string(index=False))
`

// ─────────────────────────────────────────────────────────────────────────────
// Tiptap-JSON converter so seeded comment bodies render with interactive
// bi-link chips (and AIContext popovers) inside the read-only timeline.
// `[[westlake-communities]]` and `[[BGL-103]]` resolve via the entity registry.
// ─────────────────────────────────────────────────────────────────────────────

interface JSONNode {
  type: string
  attrs?: Record<string, unknown>
  content?: JSONNode[]
  text?: string
}

function bodyToTiptapJson(body: string): JSONNode {
  const paragraphs = body.split(/\n\n+/)
  return {
    type: 'doc',
    content: paragraphs.map((p) => ({
      type: 'paragraph',
      content: parseInline(p),
    })),
  }
}

function parseInline(text: string): JSONNode[] {
  const out: JSONNode[] = []
  const re = /\[\[([^\]]+)\]\]/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      out.push({ type: 'text', text: text.slice(last, m.index) })
    }
    const ref = m[1]
    const entity = ENTITIES.find((e) => e.id === ref || e.id.toLowerCase() === ref.toLowerCase())
    if (entity) {
      out.push({
        type: 'biLink',
        attrs: { kind: entity.kind, id: entity.id, label: entity.label },
      })
    } else {
      // No matching entity — leave the literal `[[xxx]]` text in place.
      out.push({ type: 'text', text: m[0] })
    }
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) })
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED DATA — verbatim per Phase 6 spec. Names, numbers, body text, and the
// pandas script are reproduced exactly. ISO timestamps below are converted to
// epoch ms by ts() at module load.
// ─────────────────────────────────────────────────────────────────────────────

export const SEED_TICKETS: SeedTicket[] = [
  {
    id: 'bgl-101',
    humanId: 'BGL-101',
    title: 'Westlake Communities — 103 Uninsured Error',
    status: 'scripting',
    priority: 1,
    assignee: 'data-eng',
    mrrAtRisk: 1648,
    properties: ['westlake-communities'],
    createdAt: ts('2026-04-28T14:22:00Z'),
    events: [
      {
        type: 'comment',
        at: ts('2026-04-28T14:22:00Z'),
        by: 'cs-rep-david',
        body:
          "David at Westlake just escalated. He's seeing 17 uncovered units in the property dashboard but the underwriting file shows 14 — and his regional manager Sarah is asking him about the 41% compliance number on Monday. He needs the actual reconciled number with names attached to it before COB Friday.",
      },
      {
        type: 'status_change',
        at: ts('2026-04-28T14:25:00Z'),
        by: 'lila-eng',
        from: 'triage',
        to: 'scripting',
      },
      {
        type: 'comment',
        at: ts('2026-04-28T14:30:00Z'),
        by: 'lila-eng',
        body:
          'Pulled the [[westlake-communities]] portfolio extract. The 17 vs 14 gap is the [[yardi-sync]] lag — two move-ins from yesterday haven\'t propagated to the underwriting file. Running a fresh reconciliation now. cc [[BGL-103]].',
      },
      {
        type: 'script_run',
        at: ts('2026-04-28T14:35:00Z'),
        by: 'lila-eng',
        runBy: 'lila-eng',
        code: PANDAS_RECONCILIATION_SCRIPT,
        stdout:
          'Westlake reconciliation — 68 units\nMissing waiver charges: 17\n unit  tenant\n  101  Martinez, Jose A.\n  102  Chen, Wei\n  103  Patel, Priya\n  ...',
        stderr: '',
        durationMs: 1244,
      },
    ],
  },
  {
    id: 'bgl-102',
    humanId: 'BGL-102',
    title: 'REQ: Monday Morning Action List — Pinecrest',
    status: 'triage',
    priority: 3,
    assignee: 'unassigned',
    mrrAtRisk: 272,
    properties: ['pinecrest-village'],
    createdAt: ts('2026-04-29T09:14:00Z'),
    events: [
      {
        type: 'comment',
        at: ts('2026-04-29T09:14:00Z'),
        by: 'cs-rep-mira',
        body:
          'PM at [[pinecrest-village]] wants the same Monday morning action list we built for Westlake — top 5 accounts to call, sorted by exposure. Asked if we can run it weekly for them. Low MRR ticket but high relationship-building value.',
      },
    ],
  },
  {
    id: 'bgl-103',
    humanId: 'BGL-103',
    title: 'Data Ingestion Failure — Yardi Sync',
    status: 'review',
    priority: 1,
    assignee: 'data-eng',
    mrrAtRisk: 890,
    properties: ['yardi-sync'],
    createdAt: ts('2026-04-27T03:42:00Z'),
    events: [
      {
        type: 'comment',
        at: ts('2026-04-27T03:42:00Z'),
        by: 'system',
        body: 'Automated alert: [[yardi-sync]] hourly job returned 4xx from Yardi API at 03:42. Backoff retry exhausted.',
      },
      {
        type: 'comment',
        at: ts('2026-04-27T08:11:00Z'),
        by: 'marcus-eng',
        body:
          "Yardi rotated their API key — they didn't notify us. Updated the secret in vault, sync resumed at 08:09. Putting a watcher on key-rotation events upstream. Linking [[BGL-101]] because the Westlake gap is downstream of this.",
      },
      {
        type: 'status_change',
        at: ts('2026-04-27T08:12:00Z'),
        by: 'marcus-eng',
        from: 'scripting',
        to: 'review',
      },
    ],
  },
  {
    id: 'bgl-104',
    humanId: 'BGL-104',
    title: 'Compliance dashboard shows wrong portfolio total',
    status: 'triage',
    priority: 2,
    assignee: 'unassigned',
    mrrAtRisk: 540,
    properties: ['westlake-communities', 'pinecrest-village'],
    createdAt: ts('2026-04-30T10:01:00Z'),
    events: [
      {
        type: 'comment',
        at: ts('2026-04-30T10:01:00Z'),
        by: 'cs-rep-david',
        body:
          "Two clients reported their portfolio totals don't match across the dashboard and the monthly PDF report. Westlake shows 68 units in the dashboard but 71 in the PDF. Pinecrest shows 92 vs 89. Could be a denominator question (pending leases included in one, not the other?).",
      },
    ],
  },
  {
    id: 'bgl-105',
    humanId: 'BGL-105',
    title: 'FEATURE REQ: auto-trigger reconciliation when expiration < 14 days',
    status: 'triage',
    priority: 4,
    assignee: 'unassigned',
    mrrAtRisk: 0,
    properties: [],
    createdAt: ts('2026-04-30T11:30:00Z'),
    events: [
      {
        type: 'comment',
        at: ts('2026-04-30T11:30:00Z'),
        by: 'rishab-pm',
        body:
          "From the dashboard spec we just shipped — Alert A is the 14-day pre-expiration alert. Could we wire the same trigger to auto-spawn a reconciliation ticket here, scoped to that account, so CS doesn't have to file it manually? Low priority, but would close the loop between the customer-facing dashboard and our internal ops.",
      },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Race-safe seeding
// ─────────────────────────────────────────────────────────────────────────────

let seedAttempted = false

/**
 * Race-safe seed. Algorithm:
 *
 *   1. Wait for IndexedDB to hydrate any local persistence.
 *   2. If `tickets.size > 0` after hydrate → local data exists, skip seeding.
 *   3. Race the WebrtcProvider's `synced` event against a 1000ms timeout.
 *   4. If `synced` won → a peer has data, skip seeding.
 *   5. If timeout won AND `tickets.size === 0` → seed atomically inside
 *      `doc.transact` so peers see one batch.
 *
 * A `_meta.seeded` flag inside the transaction is defense-in-depth: if two
 * fresh clients race past the guard simultaneously, both will set the flag
 * and convergence happens at ticket-id level (Y.Map.set with same key); the
 * only artifact is duplicate event history per ticket.
 */
export async function seedIfEmpty(doc: Y.Doc, tickets: Y.Map<unknown>): Promise<void> {
  if (seedAttempted) return
  seedAttempted = true

  // 1. Hydrate from IDB.
  await indexeddbProvider.whenSynced
  if (tickets.size > 0) return

  // 2. Race a peer 'synced' event against a 1s timeout.
  const peerSynced = new Promise<'synced'>((resolve) => {
    const onSynced = (state: { synced: boolean }) => {
      if (state.synced) {
        webrtcProvider.off('synced', onSynced)
        resolve('synced')
      }
    }
    webrtcProvider.on('synced', onSynced)
  })

  const timeout = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 1000))

  const winner = await Promise.race([peerSynced, timeout])
  if (winner === 'synced') return // peer had data
  if (tickets.size > 0) return // late peer arrived between race resolve and check

  const meta = doc.getMap('_meta')
  if (meta.get('seeded')) return

  // 3. Seed atomically.
  doc.transact(() => {
    meta.set('seeded', true)
    for (const seed of SEED_TICKETS) {
      buildTicket(tickets, seed)
    }
  }, 'seed')
}

function buildTicket(tickets: Y.Map<unknown>, seed: SeedTicket): void {
  const tMap = new Y.Map<unknown>()
  tMap.set('id', seed.id)
  tMap.set('humanId', seed.humanId)
  tMap.set('title', seed.title)
  tMap.set('status', seed.status)
  tMap.set('priority', seed.priority)
  tMap.set('assignee', seed.assignee)
  tMap.set('mrrAtRisk', seed.mrrAtRisk)
  tMap.set('properties', seed.properties)
  tMap.set('createdAt', seed.createdAt)

  const eventsArr = new Y.Array<Y.Map<unknown>>()
  for (const ev of seed.events) {
    const eMap = new Y.Map<unknown>()
    eMap.set('id', crypto.randomUUID())
    for (const [k, v] of Object.entries(ev)) {
      eMap.set(k, v as unknown)
    }
    // For comment events, derive a Tiptap JSON snapshot from the body so the
    // read-only timeline can render bi-link chips with their AIContext popovers.
    if (ev.type === 'comment') {
      eMap.set('bodyJson', bodyToTiptapJson(ev.body))
    }
    eventsArr.push([eMap])
  }
  tMap.set('events', eventsArr)

  tickets.set(seed.id, tMap)
}
