import { useEffect, useState } from 'react'
import { webrtcProvider } from '@/lib/yjs/doc'
import { cn } from '@/lib/utils'

interface State {
  signaling: 'connecting' | 'connected' | 'disconnected'
  peers: number
  online: boolean
}

/**
 * Top-header connection strip. Three colors of truth:
 *   - emerald: signaling connected (with or without peers — at least we can find some)
 *   - amber:   reconnecting / signaling lost but app is online
 *   - slate:   browser is offline (changes saved locally via IDB)
 *
 * Hover/title shows the peer count. Designed to never panic the user;
 * Beagle's whole story is "your data is safe locally regardless".
 */
export function ConnectionStatus() {
  const [state, setState] = useState<State>(() => ({
    signaling: 'connecting',
    peers: 0,
    online: navigator.onLine,
  }))

  useEffect(() => {
    type StatusEvent = { connected: boolean }
    type PeersEvent = { webrtcPeers: string[]; bcPeers: string[] }

    const onStatus = (event: StatusEvent) => {
      setState((s) => ({ ...s, signaling: event.connected ? 'connected' : 'disconnected' }))
    }
    const onPeers = (event: PeersEvent) => {
      const count = (event.webrtcPeers?.length ?? 0) + (event.bcPeers?.length ?? 0)
      setState((s) => ({ ...s, peers: count }))
    }
    const onOnline = () => setState((s) => ({ ...s, online: true }))
    const onOffline = () => setState((s) => ({ ...s, online: false }))

    webrtcProvider.on('status', onStatus)
    webrtcProvider.on('peers', onPeers)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      webrtcProvider.off('status', onStatus)
      webrtcProvider.off('peers', onPeers)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  let label: string
  let dotClass: string
  let textClass: string

  if (!state.online) {
    label = 'Offline · changes saved locally'
    dotClass = 'bg-slate-500'
    textClass = 'text-zinc-500'
  } else if (state.signaling !== 'connected') {
    label = 'Reconnecting…'
    dotClass = 'bg-amber-400 animate-pulse'
    textClass = 'text-amber-300'
  } else {
    label = `Live · ${state.peers} peer${state.peers === 1 ? '' : 's'}`
    dotClass = 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.6)]'
    textClass = 'text-emerald-300'
  }

  return (
    <div
      className="hidden items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/60 px-2 py-0.5 text-[11px] sm:inline-flex"
      title={label}
      role="status"
      aria-live="polite"
    >
      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full transition-colors duration-200', dotClass)} />
      <span className={cn('tabular-nums', textClass)}>{label}</span>
    </div>
  )
}
