import * as Y from 'yjs'
import { doc, appendTicketEvent } from '@/lib/yjs/doc'
import { useYMap } from '@/lib/yjs/useYMap'
import type { Ticket, TicketStatus } from '@/lib/yjs/types'
import { STATUS_LABELS, STATUS_ORDER } from '@/lib/yjs/types'
import { getCurrentUser } from '@/lib/user'

export function StatusSelect({ ticket }: { ticket: Y.Map<unknown> }) {
  const t = useYMap<Ticket>(ticket)

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as TicketStatus
    if (t.status === newStatus) return
    const user = getCurrentUser()
    doc.transact(() => ticket.set('status', newStatus))
    appendTicketEvent(t.id, {
      type: 'status_change',
      by: user.name,
      at: Date.now(),
      from: t.status,
      to: newStatus,
    })
  }

  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-zinc-500">Status</span>
      <select
        value={t.status}
        onChange={onChange}
        className="rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        {STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </label>
  )
}
