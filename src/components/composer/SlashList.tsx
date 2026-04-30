import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import type { Editor, Range } from '@tiptap/core'

export interface SlashCommand {
  id: string
  label: string
  description: string
  onSelect: (ctx: { editor: Editor; range: Range }) => void
}

export interface SlashListRef {
  onKeyDown: (e: { event: KeyboardEvent }) => boolean
}

interface Props {
  items: SlashCommand[]
  command: (item: SlashCommand) => void
}

export const SlashList = forwardRef<SlashListRef, Props>(({ items, command }, ref) => {
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
        No commands.
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
            e.preventDefault()
            select(i)
          }}
          className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors ${
            i === selectedIndex ? 'bg-slate-800 text-zinc-100' : 'text-zinc-300'
          }`}
        >
          <span className="font-mono text-[12px] text-zinc-200">{item.label}</span>
          <span className="text-[11px] text-zinc-500">{item.description}</span>
        </button>
      ))}
    </div>
  )
})
SlashList.displayName = 'SlashList'
