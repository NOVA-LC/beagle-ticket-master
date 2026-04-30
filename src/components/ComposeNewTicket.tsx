import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Y from 'yjs'
import { useNavigate } from 'react-router-dom'
import { doc, tickets } from '@/lib/yjs/doc'
import { useYMap } from '@/lib/yjs/useYMap'
import { toast } from '@/components/ui/toaster'
import { cn } from '@/lib/utils'

const ASSIGNEES = ['Data Eng Team', 'CS', 'unassigned'] as const

function nextHumanId(): string {
  let max = 100
  tickets.forEach((value) => {
    const t = value as Y.Map<unknown>
    const h = t.get('humanId') as string | undefined
    if (!h) return
    const n = parseInt(h.replace(/^BGL-/i, ''), 10)
    if (Number.isFinite(n) && n > max) max = n
  })
  return `BGL-${max + 1}`
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ComposeNewTicket({ open, onOpenChange }: Props) {
  const [title, setTitle] = useState('')
  const [assignee, setAssignee] = useState<(typeof ASSIGNEES)[number]>('unassigned')
  const navigate = useNavigate()
  // Re-derive humanId preview when tickets change.
  useYMap<Record<string, unknown>>(tickets)

  // Reset form on open.
  useEffect(() => {
    if (open) {
      setTitle('')
      setAssignee('unassigned')
    }
  }, [open])

  const submit = () => {
    const trimmed = title.trim()
    if (!trimmed) return

    const humanId = nextHumanId()
    const id = humanId.toLowerCase()

    doc.transact(() => {
      const t = new Y.Map<unknown>()
      t.set('id', id)
      t.set('humanId', humanId)
      t.set('title', trimmed)
      t.set('status', 'triage')
      t.set('priority', 3)
      t.set('assignee', assignee)
      t.set('mrrAtRisk', 0)
      t.set('properties', [])
      t.set('createdAt', Date.now())
      t.set('events', new Y.Array())
      tickets.set(id, t)
    })

    toast.success(`Created ${humanId}`, {
      action: { label: 'Open', onClick: () => navigate(`/ticket/${id}`) },
    })
    onOpenChange(false)
    navigate(`/ticket/${id}`)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-md" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[210] w-[min(520px,95vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 shadow-2xl">
          <header className="border-b border-slate-800 px-4 py-3">
            <Dialog.Title className="text-sm font-semibold text-zinc-100">
              New ticket
            </Dialog.Title>
            <Dialog.Description className="mt-0.5 text-[11px] text-zinc-500">
              Quick capture. You can flesh out the details after creating it.
            </Dialog.Description>
          </header>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
            className="space-y-3 p-4"
          >
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">Title</span>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to happen?"
                className="rounded border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus-visible:ring-2 focus-visible:ring-blue-500"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">Assignee</span>
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value as (typeof ASSIGNEES)[number])}
                className="rounded border border-slate-800 bg-slate-950 px-2 py-2 text-xs text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {ASSIGNEES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>

            <footer className="flex items-center justify-between gap-2 pt-2">
              <span className="text-[11px] text-zinc-500">
                Will be created as <span className="font-mono text-zinc-300">{nextHumanId()}</span>
              </span>
              <div className="flex gap-2">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-md border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-zinc-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-xs transition-colors',
                    title.trim()
                      ? 'border-cyan-800 bg-cyan-950 text-cyan-200 hover:bg-cyan-900'
                      : 'border-slate-800 bg-slate-900 text-zinc-600',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                  )}
                >
                  Create
                </button>
              </div>
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
