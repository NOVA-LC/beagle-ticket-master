import { useEffect } from 'react'
import { awareness } from '@/lib/yjs/doc'
import { useYAwareness } from '@/lib/yjs/useYAwareness'
import { getCurrentUser } from '@/lib/user'

const localUser = getCurrentUser()

type CursorState = { x: number; y: number } | null
type UserState = { name: string; color: string }

export function LiveCursors() {
  const states = useYAwareness()

  useEffect(() => {
    awareness.setLocalStateField('user', localUser)

    let lastEmit = 0
    const onMove = (e: MouseEvent) => {
      const now = performance.now()
      if (now - lastEmit < 50) return
      lastEmit = now
      awareness.setLocalStateField('cursor', { x: e.clientX, y: e.clientY })
    }
    const onLeave = () => awareness.setLocalStateField('cursor', null)

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeave)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {Array.from(states.entries()).map(([clientId, state]) => {
        if (clientId === awareness.clientID) return null
        const cursor = state.cursor as CursorState
        const peer = state.user as UserState | undefined
        if (!cursor || !peer) return null
        return (
          <div
            key={clientId}
            aria-hidden
            className="absolute left-0 top-0 transition-transform duration-200 ease-out"
            style={{ transform: `translate(${cursor.x - 2}px, ${cursor.y - 2}px)` }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <path
                d="M2 2 L16 9 L9 11 L7 16 Z"
                fill={peer.color}
                stroke="#0f172a"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </svg>
            <div
              className="ml-3 -mt-1 inline-block rounded px-1.5 py-0.5 text-[11px] leading-none text-white"
              style={{ backgroundColor: peer.color }}
            >
              {peer.name}
            </div>
          </div>
        )
      })}
    </div>
  )
}
