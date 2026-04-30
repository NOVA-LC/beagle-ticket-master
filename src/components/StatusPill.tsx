import type { TicketStatus } from '@/lib/yjs/types'
import { STATUS_LABELS } from '@/lib/yjs/types'
import { cn } from '@/lib/utils'

/**
 * Phase-7 polish: dot + label, both inheriting the same color token per status.
 * Text is the source of truth; color is the second signal (no triple-coding).
 */
const TONES: Record<TicketStatus, { dot: string; bg: string; text: string; ring: string }> = {
  triage:    { dot: 'bg-zinc-400',    bg: 'bg-slate-900',     text: 'text-zinc-300', ring: 'ring-slate-700' },
  scripting: { dot: 'bg-blue-400',    bg: 'bg-blue-950/40',   text: 'text-blue-300', ring: 'ring-blue-900/60' },
  review:    { dot: 'bg-amber-400',   bg: 'bg-amber-950/40',  text: 'text-amber-300', ring: 'ring-amber-900/60' },
  done:      { dot: 'bg-emerald-400', bg: 'bg-emerald-950/40', text: 'text-emerald-300', ring: 'ring-emerald-900/60' },
}

export function StatusPill({ status }: { status: TicketStatus }) {
  const tone = TONES[status] ?? TONES.triage
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] ring-1 ring-inset',
        tone.bg,
        tone.text,
        tone.ring,
      )}
    >
      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} />
      {STATUS_LABELS[status]}
    </span>
  )
}
