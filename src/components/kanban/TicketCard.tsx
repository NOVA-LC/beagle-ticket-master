import { memo } from 'react'
import * as Y from 'yjs'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate } from 'react-router-dom'
import { useYMap } from '@/lib/yjs/useYMap'
import type { Ticket } from '@/lib/yjs/types'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MrrBadge } from './MrrBadge'
import { cn } from '@/lib/utils'

const fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

function initials(s: string): string {
  return s.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '·'
}

interface Props {
  ticket: Y.Map<unknown>
  compact?: boolean
  /** When true, shows the j/k navigation focus ring. */
  selected?: boolean
}

/**
 * Memoized so the Kanban's root re-renders (which happen on any ticket-tree
 * change) don't fan out to every card. This card subscribes to its own
 * Y.Map via useYMap; when sibling tickets change, this component's snapshot
 * is unchanged and React.memo bails out.
 */
function TicketCardImpl({ ticket, compact = false, selected = false }: Props) {
  const t = useYMap<Ticket>(ticket)
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: t.id,
    data: { status: t.status },
  })

  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }

  const onClick = () => {
    if (isDragging) return
    navigate(`/ticket/${t.id}`)
  }

  if (compact) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        onClick={onClick}
        {...listeners}
        {...attributes}
        className={cn(
          'flex cursor-grab items-center justify-between rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs transition-colors duration-100 active:cursor-grabbing',
          selected && 'ring-2 ring-blue-500',
        )}
      >
        <span className="font-mono text-zinc-500">{t.humanId}</span>
        <span className="text-zinc-500 tabular-nums">${fmt.format(t.mrrAtRisk)}</span>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      {...listeners}
      {...attributes}
      data-ticket-id={t.id}
      className={cn(
        'group flex cursor-grab flex-col gap-2 rounded-md border border-slate-800 bg-slate-900 p-3 transition-colors duration-100 hover:border-slate-700 active:cursor-grabbing',
        selected && 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-950 border-blue-700',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-zinc-500">{t.humanId}</span>
        <Avatar className="h-5 w-5 border border-slate-700 bg-slate-800">
          <AvatarFallback className="bg-slate-800 text-[9px] text-zinc-300">
            {initials(t.assignee)}
          </AvatarFallback>
        </Avatar>
      </div>
      <h3 className="text-sm leading-snug text-zinc-100">{t.title}</h3>
      <div className="flex flex-wrap items-center gap-1.5">
        <MrrBadge value={t.mrrAtRisk} />
        {(t.properties ?? []).map((p) => (
          <span
            key={p}
            className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-zinc-400"
          >
            {p}
          </span>
        ))}
      </div>
    </div>
  )
}

export const TicketCard = memo(TicketCardImpl)
