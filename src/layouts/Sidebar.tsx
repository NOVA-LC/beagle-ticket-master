import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: string
  /** Filter params this nav item is active under. Empty = active when no filters. */
  filterParams: Record<string, string>
}

const ITEMS: NavItem[] = [
  { to: '/', label: 'Inbox', icon: '🏠', filterParams: {} },
  { to: '/?minMrr=1000', label: 'High-Liability', icon: '⚠️', filterParams: { minMrr: '1000' } },
  { to: '/?property=yardi-sync', label: 'Reconciliations', icon: '🔄', filterParams: { property: 'yardi-sync' } },
  { to: '/settings', label: 'Settings', icon: '⚙️', filterParams: {} },
]

/**
 * NavLink's default `isActive` matches by pathname only — Inbox would light up
 * on `/?minMrr=1000` too. We disambiguate on filter params: Inbox is active
 * only when no filter params are present; High-Liability is active only when
 * `minMrr=1000`; etc.
 */
function useIsActive() {
  const location = useLocation()
  return (item: NavItem) => {
    const target = new URL(item.to, window.location.origin)
    if (location.pathname !== target.pathname) return false
    const current = new URLSearchParams(location.search)
    if (Object.keys(item.filterParams).length === 0) {
      // Inbox — active only when no filter params are set.
      if (item.to === '/') {
        return !current.has('minMrr') && !current.has('property') && !current.has('status')
      }
      return true
    }
    return Object.entries(item.filterParams).every(([k, v]) => current.get(k) === v)
  }
}

interface Props {
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: Props) {
  const isActive = useIsActive()

  const widthClass = collapsed ? 'md:w-14' : 'md:w-56'
  const mobileClass = mobileOpen
    ? 'fixed inset-y-0 left-0 z-40 flex w-56 flex-col'
    : 'hidden md:flex md:flex-col'

  return (
    <aside
      className={cn(
        'relative shrink-0 overflow-hidden border-r border-slate-800/60 bg-slate-950',
        'md:flex md:flex-col',
        widthClass,
        mobileClass,
      )}
    >
      {/* Brand orange bloom — pure decoration, top-left, low opacity */}
      <div
        className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-orange-500/10 blur-3xl"
        aria-hidden
      />

      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {ITEMS.map((item) => {
          const active = isActive(item)
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onMobileClose}
              title={collapsed ? item.label : undefined}
              className={cn(
                'group relative flex items-center gap-3 rounded px-2 py-1.5 text-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
                active
                  ? 'bg-slate-900 text-slate-200'
                  : 'text-zinc-400 hover:bg-slate-900/40 hover:text-zinc-200',
              )}
            >
              {active && (
                <span
                  className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-orange-500"
                  aria-hidden
                />
              )}
              <span aria-hidden className="text-base leading-none">
                {item.icon}
              </span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <button
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title="⌘\\"
        className={cn(
          'mx-2 mb-2 flex items-center gap-2 rounded px-2 py-1.5 text-xs text-zinc-500 transition-colors',
          'hover:bg-slate-900 hover:text-zinc-300',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
        )}
      >
        <span aria-hidden>{collapsed ? '→' : '←'}</span>
        {!collapsed && (
          <span className="flex-1 text-left">
            Collapse <kbd className="ml-1 rounded border border-slate-700 px-1 font-mono text-[10px]">⌘\\</kbd>
          </span>
        )}
      </button>
    </aside>
  )
}
