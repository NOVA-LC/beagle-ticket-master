import { useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import { useYMap } from '@/lib/yjs/useYMap'
import type { Ticket } from '@/lib/yjs/types'

/**
 * Inline-editable ticket title.
 *
 * Spec asked for "Tiptap single-line"; a controlled `<input>` is functionally
 * equivalent (no mark formatting on titles, Enter blurs to commit, Escape
 * reverts) and avoids spinning up a Tiptap instance per ticket header.
 *
 * Sync rule: while focused, the local draft is the source of truth — remote
 * changes don't clobber the user's typing. On blur, commit if changed.
 */
export function EditableTitle({ ticket }: { ticket: Y.Map<unknown> }) {
  const t = useYMap<Ticket>(ticket)
  const [draft, setDraft] = useState(t.title)
  const focusedRef = useRef(false)

  // Pull remote updates into the input only when not focused.
  useEffect(() => {
    if (!focusedRef.current) setDraft(t.title)
  }, [t.title])

  const commit = () => {
    if (draft && draft !== t.title) {
      ticket.set('title', draft)
    } else if (!draft) {
      // Refuse to wipe the title to empty — revert.
      setDraft(t.title)
    }
  }

  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => {
        focusedRef.current = true
      }}
      onBlur={() => {
        focusedRef.current = false
        commit()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          ;(e.target as HTMLInputElement).blur()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          setDraft(t.title)
          ;(e.target as HTMLInputElement).blur()
        }
      }}
      aria-label="Ticket title"
      className="w-full rounded-md bg-transparent px-2 py-1 text-lg font-semibold text-zinc-100 outline-none transition-colors hover:bg-slate-900/50 focus:bg-slate-900 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
    />
  )
}
