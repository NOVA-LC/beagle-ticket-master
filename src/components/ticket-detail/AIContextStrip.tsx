import { useState } from 'react'
import * as Y from 'yjs'
import { useYMap } from '@/lib/yjs/useYMap'
import type { Ticket } from '@/lib/yjs/types'
import { ENTITIES } from '@/lib/entities'
import { useUrlState, slugify } from '@/lib/url-state'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

/**
 * Sticky AI-context strip. If the ticket has any property tags AND we have
 * a registered entity for at least one of them, surface the most relevant
 * one (first match) above the timeline. Click expands to show full context.
 *
 * "Highest-MRR property" wasn't well-defined (we don't track per-property
 * MRR yet), so we pick the first property tag that has an entity record.
 * Future: rank by aggregate ticket MRR per property.
 */
export function AIContextStrip({ ticket }: { ticket: Y.Map<unknown> }) {
  const t = useYMap<Ticket>(ticket)
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()
  const { update: setFilter } = useUrlState()

  const properties = t.properties ?? []
  if (properties.length === 0) return null

  const entity = properties
    .map((p) => ENTITIES.find((e) => e.label === p))
    .find((e): e is NonNullable<typeof e> => !!e)

  if (!entity) return null

  return (
    <div className="rounded-md border border-blue-900/50 bg-blue-950/20">
      <button
        onClick={() => setExpanded((e) => !e)}
        className={cn(
          'flex w-full items-center justify-between gap-3 px-3 py-2 text-left',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded-md',
        )}
      >
        <div className="flex items-center gap-2">
          <span aria-hidden>🐕</span>
          <span className="text-[10px] uppercase tracking-wider text-blue-300">Beagle context</span>
          <span className="text-xs text-zinc-300">{entity.label}</span>
        </div>
        <span className="text-xs text-blue-300">{expanded ? '−' : '+'}</span>
      </button>
      {expanded && (
        <div className="space-y-2 border-t border-blue-900/50 px-3 pb-3 pt-2">
          <p className="text-[12px] leading-relaxed text-zinc-300">{renderInline(entity.context)}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => {
                setFilter({ property: slugify(entity.label) })
                navigate(`/?property=${slugify(entity.label)}`)
              }}
              className="rounded border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] text-zinc-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Show open tickets
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function renderInline(text: string) {
  const parts: Array<string | { bold: string }> = []
  const re = /\*\*([^*]+)\*\*/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push({ bold: m[1] })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return (
    <>
      {parts.map((p, i) =>
        typeof p === 'string' ? (
          <span key={i}>{p}</span>
        ) : (
          <strong key={i} className="font-semibold text-zinc-100">{p.bold}</strong>
        ),
      )}
    </>
  )
}
