import { useDroppable } from '@dnd-kit/core'
import * as Y from 'yjs'
import type { TicketStatus } from '@/lib/yjs/types'
import { STATUS_LABELS } from '@/lib/yjs/types'
import { TicketCard } from './TicketCard'
import { cn } from '@/lib/utils'

const EMPTY_COPY: Record<TicketStatus, string> = {
  triage: 'Triage clear — every ticket is in motion.',
  scripting: 'Nothing in active work right now.',
  review: 'Nothing waiting for review.',
  done: '—',
}

const fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

interface Props {
  status: TicketStatus
  tickets: Array<{ id: string; map: Y.Map<unknown>; mrr: number }>
  variant?: 'main' | 'rail'
  selectedId?: string | null
}

export function Column({ status, tickets, variant = 'main', selectedId }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const totalMrr = tickets.reduce((sum, t) => sum + t.mrr, 0)

  if (variant === 'rail') {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          'flex w-[160px] shrink-0 flex-col gap-1 rounded-lg border bg-slate-950 p-2 transition-colors',
          isOver ? 'border-cyan-800 bg-slate-900/40' : 'border-slate-900',
        )}
      >
        <header className="flex items-center justify-between px-1 py-1.5">
          <h2 className="text-[10px] uppercase tracking-wider text-zinc-500">
            {STATUS_LABELS[status]}
          </h2>
          <span className="text-[10px] text-zinc-600 tabular-nums">{tickets.length}</span>
        </header>
        <div className="flex flex-col gap-1">
          {tickets.length === 0 ? (
            <p className="px-1 py-3 text-center text-[10px] text-zinc-700">
              {EMPTY_COPY[status]}
            </p>
          ) : (
            tickets.map((t) => <TicketCard key={t.id} ticket={t.map} compact selected={t.id === selectedId} />)
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-[320px] shrink-0 flex-col gap-2 rounded-lg border bg-slate-950 p-3 transition-colors',
        isOver ? 'border-cyan-800 bg-slate-900/30' : 'border-slate-900',
      )}
    >
      <header className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xs uppercase tracking-wider text-zinc-300">
            {STATUS_LABELS[status]}
          </h2>
          <span className="text-xs text-zinc-500 tabular-nums">{tickets.length}</span>
        </div>
        <span className="text-[10px] text-zinc-500 tabular-nums">${fmt.format(totalMrr)} MRR</span>
      </header>

      {tickets.length === 0 ? (
        <p className="px-1 py-12 text-center text-xs text-zinc-600">{EMPTY_COPY[status]}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {tickets.map((t) => (
            <TicketCard key={t.id} ticket={t.map} selected={t.id === selectedId} />
          ))}
        </div>
      )}
    </div>
  )
}
