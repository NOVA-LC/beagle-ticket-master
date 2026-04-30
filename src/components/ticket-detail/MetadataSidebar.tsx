import { useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import { useYMap } from '@/lib/yjs/useYMap'
import type { Ticket } from '@/lib/yjs/types'
import { StatusSelect } from './StatusSelect'
import { AssigneeSelect } from './AssigneeSelect'
import { MrrBadge } from '@/components/kanban/MrrBadge'
import { ENTITIES } from '@/lib/entities'

const fmtAbs = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

export function MetadataSidebar({ ticket }: { ticket: Y.Map<unknown> }) {
  const t = useYMap<Ticket>(ticket)

  return (
    <aside className="flex flex-col gap-4 rounded-md border border-slate-800/60 bg-slate-900/20 p-4">
      <h2 className="text-[10px] uppercase tracking-wider text-zinc-500">Properties</h2>

      <StatusSelect ticket={ticket} />
      <AssigneeSelect ticket={ticket} />

      <MrrAtRiskField ticket={ticket} />

      <Section title="Tags">
        {t.properties && t.properties.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {t.properties.map((p) => (
              <span
                key={p}
                className="rounded border border-slate-800 bg-slate-900 px-1.5 py-0.5 text-[10px] text-zinc-400"
              >
                {p}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-[11px] text-zinc-600">No tags. Use ⌘K → Add property tag.</span>
        )}
      </Section>

      <Section title="Linked tickets">
        <LinkedTickets ticket={ticket} />
      </Section>

      <Section title="Watchers">
        <span className="text-[11px] text-zinc-600">Just you (Phase 6).</span>
      </Section>

      <Section title="Created">
        <span className="text-[11px] tabular-nums text-zinc-400">{fmtAbs.format(t.createdAt)}</span>
      </Section>

      <Section title="Updated">
        <UpdatedTimestamp ticket={ticket} />
      </Section>
    </aside>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-[10px] uppercase tracking-wider text-zinc-500">{title}</h3>
      {children}
    </div>
  )
}

function MrrAtRiskField({ ticket }: { ticket: Y.Map<unknown> }) {
  const t = useYMap<Ticket>(ticket)
  const [draft, setDraft] = useState(String(t.mrrAtRisk))
  const focusedRef = useRef(false)

  useEffect(() => {
    if (!focusedRef.current) setDraft(String(t.mrrAtRisk))
  }, [t.mrrAtRisk])

  const commit = () => {
    const n = Number(draft)
    if (Number.isFinite(n) && n >= 0 && n !== t.mrrAtRisk) {
      ticket.set('mrrAtRisk', n)
    } else {
      setDraft(String(t.mrrAtRisk))
    }
  }

  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-zinc-500">MRR at risk</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => {
            focusedRef.current = true
          }}
          onBlur={() => {
            focusedRef.current = false
            commit()
          }}
          className="w-24 rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs tabular-nums text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        />
        <MrrBadge value={t.mrrAtRisk} />
      </div>
    </label>
  )
}

function LinkedTickets({ ticket }: { ticket: Y.Map<unknown> }) {
  const t = useYMap<Ticket>(ticket)
  // Linked tickets are properties that match an entity of kind 'ticket'.
  const linked = (t.properties ?? [])
    .map((p) => ENTITIES.find((e) => e.label === p && e.kind === 'ticket'))
    .filter((e): e is NonNullable<typeof e> => !!e)
  if (linked.length === 0) {
    return <span className="text-[11px] text-zinc-600">None.</span>
  }
  return (
    <div className="flex flex-col gap-1">
      {linked.map((e) => (
        <a
          key={e.id}
          href={`/ticket/${e.id.toLowerCase()}`}
          className="rounded border border-blue-900/50 bg-blue-950/40 px-2 py-1 text-[11px] text-blue-200 transition-colors hover:bg-blue-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          [[{e.label}]]
        </a>
      ))}
    </div>
  )
}

function UpdatedTimestamp({ ticket }: { ticket: Y.Map<unknown> }) {
  // Derive "updated at" from the latest event's `at`.
  const eventsArr = (ticket.get('events') as Y.Array<unknown> | undefined) ?? new Y.Array<unknown>()
  // We pull just the last entry length to trigger re-render on append.
  const t = useYMap<Ticket & { events?: Array<{ at: number }> }>(ticket)
  const latest = (t.events ?? []).slice(-1)[0]
  void eventsArr
  return (
    <span className="text-[11px] tabular-nums text-zinc-400">
      {latest ? fmtAbs.format(latest.at) : fmtAbs.format(t.createdAt)}
    </span>
  )
}
