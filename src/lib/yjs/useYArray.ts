import { useCallback, useRef, useSyncExternalStore } from 'react'
import * as Y from 'yjs'

/** Tearing-free snapshot of a Y.Array. See useYMap for rationale. */
export function useYArray<T>(arr: Y.Array<unknown>): T[] {
  const snapshotRef = useRef<T[]>(arr.toJSON() as T[])

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      snapshotRef.current = arr.toJSON() as T[]

      const handler = () => {
        snapshotRef.current = arr.toJSON() as T[]
        onStoreChange()
      }
      arr.observeDeep(handler)
      return () => arr.unobserveDeep(handler)
    },
    [arr],
  )

  const getSnapshot = useCallback(() => snapshotRef.current, [])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
