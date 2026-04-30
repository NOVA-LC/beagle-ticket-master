import { useNavigate } from 'react-router-dom'
import { getEntity, type EntityKind } from '@/lib/entities'
import { useUrlState, slugify } from '@/lib/url-state'

interface Props {
  entityId: string
  entityKind: EntityKind
}

/**
 * Renders the AI-style context popover body for a bi-link.
 *
 * Phase 4 reads from the local entity registry — no API call. Future phases
 * will swap this for a real AI call (likely streaming) but the surface stays
 * the same: input is `{entityId, entityKind}`, output is a body + actions.
 */
export function AIContext({ entityId, entityKind }: Props) {
  const navigate = useNavigate()
  const { update: setFilter } = useUrlState()
  const entity = getEntity(entityId)

  if (!entity) {
    return (
      <div className="text-xs text-zinc-500">No context available for {entityId}.</div>
    )
  }

  const onShowOpenTickets = () => {
    if (entityKind === 'property') {
      setFilter({ property: slugify(entity.label) })
      navigate(`/?property=${slugify(entity.label)}`)
    } else if (entityKind === 'ticket') {
      navigate(`/ticket/${entityId.toLowerCase()}`)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <header className="flex items-start gap-2">
        <span className="text-base leading-none" aria-hidden>
          🐕
        </span>
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">
            Beagle context
          </div>
          <div className="text-[13px] text-zinc-100">{entity.label}</div>
        </div>
      </header>

      <p className="text-[12px] leading-relaxed text-zinc-300">
        Context: {renderInlineMarkdown(entity.context)}
      </p>

      <div className="flex flex-col gap-1.5 border-t border-slate-800 pt-2">
        <button
          type="button"
          onClick={() => {
            // No-op stub — Phase 5 will wire to a real dashboard route.
            console.info('[ai-context] open property dashboard:', entity.id)
          }}
          className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-left text-[11px] text-zinc-300 transition-colors hover:bg-slate-800"
        >
          Open property dashboard
        </button>
        <button
          type="button"
          onClick={onShowOpenTickets}
          className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-left text-[11px] text-zinc-300 transition-colors hover:bg-slate-800"
        >
          {entityKind === 'ticket' ? 'Open this ticket' : 'Show open tickets for this property'}
        </button>
      </div>
    </div>
  )
}

/**
 * Tiny inline-markdown renderer for the **bold** spans we emit. Avoids pulling
 * in `marked` for one feature; if entity context grows beyond bold, swap to it.
 */
function renderInlineMarkdown(text: string) {
  const parts: Array<string | { bold: string }> = []
  const re = /\*\*([^*]+)\*\*/g
  let lastIdx = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIdx) parts.push(text.slice(lastIdx, m.index))
    parts.push({ bold: m[1] })
    lastIdx = m.index + m[0].length
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx))
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
