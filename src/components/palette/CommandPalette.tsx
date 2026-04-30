import { useEffect, useMemo, useRef, useState } from 'react'
import { Command } from 'cmdk'
import { useLocation } from 'react-router-dom'
import { usePaletteActions, type Page, type PaletteAction } from './usePaletteActions'
import { toast } from '@/components/ui/toaster'

const TITLE_BY_GROUP: Record<PaletteAction['group'], string> = {
  jump: 'Jump',
  ticket: 'Action on current ticket',
  filter: 'Filter board',
  navigate: 'Navigate',
  submenu: '',
}

const PAGE_HEADERS: Record<Page, string> = {
  root: '',
  status: 'Change status',
  assign: 'Assign to',
  tag: 'Add property tag',
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [pages, setPages] = useState<Page[]>([])
  const page: Page = pages[pages.length - 1] ?? 'root'

  const [value, setValue] = useState('')
  const [input, setInput] = useState('')

  /** Per-context selection memory: route + page → last selected `value`. */
  const memory = useRef<Map<string, string>>(new Map())

  const location = useLocation()
  const onTicketRoute = /^\/ticket\/.+/.test(location.pathname)

  const actions = usePaletteActions(page)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
        return
      }
      if (open) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (!onTicketRoute) return

      const subMap: Record<string, Page> = { s: 'status', a: 'assign', t: 'tag' }
      if (subMap[e.key]) {
        e.preventDefault()
        setPages([subMap[e.key]])
        setOpen(true)
      } else if (e.key === 'r') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('beagle:run-last-script'))
        toast('Re-ran last script')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onTicketRoute])

  const ctxKey = `${location.pathname}:${page}`

  useEffect(() => {
    if (open) {
      setValue(memory.current.get(ctxKey) ?? '')
      setInput('')
    }
  }, [open, ctxKey])

  useEffect(() => {
    if (open && value) memory.current.set(ctxKey, value)
  }, [value, open, ctxKey])

  useEffect(() => {
    if (!open) setPages([])
  }, [open])

  const grouped = useMemo(() => {
    const groups: Record<string, PaletteAction[]> = {}
    for (const a of actions) {
      ;(groups[a.group] ??= []).push(a)
    }
    return groups
  }, [actions])

  const onItemSelect = (action: PaletteAction) => {
    if (action.subPage) {
      setPages((p) => [...p, action.subPage!])
      setInput('')
      return
    }
    setOpen(false)
    action.onSelect()
    if (action.shortcut) {
      toast(`Use ${action.shortcut.toUpperCase()} next time`)
    }
  }

  const onCommandKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab') {
      const current = actions.find((a) => a.id === value)
      if (current?.subPage) {
        e.preventDefault()
        setPages((p) => [...p, current.subPage!])
        setInput('')
      }
    }
    if (e.key === 'Backspace' && input === '' && pages.length > 0) {
      e.preventDefault()
      setPages((p) => p.slice(0, -1))
    }
    if (e.key === 'Escape') setOpen(false)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 pt-[12vh] backdrop-blur-md"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false)
      }}
    >
      <div className="w-full max-w-[640px] overflow-hidden rounded-lg border border-slate-800 bg-slate-900 shadow-2xl">
        <Command
          label="Command palette"
          loop
          value={value}
          onValueChange={setValue}
          onKeyDown={onCommandKeyDown}
          className="flex flex-col"
        >
          {page !== 'root' && (
            <div className="flex items-center gap-2 border-b border-slate-800 px-3 py-2 text-[11px] text-zinc-400">
              <span className="rounded border border-slate-700 px-1.5 py-0.5 font-mono">
                {PAGE_HEADERS[page]}
              </span>
              <span className="text-zinc-600">backspace to go back</span>
            </div>
          )}
          <Command.Input
            value={input}
            onValueChange={setInput}
            placeholder={page === 'root' ? 'Type a command or search…' : 'Filter…'}
            className="w-full bg-transparent px-3 py-3 text-[13px] text-zinc-100 outline-none placeholder:text-zinc-500"
            autoFocus
          />
          <Command.List className="max-h-[420px] overflow-y-auto border-t border-slate-800 px-1 py-1">
            <Command.Empty className="px-3 py-6 text-center text-xs text-zinc-500">
              No results.
            </Command.Empty>

            {Object.entries(grouped).map(([groupKey, items]) => (
              <Command.Group
                key={groupKey}
                heading={TITLE_BY_GROUP[groupKey as PaletteAction['group']] || undefined}
                className="mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-zinc-500"
              >
                {items.map((a) => (
                  <Command.Item
                    key={a.id}
                    value={a.id}
                    keywords={[a.label, ...(a.keywords ?? [])]}
                    onSelect={() => onItemSelect(a)}
                    className="flex h-8 cursor-pointer items-center justify-between rounded px-2 text-[13px] text-zinc-300 aria-selected:bg-slate-800 aria-selected:text-zinc-100"
                  >
                    <span className="truncate">{a.label}</span>
                    {a.shortcut && (
                      <kbd className="ml-2 rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                        {a.shortcut.toUpperCase()}
                      </kbd>
                    )}
                    {!a.shortcut && a.subPage && (
                      <kbd className="ml-2 rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                        TAB
                      </kbd>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  )
}
