import { useEffect, useRef, useState } from 'react'
import { appendTicketEvent, tickets } from '@/lib/yjs/doc'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'

const PERSONA = { name: 'David Park · CS', color: '#f97316' }
const COMMENT_INTERVAL_MS = 30_000

const COMMENTS = [
  'Hey — any update on this? Sarah is asking again about Monday.',
  '+1 to that reconciliation output. Looks right to me.',
  'Got it, thanks. Forwarding to Sarah now.',
  "Quick follow-up: the property manager is asking if we can rerun this for May.",
  'One more — David from accounting flagged something similar on a different account. Should I file a separate ticket?',
]

/**
 * Solo-laptop multiplayer simulator. Mounts when the URL has `?simulate=david`.
 *
 *   - Renders a smoothly-animated cursor labeled "David Park · CS" so the
 *     viewer sees a "second peer" without needing a second laptop or window.
 *   - Posts a comment to BGL-101 every 30s (cycling through canned messages).
 *
 * Pause/Resume button floats bottom-left so the demo presenter can quiet it
 * during slow segments. Persistence: nothing — it's a UI-only effect, but
 * the comments DO land in Yjs and propagate to real peers.
 */
export function FakePeer() {
  const [enabled, setEnabled] = useState(true)
  const [pos, setPos] = useState({ x: 320, y: 280 })
  const tRef = useRef(0)

  // Smoothly-animated cursor: a sin/cos lissajous so it looks human-ish.
  useEffect(() => {
    if (!enabled) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      tRef.current += dt * 0.5
      const t = tRef.current
      setPos({
        x: Math.sin(t) * 220 + window.innerWidth * 0.55,
        y: Math.cos(t * 0.7) * 140 + window.innerHeight * 0.45,
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [enabled])

  // Periodic comment poster. Each post is real Yjs activity — replicates to
  // peers, lands in the audit log, surfaces a toast.
  useEffect(() => {
    if (!enabled) return
    let i = 0
    const id = window.setInterval(() => {
      const ticket = tickets.get('bgl-101')
      if (!ticket) return
      const body = COMMENTS[i % COMMENTS.length]
      appendTicketEvent('bgl-101', {
        type: 'comment',
        by: PERSONA.name,
        at: Date.now(),
        body,
      })
      toast(`${PERSONA.name} posted on BGL-101`, {
        description: body.length > 60 ? body.slice(0, 57) + '…' : body,
      })
      i++
    }, COMMENT_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [enabled])

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed z-[60] left-0 top-0 transition-transform duration-200 ease-out"
        style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M2 2 L16 9 L9 11 L7 16 Z"
            fill={PERSONA.color}
            stroke="#0f172a"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
        <div
          className="ml-3 -mt-1 inline-block rounded px-1.5 py-0.5 text-[11px] leading-none text-white"
          style={{ backgroundColor: PERSONA.color }}
        >
          {PERSONA.name}
        </div>
      </div>

      <button
        onClick={() => setEnabled((e) => !e)}
        className={cn(
          'fixed bottom-4 left-4 z-[300] inline-flex items-center gap-1.5 rounded-md border bg-slate-900 px-2 py-1 text-[11px] shadow-lg transition-colors',
          enabled
            ? 'border-orange-700 text-orange-200 hover:bg-slate-800'
            : 'border-slate-700 text-zinc-400 hover:bg-slate-800',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        )}
        title="Toggle simulated peer activity"
      >
        <span aria-hidden>{enabled ? '⏸' : '▶'}</span>
        {enabled ? 'Pause David' : 'Resume David'}
      </button>
    </>
  )
}
