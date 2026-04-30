import { useEffect, useMemo, useState } from 'react'
import * as Y from 'yjs'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useNavigate } from 'react-router-dom'

import { tickets, doc, appendTicketEvent } from '@/lib/yjs/doc'
import { useYMap } from '@/lib/yjs/useYMap'
import type { TicketStatus } from '@/lib/yjs/types'
import { STATUS_LABELS } from '@/lib/yjs/types'
import { getCurrentUser } from '@/lib/user'
import { useUrlState, ticketMatchesFilters } from '@/lib/url-state'
import { toast } from '@/components/ui/toaster'
import { Column } from './Column'
import { TicketCard } from './TicketCard'
import { cn } from '@/lib/utils'

interface Row {
  id: string
  map: Y.Map<unknown>
  status: TicketStatus
  mrr: number
  properties: string[]
}

const MAIN_COLS: TicketStatus[] = ['triage', 'scripting', 'review']

function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const onChange = () => setM(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return m
}

export function RevenueKanban() {
  const snapshot = useYMap<Record<string, unknown>>(tickets)
  const { filters } = useUrlState()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileTab, setMobileTab] = useState<TicketStatus>('triage')
  const navigate = useNavigate()
  const isMobile = useIsMobile()

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

  // Flat sorted list (across columns) for j/k navigation. Order matches what
  // the user sees scanning columns left-to-right, then top-to-bottom.
  const flatList = useMemo<Row[]>(() => {
    if (isMobile) return byStatus[mobileTab]
    return [...byStatus.triage, ...byStatus.scripting, ...byStatus.review, ...byStatus.done]
  }, [byStatus, isMobile, mobileTab])

  // Initialize selection to first card if nothing selected yet.
  useEffect(() => {
    if (selectedId && flatList.some((r) => r.id === selectedId)) return
    setSelectedId(flatList[0]?.id ?? null)
  }, [flatList, selectedId])

  // j/k/Enter via custom events from GlobalShortcuts.
  useEffect(() => {
    const next = () => {
      const idx = flatList.findIndex((r) => r.id === selectedId)
      const nextRow = flatList[Math.min(flatList.length - 1, Math.max(0, idx) + 1)]
      if (nextRow) setSelectedId(nextRow.id)
    }
    const prev = () => {
      const idx = flatList.findIndex((r) => r.id === selectedId)
      const prevRow = flatList[Math.max(0, Math.max(0, idx) - 1)]
      if (prevRow) setSelectedId(prevRow.id)
    }
    const open = () => {
      if (selectedId) navigate(`/ticket/${selectedId}`)
    }
    window.addEventListener('beagle:nav-next', next)
    window.addEventListener('beagle:nav-prev', prev)
    window.addEventListener('beagle:open-selected', open)
    return () => {
      window.removeEventListener('beagle:nav-next', next)
      window.removeEventListener('beagle:nav-prev', prev)
      window.removeEventListener('beagle:open-selected', open)
    }
  }, [flatList, selectedId, navigate])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Phase-7 a11y: keyboard alternative for drag-drop. Tab to a card,
    // Space to pick up, arrows to move, Space again to drop.
    useSensor(KeyboardSensor),
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
    const humanId = ticket.get('humanId') as string
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

    toast(`Moved ${humanId} to ${STATUS_LABELS[newStatus]}`, {
      action: {
        label: 'Undo',
        onClick: () => {
          doc.transact(() => ticket.set('status', oldStatus))
          appendTicketEvent(ticketId, {
            type: 'status_change',
            by: user.name,
            at: Date.now(),
            from: newStatus,
            to: oldStatus,
          })
        },
      },
    })
  }

  const activeTicket = activeId ? ((tickets.get(activeId) as Y.Map<unknown> | undefined) ?? null) : null

  return (
    <div className="mx-auto max-w-[1400px]">
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
        {isMobile ? (
          <MobileKanban
            byStatus={byStatus}
            activeTab={mobileTab}
            onTabChange={setMobileTab}
            selectedId={selectedId}
          />
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-4">
            {MAIN_COLS.map((s) => (
              <Column key={s} status={s} tickets={byStatus[s]} selectedId={selectedId} />
            ))}
            <Column status="done" tickets={byStatus.done} variant="rail" selectedId={selectedId} />
          </div>
        )}

        <DragOverlay>
          {activeTicket ? <TicketCard ticket={activeTicket} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

interface MobileKanbanProps {
  byStatus: Record<TicketStatus, Row[]>
  activeTab: TicketStatus
  onTabChange: (s: TicketStatus) => void
  selectedId: string | null
}

function MobileKanban({ byStatus, activeTab, onTabChange, selectedId }: MobileKanbanProps) {
  const ALL_TABS: TicketStatus[] = [...MAIN_COLS, 'done']
  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label="Ticket status" className="flex gap-1 overflow-x-auto rounded-md border border-slate-800 bg-slate-900 p-1">
        {ALL_TABS.map((s) => {
          const active = s === activeTab
          return (
            <button
              key={s}
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(s)}
              className={cn(
                'flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded px-3 py-2 text-xs transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                active ? 'bg-slate-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200',
              )}
            >
              {STATUS_LABELS[s]}
              <span className="rounded bg-slate-950 px-1 text-[10px] tabular-nums text-zinc-500">
                {byStatus[s].length}
              </span>
            </button>
          )
        })}
      </div>
      <Column status={activeTab} tickets={byStatus[activeTab]} selectedId={selectedId} />
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
