import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ComposeNewTicket } from './ComposeNewTicket'

/**
 * Global keyboard shortcut layer. Mounted once at the AppLayout root.
 *
 * Routes:
 *   ⌘K / Ctrl+K → palette (handled by CommandPalette directly)
 *   ⌘\\          → toggle sidebar (handled by AppLayout)
 *   ⌘/          → focus the search button in TopHeader (custom event)
 *   ?            → keyboard cheatsheet (handled by KeyboardCheatsheet)
 *
 *   Single-letter shortcuts (no modifier, not in an input):
 *     g i        → /
 *     g h        → /?minMrr=1000
 *     c          → compose-new-ticket modal
 *     j / k      → next/prev ticket on the board (via custom event)
 *     Enter      → open the j/k-selected card (via custom event)
 *
 * Per-ticket shortcuts (s/a/t/r) are handled by CommandPalette since they
 * branch into palette sub-pages.
 */
function isTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.tagName === 'INPUT') return true
  if (target.tagName === 'TEXTAREA') return true
  if (target.isContentEditable) return true
  return false
}

const CHORD_TIMEOUT_MS = 1500

export function GlobalShortcuts() {
  const navigate = useNavigate()
  const [composeOpen, setComposeOpen] = useState(false)
  const chordRef = useRef<{ key: string; expiresAt: number } | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ⌘/Ctrl + ... shortcuts
      if (e.metaKey || e.ctrlKey) {
        if (e.key === '/') {
          e.preventDefault()
          window.dispatchEvent(new CustomEvent('beagle:focus-search'))
          return
        }
        // ⌘K, ⌘\\ are handled by their respective owners (CommandPalette, AppLayout).
        return
      }

      if (e.altKey) return
      if (isTextField(e.target)) return

      const now = Date.now()
      const chord = chordRef.current && chordRef.current.expiresAt > now ? chordRef.current : null
      chordRef.current = null

      // Chord follow-up.
      if (chord?.key === 'g') {
        if (e.key === 'i') {
          e.preventDefault()
          navigate('/')
          return
        }
        if (e.key === 'h') {
          e.preventDefault()
          navigate('/?minMrr=1000')
          return
        }
        // Unknown follow-up — fall through.
      }

      // Chord starters.
      if (e.key === 'g') {
        chordRef.current = { key: 'g', expiresAt: now + CHORD_TIMEOUT_MS }
        return
      }

      // Single-key shortcuts.
      if (e.key === 'c') {
        e.preventDefault()
        setComposeOpen(true)
        return
      }
      if (e.key === 'j') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('beagle:nav-next'))
        return
      }
      if (e.key === 'k') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('beagle:nav-prev'))
        return
      }
      if (e.key === 'Enter') {
        // Only trigger "open selected" if focus isn't on a button/link/etc —
        // those should handle their own Enter.
        const t = e.target as HTMLElement | null
        if (t && (t.tagName === 'BUTTON' || t.tagName === 'A')) return
        window.dispatchEvent(new CustomEvent('beagle:open-selected'))
        return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  return <ComposeNewTicket open={composeOpen} onOpenChange={setComposeOpen} />
}
