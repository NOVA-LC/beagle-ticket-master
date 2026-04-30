import { useMemo } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import * as Y from 'yjs'
import { tickets, doc, appendTicketEvent } from '@/lib/yjs/doc'
import { useYMap } from '@/lib/yjs/useYMap'
import { useUrlState, slugify } from '@/lib/url-state'
import { getCurrentUser } from '@/lib/user'
import type { TicketStatus } from '@/lib/yjs/types'
import { STATUS_LABELS, STATUS_ORDER } from '@/lib/yjs/types'

export type Page = 'root' | 'status' | 'assign' | 'tag'

export interface PaletteAction {
  id: string
  label: string
  group: 'jump' | 'ticket' | 'filter' | 'navigate' | 'submenu'
  shortcut?: string
  keywords?: string[]
  subPage?: Page
  onSelect: () => void
}

const ASSIGNEES = ['Data Eng Team', 'CS', 'unassigned']
const KNOWN_TAGS = ['Westlake Communities', 'Pinecrest', 'Yardi Sync', 'Blocked', 'Urgent']

export function usePaletteActions(currentPage: Page): PaletteAction[] {
  const navigate = useNavigate()
  const location = useLocation()
  const { update: setFilter } = useUrlState()
  const params = useParams<{ id?: string }>()

  const snapshot = useYMap<Record<string, unknown>>(tickets)

  const ticketRouteId = useMemo(() => {
    const m = location.pathname.match(/^\/ticket\/(.+)$/)
    return m?.[1] ?? params.id ?? null
  }, [location.pathname, params.id])

  const currentTicket = ticketRouteId
    ? ((tickets.get(ticketRouteId) as Y.Map<unknown> | undefined) ?? null)
    : null

  return useMemo<PaletteAction[]>(() => {
    if (currentPage === 'status') return statusActions(currentTicket)
    if (currentPage === 'assign') return assignActions(currentTicket)
    if (currentPage === 'tag') return tagActions(currentTicket, snapshot)

    const jump: PaletteAction[] = []
    for (const id of Object.keys(snapshot)) {
      const map = tickets.get(id) as Y.Map<unknown> | undefined
      if (!map) continue
      const humanId = map.get('humanId') as string
      const title = map.get('title') as string
      const properties = (map.get('properties') as string[]) ?? []
      jump.push({
        id: `jump:${id}`,
        group: 'jump',
        label: `Open ticket ${humanId} — ${title}`,
        keywords: [humanId, title, ...properties],
        onSelect: () => navigate(`/ticket/${id}`),
      })
    }

    const ticketActs: PaletteAction[] = currentTicket
      ? [
          { id: 'change-status', group: 'ticket', label: 'Change status →', shortcut: 's', subPage: 'status', onSelect: () => {} },
          { id: 'assign-to', group: 'ticket', label: 'Assign to →', shortcut: 'a', subPage: 'assign', onSelect: () => {} },
          { id: 'add-tag', group: 'ticket', label: 'Add property tag →', shortcut: 't', subPage: 'tag', onSelect: () => {} },
          {
            id: 'run-last',
            group: 'ticket',
            label: 'Run last script',
            shortcut: 'r',
            onSelect: () => window.dispatchEvent(new CustomEvent('beagle:run-last-script')),
          },
        ]
      : []

    const filterActs: PaletteAction[] = [
      {
        id: 'filter-westlake',
        group: 'filter',
        label: 'Show only Westlake',
        keywords: ['filter', 'westlake', 'communities'],
        onSelect: () => setFilter({ property: slugify('Westlake Communities') }),
      },
      {
        id: 'filter-mrr-1000',
        group: 'filter',
        label: 'Show only MRR > $1000',
        keywords: ['filter', 'mrr', 'high', 'liability'],
        onSelect: () => setFilter({ minMrr: 1000 }),
      },
      {
        id: 'filter-blocked',
        group: 'filter',
        label: 'Show only Blocked',
        keywords: ['filter', 'blocked'],
        onSelect: () => setFilter({ property: slugify('Blocked') }),
      },
      {
        id: 'filter-clear',
        group: 'filter',
        label: 'Clear filters',
        onSelect: () => setFilter({ property: undefined, minMrr: undefined, status: undefined }),
      },
    ]

    const navActs: PaletteAction[] = [
      { id: 'nav-inbox', group: 'navigate', label: 'Inbox', onSelect: () => navigate('/') },
      {
        id: 'nav-high-liability',
        group: 'navigate',
        label: 'High-Liability',
        onSelect: () => navigate('/?minMrr=1000'),
      },
      {
        id: 'nav-reconciliations',
        group: 'navigate',
        label: 'Reconciliations',
        onSelect: () => navigate(`/?property=${slugify('Westlake Communities')}`),
      },
      { id: 'nav-settings', group: 'navigate', label: 'Settings', onSelect: () => navigate('/settings') },
    ]

    return [...jump, ...ticketActs, ...filterActs, ...navActs]
  }, [currentPage, snapshot, currentTicket, navigate, setFilter])
}

function statusActions(ticket: Y.Map<unknown> | null): PaletteAction[] {
  if (!ticket) return []
  const ticketId = ticket.get('id') as string
  const user = getCurrentUser()
  return STATUS_ORDER.map((s) => ({
    id: `status:${s}`,
    group: 'submenu',
    label: `→ ${STATUS_LABELS[s]}`,
    keywords: [STATUS_LABELS[s], s],
    onSelect: () => {
      const oldStatus = ticket.get('status') as TicketStatus
      if (oldStatus === s) return
      doc.transact(() => ticket.set('status', s))
      appendTicketEvent(ticketId, {
        type: 'status_change',
        by: user.name,
        at: Date.now(),
        from: oldStatus,
        to: s,
      })
    },
  }))
}

function assignActions(ticket: Y.Map<unknown> | null): PaletteAction[] {
  if (!ticket) return []
  const ticketId = ticket.get('id') as string
  const user = getCurrentUser()
  return ASSIGNEES.map((to) => ({
    id: `assign:${to}`,
    group: 'submenu',
    label: `→ ${to}`,
    keywords: [to],
    onSelect: () => {
      const from = (ticket.get('assignee') as string) ?? ''
      if (from === to) return
      doc.transact(() => ticket.set('assignee', to))
      appendTicketEvent(ticketId, {
        type: 'assigned',
        by: user.name,
        at: Date.now(),
        from,
        to,
      })
    },
  }))
}

function tagActions(
  ticket: Y.Map<unknown> | null,
  snapshot: Record<string, unknown>,
): PaletteAction[] {
  if (!ticket) return []
  const all = new Set<string>(KNOWN_TAGS)
  for (const id of Object.keys(snapshot)) {
    const t = tickets.get(id) as Y.Map<unknown> | undefined
    const props = (t?.get('properties') as string[] | undefined) ?? []
    props.forEach((p) => all.add(p))
  }
  return Array.from(all).map((tag) => ({
    id: `tag:${tag}`,
    group: 'submenu',
    label: `→ ${tag}`,
    keywords: [tag],
    onSelect: () => {
      const cur = ((ticket.get('properties') as string[]) ?? []).slice()
      if (cur.includes(tag)) return
      doc.transact(() => ticket.set('properties', [...cur, tag]))
    },
  }))
}
