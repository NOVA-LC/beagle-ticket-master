import { useCallback, useRef, useSyncExternalStore } from 'react'
import { awareness } from './doc'

export type AwarenessStates = Map<number, Record<string, unknown>>

/**
 * Subscribes to the WebRTC awareness instance and returns a snapshot Map of
 * clientId -> state. Re-snapshots on every `change` and `update` event so
 * cursors and joins/leaves both flow through.
 */
export function useYAwareness(): AwarenessStates {
  const snapshotRef = useRef<AwarenessStates>(new Map(awareness.getStates()))

  const subscribe = useCallback((onStoreChange: () => void) => {
    snapshotRef.current = new Map(awareness.getStates())

    const handler = () => {
      snapshotRef.current = new Map(awareness.getStates())
      onStoreChange()
    }
    awareness.on('change', handler)
    awareness.on('update', handler)
    return () => {
      awareness.off('change', handler)
      awareness.off('update', handler)
    }
  }, [])

  const getSnapshot = useCallback(() => snapshotRef.current, [])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
