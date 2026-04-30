import { useCallback, useRef, useSyncExternalStore } from 'react'
import * as Y from 'yjs'

/**
 * Subscribes to a Y.Map (deep) and returns a JS snapshot via toJSON().
 *
 * Uses useSyncExternalStore so concurrent React renders see a consistent
 * snapshot — no tearing if Yjs commits land mid-render.
 *
 * The ref-cached snapshot keeps reference equality stable between renders;
 * we only rebuild on actual deep changes.
 */
export function useYMap<T>(map: Y.Map<unknown>): T {
  const snapshotRef = useRef<T>(map.toJSON() as T)

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      // Refresh once on subscribe — the map may have changed between render and effect.
      snapshotRef.current = map.toJSON() as T

      const handler = () => {
        snapshotRef.current = map.toJSON() as T
        onStoreChange()
      }
      map.observeDeep(handler)
      return () => map.unobserveDeep(handler)
    },
    [map],
  )

  const getSnapshot = useCallback(() => snapshotRef.current, [])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
