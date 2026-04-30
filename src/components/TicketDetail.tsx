import * as Y from 'yjs'
import { useYMap } from '@/lib/yjs/useYMap'
import type { Ticket } from '@/lib/yjs/types'
import { CodeRunner } from './CodeRunner'
import { RunHistory } from './RunHistory'
import { MrrBadge } from './kanban/MrrBadge'
import { StatusPill } from './StatusPill'
import { Composer } from './composer/Composer'

interface Props {
  ticket: Y.Map<unknown>
  onBack: () => void
}

export function TicketDetail({ ticket, onBack }: Props) {
  const t = useYMap<Ticket & { events?: unknown[] }>(ticket)
  return (
    <div className="mx-auto max-w-5xl">
      <header className="border-b border-slate-800 px-4 py-6">
        <button onClick={onBack} className="mb-3 text-xs text-zinc-500 hover:text-zinc-300">
          ← Back to queue
        </button>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-zinc-500">{t.humanId}</span>
          <StatusPill status={t.status} />
          <MrrBadge value={t.mrrAtRisk} />
        </div>
        <h1 className="mt-2 text-lg font-semibold text-zinc-100">{t.title}</h1>
      </header>
      <div className="flex flex-col gap-6 px-4 py-4">
        <CodeRunner ticket={ticket} />
        <Composer ticket={ticket} />
      </div>
      <RunHistory ticket={ticket} />
    </div>
  )
}
