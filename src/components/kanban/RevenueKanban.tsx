import { useEffect, useMemo, useState } from 'react'
import * as Y from 'yjs'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'

import { tickets, doc, appendTicketEvent, seedIfEmpty } from '@/lib/yjs/doc'
import { useYMap } from '@/lib/yjs/useYMap'
import type { TicketStatus } from '@/lib/yjs/types'
import { SEED } from '@/lib/yjs/seed'
import { getCurrentUser } from '@/lib/user'
import { useUrlState, ticketMatchesFilters } from '@/lib/url-state'
import { Column } from './Column'
import { TicketCard } from './TicketCard'

interface Row {
  id: string
  map: Y.Map<unknown>
  status: TicketStatus
  mrr: number
  properties: string[]
}

const MAIN_COLS: TicketStatus[] = ['triage', 'scripting', 'review']

export function RevenueKanban() {
  const snapshot = useYMap<Record<string, unknown>>(tickets)
  const { filters } = useUrlState()
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    void seedIfEmpty(SEED)
  }, [])

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = []
    for (const id of Object.keys(snapshot)) {
      const m = tickets.get(id) as Y.Map<unknown> | undefined
      if (!m) continue
      out.push({
        id: m.get('id') as string,
        map: m,
        status: m.get('status') as TicketStatus,
        mrr: (m.get('mrrAtRisk') as number) ?? 0,
        properties: (m.get('properties') as string[]) ?? [],
      })
    }
    return out
      .filter((t) => ticketMatchesFilters(t, filters))
      .sort((a, b) => b.mrr - a.mrr)
  }, [snapshot, filters])

  const byStatus = useMemo(() => {
    const groups: Record<TicketStatus, Row[]> = { triage: [], scripting: [], review: [], done: [] }
    for (const r of rows) groups[r.status]?.push(r)
    return groups
  }, [rows])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    if (!e.over) return
    const ticketId = String(e.active.id)
    const newStatus = e.over.id as TicketStatus
    const ticket = tickets.get(ticketId) as Y.Map<unknown> | undefined
    if (!ticket) return
    const oldStatus = ticket.get('status') as TicketStatus
    if (oldStatus === newStatus) return

    const user = getCurrentUser()
    doc.transact(() => {
      ticket.set('status', newStatus)
    })
    appendTicketEvent(ticketId, {
      type: 'status_change',
      by: user.name,
      at: Date.now(),
      from: oldStatus,
      to: newStatus,
    })
  }

  const activeTicket = activeId ? ((tickets.get(activeId) as Y.Map<unknown> | undefined) ?? null) : null

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Revenue Kanban</h1>
          <p className="text-xs text-zinc-500">
            Sorted by MRR at risk · {rows.length} ticket{rows.length === 1 ? '' : 's'}
          </p>
        </div>
        <FilterChips />
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {MAIN_COLS.map((s) => (
            <Column key={s} status={s} tickets={byStatus[s]} />
          ))}
          <Column status="done" tickets={byStatus.done} variant="rail" />
        </div>

        <DragOverlay>
          {activeTicket ? <TicketCard ticket={activeTicket} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

function FilterChips() {
  const { filters, clear } = useUrlState()
  const active = Object.entries(filters).filter(([, v]) => v !== undefined && v !== '')
  if (active.length === 0) return null
  return (
    <div className="flex items-center gap-2">
      {active.map(([k, v]) => (
        <span
          key={k}
          className="rounded-full border border-cyan-900 bg-cyan-950/40 px-2 py-0.5 text-[11px] text-cyan-200"
        >
          {k}: {String(v)}
        </span>
      ))}
      <button
        onClick={clear}
        className="rounded border border-slate-800 bg-slate-900 px-2 py-0.5 text-[11px] text-zinc-400 hover:bg-slate-800"
      >
        clear
      </button>
    </div>
  )
}
