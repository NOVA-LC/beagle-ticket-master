import type { Ticket } from './types'

const HOUR = 1000 * 60 * 60

export const SEED: Ticket[] = [
  {
    id: 'bgl-101',
    humanId: 'BGL-101',
    title: 'Westlake Communities — 103 Uninsured Error',
    status: 'scripting',
    priority: 'P1',
    assignee: 'Data Eng Team',
    mrrAtRisk: 1648,
    properties: ['Westlake Communities'],
    createdAt: Date.now() - 6 * HOUR,
  },
  {
    id: 'bgl-102',
    humanId: 'BGL-102',
    title: 'REQ: Monday Morning Action List — Pinecrest',
    status: 'triage',
    priority: 'P2',
    assignee: 'unassigned',
    mrrAtRisk: 272,
    properties: ['Pinecrest'],
    createdAt: Date.now() - 18 * HOUR,
  },
  {
    id: 'bgl-103',
    humanId: 'BGL-103',
    title: 'Data Ingestion Failure — Yardi Sync',
    status: 'review',
    priority: 'P0',
    assignee: 'Data Eng Team',
    mrrAtRisk: 890,
    properties: ['Yardi Sync', 'Blocked'],
    createdAt: Date.now() - 26 * HOUR,
  },
]
