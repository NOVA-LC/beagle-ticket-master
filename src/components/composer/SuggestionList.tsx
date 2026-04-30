import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import type { Entity } from '@/lib/entities'

export interface SuggestionListRef {
  /** Returns true if the keypress was handled by the menu. */
  onKeyDown: (e: { event: KeyboardEvent }) => boolean
}

interface Props {
  items: Entity[]
  command: (item: Entity) => void
}

const KIND_LABEL: Record<Entity['kind'], string> = {
  property: 'property',
  system: 'system',
  ticket: 'ticket',
}

const KIND_DOT: Record<Entity['kind'], string> = {
  property: 'bg-emerald-400',
  system: 'bg-cyan-400',
  ticket: 'bg-amber-400',
}

export const SuggestionList = forwardRef<SuggestionListRef, Props>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    setSelectedIndex(0)
  }, [items])

  const select = (index: number) => {
    const item = items[index]
    if (item) command(item)
  }

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowDown') {
        setSelectedIndex((i) => (i + 1) % Math.max(items.length, 1))
        return true
      }
      if (event.key === 'ArrowUp') {
        setSelectedIndex((i) => (i - 1 + items.length) % Math.max(items.length, 1))
        return true
      }
      if (event.key === 'Enter') {
        select(selectedIndex)
        return true
      }
      return false
    },
  }))

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-zinc-500 shadow-xl">
        No matches.
      </div>
    )
  }

  return (
    <div className="min-w-[260px] overflow-hidden rounded-md border border-slate-800 bg-slate-900 py-1 shadow-xl">
      {items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          onMouseEnter={() => setSelectedIndex(i)}
          onMouseDown={(e) => {
            e.preventDefault() // keep editor focus
            select(i)
          }}
          className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] transition-colors ${
            i === selectedIndex ? 'bg-slate-800 text-zinc-100' : 'text-zinc-300'
          }`}
        >
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${KIND_DOT[item.kind]}`} aria-hidden />
          <span className="flex-1 truncate">{item.label}</span>
          <span className="shrink-0 text-[10px] uppercase tracking-wider text-zinc-500">
            {KIND_LABEL[item.kind]}
          </span>
        </button>
      ))}
    </div>
  )
})
SuggestionList.displayName = 'SuggestionList'
