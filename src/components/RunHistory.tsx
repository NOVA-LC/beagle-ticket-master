import { useState } from 'react'
import * as Y from 'yjs'
import { useYArray } from '@/lib/yjs/useYArray'
import type { ScriptRunEvent, TicketEvent } from '@/lib/yjs/types'

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export function RunHistory({ ticket }: { ticket: Y.Map<unknown> }) {
  const eventsArray = (ticket.get('events') as Y.Array<unknown> | undefined) ?? new Y.Array<unknown>()
  const events = useYArray<TicketEvent>(eventsArray)

  const runs = events
    .filter((e): e is ScriptRunEvent => e.type === 'script_run')
    .slice()
    .reverse()

  const [openId, setOpenId] = useState<string | null>(null)

  if (runs.length === 0) {
    return (
      <div className="border-t border-slate-800 px-4 py-6 text-xs text-zinc-500">
        No runs yet. Click <span className="text-zinc-300">Run</span> above to execute the script.
      </div>
    )
  }

  return (
    <section className="border-t border-slate-800">
      <h3 className="px-4 pb-2 pt-4 text-[11px] uppercase tracking-wider text-zinc-500">
        Run history · {runs.length}
      </h3>
      <ul>
        {runs.map((run) => {
          const open = openId === run.id
          return (
            <li key={run.id} className="border-t border-slate-800">
              <button
                onClick={() => setOpenId(open ? null : run.id)}
                className="flex w-full items-center justify-between px-4 py-2 text-left transition-colors hover:bg-slate-900/40"
              >
                <span className="text-xs text-zinc-300">
                  <span className="font-mono text-zinc-500">{formatTime(run.at)}</span>
                  <span className="mx-2 text-zinc-700">·</span>
                  {run.runBy}
                  <span className="mx-2 text-zinc-700">·</span>
                  <span className="tabular-nums text-zinc-500">{Math.round(run.durationMs)}ms</span>
                </span>
                <span className="text-xs text-zinc-500">{open ? '−' : '+'}</span>
              </button>
              {open && (
                <div className="space-y-2 px-4 pb-3">
                  <pre className="overflow-auto rounded border border-slate-800 bg-slate-950 p-2 font-mono text-[11px] text-zinc-400">
                    <code>{run.code}</code>
                  </pre>
                  <pre className="overflow-auto rounded border border-slate-800 bg-slate-950 p-2 font-mono text-[12px]">
                    <span className="text-zinc-200">{run.stdout}</span>
                    {run.stderr && <span className="text-red-400">{run.stderr}</span>}
                  </pre>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
