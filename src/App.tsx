import { Routes, Route, useNavigate, useParams } from 'react-router-dom'
import * as Y from 'yjs'
import { LiveCursors } from '@/components/LiveCursors'
import { CommandPalette } from '@/components/palette/CommandPalette'
import { Toaster } from '@/components/ui/toaster'
import { RevenueKanban } from '@/components/kanban/RevenueKanban'
import { TicketDetail } from '@/components/TicketDetail'
import { tickets } from '@/lib/yjs/doc'
import { useYMap } from '@/lib/yjs/useYMap'

function TicketDetailRoute() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  // Subscribe to root so freshly-replicated tickets appear here too.
  useYMap<Record<string, unknown>>(tickets)
  const ticket = id ? ((tickets.get(id) as Y.Map<unknown> | undefined) ?? null) : null

  if (!ticket) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <p className="text-sm text-zinc-400">Ticket not found.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-3 text-xs text-zinc-500 hover:text-zinc-300"
        >
          ← Back to queue
        </button>
      </div>
    )
  }
  return <TicketDetail ticket={ticket} onBack={() => navigate('/')} />
}

function Settings() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-lg font-semibold text-zinc-100">Settings</h1>
      <p className="mt-2 text-sm text-zinc-500">Coming soon.</p>
    </div>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-zinc-100">
      <LiveCursors />
      <CommandPalette />
      <Toaster />
      <Routes>
        <Route path="/" element={<RevenueKanban />} />
        <Route path="/ticket/:id" element={<TicketDetailRoute />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </div>
  )
}
