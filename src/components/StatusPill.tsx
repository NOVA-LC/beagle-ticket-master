import type { TicketStatus } from '@/lib/yjs/types'
import { STATUS_LABELS } from '@/lib/yjs/types'
import { cn } from '@/lib/utils'

export function StatusPill({ status }: { status: TicketStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] text-zinc-300',
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
