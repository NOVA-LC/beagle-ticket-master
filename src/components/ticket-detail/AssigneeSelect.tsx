import * as Y from 'yjs'
import { doc, appendTicketEvent } from '@/lib/yjs/doc'
import { useYMap } from '@/lib/yjs/useYMap'
import type { Ticket } from '@/lib/yjs/types'
import { getCurrentUser } from '@/lib/user'

const ASSIGNEES = ['Data Eng Team', 'CS', 'unassigned']

export function AssigneeSelect({ ticket }: { ticket: Y.Map<unknown> }) {
  const t = useYMap<Ticket>(ticket)

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value
    if (t.assignee === next) return
    const user = getCurrentUser()
    doc.transact(() => ticket.set('assignee', next))
    appendTicketEvent(t.id, {
      type: 'assigned',
      by: user.name,
      at: Date.now(),
      from: t.assignee,
      to: next,
    })
  }

  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-zinc-500">Assignee</span>
      <select
        value={ASSIGNEES.includes(t.assignee) ? t.assignee : 'unassigned'}
        onChange={onChange}
        className="rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        {ASSIGNEES.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
    </label>
  )
}
