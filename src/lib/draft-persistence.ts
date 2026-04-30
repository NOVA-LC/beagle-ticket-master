import { useCallback, useEffect, useRef, useState } from 'react'

export interface RestoredDraft {
  content: string
  at: number
}

interface UseDraftPersistenceOptions {
  /** localStorage key — pass `draft:ticket:<id>` for ticket-scoped drafts. */
  key: string
  /** Debounce window for keystrokes — spec is 500ms. */
  debounceMs?: number
}

/**
 * Hook for autosaving a Tiptap-style content blob to localStorage.
 *
 * Returns `restored` once on mount with whatever was persisted; the consumer
 * can then call `editor.commands.setContent(restored.content)` and present
 * a "Draft restored" banner.
 *
 * `save()` is debounced — call it on every Tiptap update event.
 * `clear()` removes the key (call on submit or explicit dismiss).
 */
export function useDraftPersistence({ key, debounceMs = 500 }: UseDraftPersistenceOptions) {
  const [restored, setRestored] = useState<RestoredDraft | null>(null)
  const timerRef = useRef<number>(0)

  // One-shot read on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return
      const parsed = JSON.parse(raw) as RestoredDraft
      if (parsed && typeof parsed.content === 'string' && typeof parsed.at === 'number') {
        setRestored(parsed)
      }
    } catch {
      // Bad JSON — drop the key.
      localStorage.removeItem(key)
    }
  }, [key])

  const save = useCallback(
    (content: string) => {
      window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => {
        try {
          localStorage.setItem(key, JSON.stringify({ content, at: Date.now() } satisfies RestoredDraft))
        } catch {
          // Storage full or denied — silently drop. Drafts are best-effort.
        }
      }, debounceMs)
    },
    [key, debounceMs],
  )

  const clear = useCallback(() => {
    window.clearTimeout(timerRef.current)
    localStorage.removeItem(key)
    setRestored(null)
  }, [key])

  // Cancel any pending write on unmount.
  useEffect(() => {
    return () => window.clearTimeout(timerRef.current)
  }, [])

  return { restored, save, clear, dismissRestored: () => setRestored(null) }
}

const RTF = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

/** "14 minutes ago" / "2 hours ago" / "just now". */
export function formatRelative(ts: number): string {
  const diffMs = ts - Date.now()
  const minutes = Math.round(diffMs / 60000)
  if (Math.abs(minutes) < 1) return 'just now'
  if (Math.abs(minutes) < 60) return RTF.format(minutes, 'minute')
  const hours = Math.round(diffMs / 3600000)
  if (Math.abs(hours) < 24) return RTF.format(hours, 'hour')
  const days = Math.round(diffMs / 86400000)
  return RTF.format(days, 'day')
}
