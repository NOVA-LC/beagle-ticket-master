import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'

interface Shortcut {
  keys: string[]
  label: string
}

interface ShortcutGroup {
  title: string
  items: Shortcut[]
}

const GROUPS: ShortcutGroup[] = [
  {
    title: 'General',
    items: [
      { keys: ['⌘', 'K'], label: 'Open command palette' },
      { keys: ['?'], label: 'Show this cheatsheet' },
      { keys: ['Esc'], label: 'Close any modal or popover' },
      { keys: ['⌘', '\\'], label: 'Toggle sidebar' },
      { keys: ['⌘', '/'], label: 'Focus search' },
    ],
  },
  {
    title: 'Navigation',
    items: [
      { keys: ['G', 'I'], label: 'Go to inbox' },
      { keys: ['G', 'H'], label: 'Go to high-liability filter' },
      { keys: ['J'], label: 'Next ticket card' },
      { keys: ['K'], label: 'Previous ticket card' },
      { keys: ['Enter'], label: 'Open selected card' },
    ],
  },
  {
    title: 'Compose',
    items: [
      { keys: ['C'], label: 'Compose new ticket' },
      { keys: ['⌘', '↵'], label: 'Submit / run' },
    ],
  },
  {
    title: 'On a ticket',
    items: [
      { keys: ['S'], label: 'Change status' },
      { keys: ['A'], label: 'Assign to' },
      { keys: ['T'], label: 'Add property tag' },
      { keys: ['R'], label: 'Re-run last script' },
    ],
  },
]

export function KeyboardCheatsheet() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't intercept when typing into a field.
      const t = e.target as HTMLElement | null
      if (t?.tagName === 'INPUT' || t?.tagName === 'TEXTAREA' || t?.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      // ?, which on most US keyboards is shift+/
      if (e.key === '?') {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-md data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[210] w-[min(640px,95vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 shadow-2xl">
          <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <Dialog.Title className="text-sm font-semibold text-zinc-100">
              Keyboard shortcuts
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="rounded p-1 text-zinc-500 hover:bg-slate-800 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              ×
            </Dialog.Close>
          </header>

          <div className="grid max-h-[70vh] grid-cols-1 gap-6 overflow-auto p-4 sm:grid-cols-2">
            {GROUPS.map((group) => (
              <section key={group.title}>
                <h2 className="mb-2 text-[10px] uppercase tracking-wider text-zinc-500">
                  {group.title}
                </h2>
                <ul className="space-y-1">
                  {group.items.map((s) => (
                    <li key={s.label} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300">{s.label}</span>
                      <span className="flex items-center gap-1">
                        {s.keys.map((k) => (
                          <kbd
                            key={k}
                            className="rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400"
                          >
                            {k}
                          </kbd>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
