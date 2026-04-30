export type EntityKind = 'property' | 'system' | 'ticket'

export interface Entity {
  id: string
  kind: EntityKind
  label: string
  /** Markdown body shown inside the AIContext popover. */
  context: string
}

/**
 * Ticket entities use the humanId as both `id` and `label` so a `[[BGL-103]]`
 * bi-link in seeded comment bodies renders compactly (just "BGL-103") rather
 * than expanding to the full ticket title. The descriptive summary lives in
 * `context` and surfaces inside the AIContext popover.
 *
 * Property entities keep human-readable labels because users type
 * `[[Westlake]]` expecting "Westlake Communities" to render.
 */
export const ENTITIES: readonly Entity[] = [
  {
    id: 'westlake-communities',
    kind: 'property',
    label: 'Westlake Communities',
    context:
      'Westlake Communities currently has a 41% verified coverage rate, 17 uninsured units, and **$138K/year in liability exposure**. CS escalations on this account: 3 in the last 14 days.',
  },
  {
    id: 'pinecrest-village',
    kind: 'property',
    label: 'Pinecrest Village',
    context:
      'Pinecrest Village is at 67% verified coverage. Yardi sync last failed 2 days ago. 1 open ticket.',
  },
  {
    id: 'yardi-sync',
    kind: 'system',
    label: 'Yardi Sync',
    context:
      'Yardi data ingestion runs hourly. Last successful run: 11:42am. Recent failure rate: 4.2%.',
  },
  {
    id: 'BGL-101',
    kind: 'ticket',
    label: 'BGL-101',
    context: 'Westlake Communities — 103 Uninsured Error. Status: Scripting. MRR at risk: $1,648. Assignee: Data Eng.',
  },
  {
    id: 'BGL-102',
    kind: 'ticket',
    label: 'BGL-102',
    context: 'REQ: Monday Morning Action List — Pinecrest. Status: Triage. MRR at risk: $272.',
  },
  {
    id: 'BGL-103',
    kind: 'ticket',
    label: 'BGL-103',
    context: 'Data Ingestion Failure — Yardi Sync. Status: Review. MRR at risk: $890. Assignee: Data Eng.',
  },
  {
    id: 'BGL-104',
    kind: 'ticket',
    label: 'BGL-104',
    context: 'Compliance dashboard shows wrong portfolio total. Status: Triage. MRR at risk: $540.',
  },
  {
    id: 'BGL-105',
    kind: 'ticket',
    label: 'BGL-105',
    context: 'FEATURE REQ: auto-trigger reconciliation when expiration < 14 days. Status: Triage.',
  },
] as const

export function getEntity(id: string): Entity | undefined {
  return ENTITIES.find((e) => e.id === id)
}

export function searchEntities(query: string, limit = 8): Entity[] {
  const q = query.toLowerCase().trim()
  if (!q) return ENTITIES.slice(0, limit)
  return ENTITIES.filter((e) => e.label.toLowerCase().includes(q) || e.id.toLowerCase().includes(q)).slice(0, limit)
}
