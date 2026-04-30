import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import { LiveCursors } from '@/components/LiveCursors'
import { CommandPalette } from '@/components/palette/CommandPalette'
import { Toaster } from '@/components/ui/toaster'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { GlobalShortcuts } from '@/components/GlobalShortcuts'
import { KeyboardCheatsheet } from '@/components/KeyboardCheatsheet'
import { Sidebar } from './Sidebar'
import { TopHeader } from './TopHeader'

// Lazy so the FakePeer chunk only loads when ?simulate=david is set.
const FakePeer = lazy(() => import('@/components/FakePeer').then((m) => ({ default: m.FakePeer })))

const COLLAPSED_KEY = 'beagle:sidebar-collapsed'

/**
 * The shell every route renders inside. Mounts singleton overlays
 * (LiveCursors, CommandPalette, GlobalShortcuts, KeyboardCheatsheet,
 * Toaster) at the app root + wraps route content in an ErrorBoundary so
 * the chrome keeps working even when a route subtree crashes.
 *
 * Sidebar collapse is the only piece of UI chrome we cache to localStorage —
 * everything else (filters, selection) is in the URL.
 */
export function AppLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === '1'
    } catch {
      return false
    }
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  const simulating = useMemo(
    () => new URLSearchParams(window.location.search).get('simulate') === 'david',
    [],
  )

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0')
    } catch {
      // best-effort
    }
  }, [collapsed])

  // ⌘\ toggles the sidebar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault()
        setCollapsed((c) => !c)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-zinc-100">
      <LiveCursors />
      <CommandPalette />
      <KeyboardCheatsheet />
      <GlobalShortcuts />
      <Toaster />
      {simulating && (
        <Suspense fallback={null}>
          <FakePeer />
        </Suspense>
      )}

      <div className="flex h-screen overflow-hidden">
        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
            aria-hidden
          />
        )}

        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopHeader onMenuClick={() => setMobileOpen(true)} />
          <main className="flex-1 overflow-auto">
            <div className="px-4 py-4 sm:px-6 sm:py-6">
              <ErrorBoundary>{children}</ErrorBoundary>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
