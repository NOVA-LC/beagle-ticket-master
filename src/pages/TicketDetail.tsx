import { useNavigate, useParams } from 'react-router-dom'
import * as Y from 'yjs'
import { tickets } from '@/lib/yjs/doc'
import { useYMap } from '@/lib/yjs/useYMap'
import type { Ticket } from '@/lib/yjs/types'
import { StatusPill } from '@/components/StatusPill'
import { MrrBadge } from '@/components/kanban/MrrBadge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Composer } from '@/components/composer/Composer'
import { EditableTitle } from '@/components/ticket-detail/EditableTitle'
import { EventTimeline } from '@/components/ticket-detail/EventTimeline'
import { AIContextStrip } from '@/components/ticket-detail/AIContextStrip'
import { CodeRunnerCollapsible } from '@/components/ticket-detail/CodeRunnerCollapsible'
import { MetadataSidebar } from '@/components/ticket-detail/MetadataSidebar'
import { NotFound } from '@/components/empty/NotFound'

function initials(s: string): string {
  return s.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '·'
}

export function TicketDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Subscribe to root so freshly-replicated tickets show up.
  useYMap<Record<string, unknown>>(tickets)
  const ticket = id ? ((tickets.get(id) as Y.Map<unknown> | undefined) ?? null) : null

  if (!ticket) return <NotFound />

  return (
    <div className="mx-auto max-w-[1400px]">
      <button
        onClick={() => navigate('/')}
        className="mb-3 text-xs text-zinc-500 hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded"
      >
        ← Back to queue
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <MainPane ticket={ticket} />
        <MetadataSidebar ticket={ticket} />
      </div>
    </div>
  )
}

function MainPane({ ticket }: { ticket: Y.Map<unknown> }) {
  const t = useYMap<Ticket>(ticket)

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3 px-2">
          <span className="font-mono text-xs text-zinc-500">{t.humanId}</span>
          <StatusPill status={t.status} />
          <MrrBadge value={t.mrrAtRisk} />
          <Avatar className="ml-auto h-6 w-6 border border-slate-700 bg-slate-800">
            <AvatarFallback className="bg-slate-800 text-[9px] text-zinc-300">
              {initials(t.assignee)}
            </AvatarFallback>
          </Avatar>
        </div>
        <EditableTitle ticket={ticket} />
      </header>

      <AIContextStrip ticket={ticket} />

      <EventTimeline ticket={ticket} />

      <CodeRunnerCollapsible ticket={ticket} />

      <div className="sticky bottom-0 -mx-6 mt-2 border-t border-slate-800/60 bg-slate-950/95 px-6 pb-4 pt-3 backdrop-blur-sm">
        <Composer ticket={ticket} />
      </div>
    </section>
  )
}
