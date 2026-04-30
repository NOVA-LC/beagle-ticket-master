import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { TicketStatus } from './yjs/types'

export interface BoardFilters {
  property?: string
  minMrr?: number
  status?: TicketStatus
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

/**
 * URL is the source of truth for board filters. The Kanban reads from this hook;
 * the palette mutates via `update`. Other params on the URL (like ?simulate=) are
 * preserved on every patch.
 */
export function useUrlState() {
  const [params, setParams] = useSearchParams()

  const filters: BoardFilters = {
    property: params.get('property') ?? undefined,
    minMrr: params.get('minMrr') ? Number(params.get('minMrr')) : undefined,
    status: (params.get('status') as TicketStatus) || undefined,
  }

  const update = useCallback(
    (patch: Partial<BoardFilters>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(patch)) {
            if (v === undefined || v === null || v === '') next.delete(k)
            else next.set(k, String(v))
          }
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const clear = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('property')
        next.delete('minMrr')
        next.delete('status')
        return next
      },
      { replace: true },
    )
  }, [setParams])

  return { filters, update, clear }
}

export function ticketMatchesFilters(
  t: { mrr: number; status: TicketStatus; properties: string[] },
  f: BoardFilters,
): boolean {
  if (f.property && !t.properties.some((p) => slugify(p) === f.property)) return false
  if (f.minMrr !== undefined && t.mrr < f.minMrr) return false
  if (f.status && t.status !== f.status) return false
  return true
}
