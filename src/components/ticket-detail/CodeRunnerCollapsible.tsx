import { useMemo, useState } from 'react'
import * as Y from 'yjs'
import { useYArray } from '@/lib/yjs/useYArray'
import type { TicketEvent } from '@/lib/yjs/types'
import { CodeRunner } from '@/components/CodeRunner'

/**
 * Collapsible wrapper around the Phase-2 CodeRunner.
 *
 * Spec: collapsed by default, but expand if the most recent event on the
 * ticket is a `script_run` (suggesting the user is mid-investigation and
 * likely wants to iterate).
 */
export function CodeRunnerCollapsible({ ticket }: { ticket: Y.Map<unknown> }) {
  const eventsArr = (ticket.get('events') as Y.Array<unknown> | undefined) ?? new Y.Array<unknown>()
  const events = useYArray<TicketEvent>(eventsArr)

  const initialExpanded = useMemo(() => {
    const last = events[events.length - 1]
    return last?.type === 'script_run'
  }, []) // intentional: only check on mount; user controls afterwards

  const [expanded, setExpanded] = useState(initialExpanded)

  return (
    <section className="rounded-md border border-slate-800/60 bg-slate-900/30">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-zinc-400 transition-colors hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <span className="flex items-center gap-2">
          <span aria-hidden>🐍</span>
          <span>Run a Python script</span>
        </span>
        <span>{expanded ? '−' : '+'}</span>
      </button>
      {expanded && (
        <div className="border-t border-slate-800/60 p-3">
          <CodeRunner ticket={ticket} />
        </div>
      )}
    </section>
  )
}
