import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useYAwareness } from '@/lib/yjs/useYAwareness'
import { awareness } from '@/lib/yjs/doc'
import { cn } from '@/lib/utils'

interface Props {
  onMenuClick: () => void
}

interface PeerSummary {
  clientId: number
  name: string
  color: string
}

function initials(name: string): string {
  return name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '·'
}

function openPalette() {
  // CommandPalette listens for this custom event; see CommandPalette.tsx.
  window.dispatchEvent(new CustomEvent('beagle:open-palette'))
}

export function TopHeader({ onMenuClick }: Props) {
  const states = useYAwareness()

  const peers = useMemo<PeerSummary[]>(() => {
    const out: PeerSummary[] = []
    for (const [clientId, state] of states.entries()) {
      if (clientId === awareness.clientID) continue
      const user = state.user as { name?: string; color?: string } | undefined
      if (!user?.name) continue
      out.push({ clientId, name: user.name, color: user.color ?? '#94a3b8' })
    }
    return out.slice(0, 5)
  }, [states])

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-slate-800/60 bg-slate-950 px-4">
      <button
        onClick={onMenuClick}
        aria-label="Open navigation"
        className="rounded p-1 text-zinc-400 hover:bg-slate-900 hover:text-zinc-200 md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        ☰
      </button>

      <Link
        to="/"
        className="flex items-center gap-1.5 font-extrabold tracking-tight text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        <span aria-hidden className="text-lg">🐕</span>
        <span>beagle</span>
      </Link>

      <button
        onClick={openPalette}
        className={cn(
          'mx-auto flex w-full max-w-md items-center justify-between rounded-md border border-slate-800 bg-slate-900/40 px-3 py-1.5 text-xs text-zinc-500',
          'hover:border-slate-700 hover:text-zinc-400 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
        )}
      >
        <span>Search tickets, properties, scripts…</span>
        <kbd className="rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {peers.map((p) => (
            <div
              key={p.clientId}
              title={p.name}
              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-950 text-[10px] font-medium text-slate-900"
              style={{ backgroundColor: p.color }}
            >
              {initials(p.name)}
            </div>
          ))}
        </div>
        <UserMenu />
      </div>
    </header>
  )
}

function UserMenu() {
  return (
    <button
      aria-label="User menu"
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-[10px] text-zinc-300',
        'hover:border-slate-600 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
      )}
    >
      JV
    </button>
  )
}
