export type EntityKind = 'property' | 'system' | 'ticket'

export interface Entity {
  id: string
  kind: EntityKind
  label: string
  /** Markdown body shown inside the AIContext popover. */
  context: string
}

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
    label: 'BGL-101: Westlake — 103 Uninsured Error',
    context:
      'Linked ticket. Status: In Progress. MRR at risk: $1,648. Assignee: Data Eng.',
  },
  {
    id: 'BGL-102',
    kind: 'ticket',
    label: 'BGL-102: Pinecrest — Monday Action List',
    context: 'Linked ticket. Status: Triage. MRR at risk: $272.',
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
