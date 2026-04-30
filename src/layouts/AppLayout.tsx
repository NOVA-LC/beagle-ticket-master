import { useEffect, useState, type ReactNode } from 'react'
import { LiveCursors } from '@/components/LiveCursors'
import { CommandPalette } from '@/components/palette/CommandPalette'
import { Toaster } from '@/components/ui/toaster'
import { Sidebar } from './Sidebar'
import { TopHeader } from './TopHeader'

const COLLAPSED_KEY = 'beagle:sidebar-collapsed'

/**
 * The shell every route renders inside. Mounts the singleton overlays
 * (LiveCursors, CommandPalette, Toaster) at the app root so they're available
 * regardless of which route is active.
 *
 * Sidebar collapse state is the only piece of UI chrome we cache to
 * localStorage — everything else (filters, selection) is in the URL.
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

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0')
    } catch {
      // Ignore — best effort.
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
      <Toaster />

      <div className="flex h-screen overflow-hidden">
        {/* Mobile drawer backdrop */}
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
            <div className="px-6 py-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
