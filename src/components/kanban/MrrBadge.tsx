import { cn } from '@/lib/utils'

const fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

/**
 * Two signals only: bg color tier + 💰 emoji. No bold weight, no alarm copy.
 */
export function MrrBadge({ value }: { value: number }) {
  const tone =
    value > 1000
      ? 'bg-red-950/60 text-red-300 border border-red-900/60'
      : value >= 250
        ? 'bg-amber-950/60 text-amber-300 border border-amber-900/60'
        : 'bg-slate-800 text-slate-400 border border-slate-700'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] tabular-nums',
        tone,
      )}
    >
      <span aria-hidden>💰</span> ${fmt.format(value)} MRR
    </span>
  )
}
