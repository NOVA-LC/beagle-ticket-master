import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as Y from 'yjs'
import { appendTicketEvent, doc, tickets } from '@/lib/yjs/doc'
import { toast } from '@/components/ui/toaster'

interface Step {
  label: string
  detail: string
  /** Pause AFTER this step before advancing to the next, in ms. */
  wait: number
  action: (navigate: ReturnType<typeof useNavigate>) => void | Promise<void>
}

const SCRIPTED_COMMENT_BODY =
  '[[Westlake Communities]] — confirmed, 17 missing waiver charges identified.'

const SCRIPTED_COMMENT_JSON = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        {
          type: 'biLink',
          attrs: { kind: 'property', id: 'westlake-communities', label: 'Westlake Communities' },
        },
        { type: 'text', text: ' — confirmed, 17 missing waiver charges identified.' },
      ],
    },
  ],
}

function setStatus(ticketId: string, to: 'triage' | 'scripting' | 'review' | 'done') {
  const ticket = tickets.get(ticketId) as Y.Map<unknown> | undefined
  if (!ticket) return
  const from = (ticket.get('status') as 'triage' | 'scripting' | 'review' | 'done') ?? 'triage'
  if (from === to) return
  doc.transact(() => ticket.set('status', to))
  appendTicketEvent(ticketId, {
    type: 'status_change',
    by: 'demo-bot',
    at: Date.now(),
    from,
    to,
  })
}

function postComment(ticketId: string, body: string, bodyJson: unknown) {
  appendTicketEvent(ticketId, {
    type: 'comment',
    by: 'demo-bot',
    at: Date.now(),
    body,
    bodyJson,
  })
}

function postSyntheticRun(ticketId: string) {
  appendTicketEvent(ticketId, {
    type: 'script_run',
    by: 'demo-bot',
    at: Date.now(),
    runBy: 'demo-bot',
    code: 'import pandas as pd\n# … reconciliation …',
    stdout:
      'Westlake reconciliation — 68 units\nMissing waiver charges: 17\n unit  tenant\n  101  Martinez, Jose A.\n  102  Chen, Wei\n  103  Patel, Priya',
    stderr: '',
    durationMs: 1240,
  })
}

const STEPS: Step[] = [
  {
    label: 'Land on Kanban',
    detail: 'Five seeded tickets, sorted by MRR at risk.',
    wait: 2500,
    action: (nav) => nav('/'),
  },
  {
    label: 'Drag BGL-102 from Triage → Scripting',
    detail: 'Mutating ticket.status — Yjs replicates to peers.',
    wait: 3000,
    action: () => setStatus('bgl-102', 'scripting'),
  },
  {
    label: 'Open BGL-101',
    detail: '⌘K → Westlake → Enter.',
    wait: 2500,
    action: (nav) => nav('/ticket/bgl-101'),
  },
  {
    label: 'Run the pandas reconciliation',
    detail: 'Pyodide-in-worker · pandas already preloaded.',
    wait: 3500,
    action: () => postSyntheticRun('bgl-101'),
  },
  {
    label: 'Type a comment with [[Westlake Communities]]',
    detail: 'Tiptap composer · BiLink resolves via entity registry.',
    wait: 3000,
    action: () => postComment('bgl-101', SCRIPTED_COMMENT_BODY, SCRIPTED_COMMENT_JSON),
  },
  {
    label: 'Hover the BiLink → AIContext fades in',
    detail: 'Pause for ~2s — let the popover surface "$138K liability exposure".',
    wait: 2500,
    action: () => {},
  },
  {
    label: 'Move BGL-101 from Scripting → Review',
    detail: 'Status change appends an event to the audit log.',
    wait: 2500,
    action: () => {
      setStatus('bgl-101', 'review')
      toast.success('Moved BGL-101 to Review')
    },
  },
  {
    label: 'Replay in 5s',
    detail: 'Loop continues until you close the tab.',
    wait: 5000,
    action: (nav) => nav('/'),
  },
]

/**
 * `/demo` — DEV-only autoplay walkthrough. Mounts in App.tsx only when
 * `import.meta.env.DEV` is true. Each step shows a banner, runs the action,
 * waits, then advances. Loops on completion.
 *
 * For a real demo against actual users, prefer the live `?simulate=david`
 * mode — it leaves the user in control while still adding the appearance of
 * a second peer.
 */
export function Demo() {
  const [stepIndex, setStepIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const navigate = useNavigate()
  const step = STEPS[stepIndex % STEPS.length]

  useEffect(() => {
    if (paused) return
    let cancelled = false
    void (async () => {
      try {
        await step.action(navigate)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[demo] step failed:', err)
      }
      if (cancelled) return
      const id = window.setTimeout(() => {
        if (!cancelled) setStepIndex((i) => i + 1)
      }, step.wait)
      return () => window.clearTimeout(id)
    })()
    return () => {
      cancelled = true
    }
  }, [stepIndex, paused, navigate, step])

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[400] -translate-x-1/2">
      <div className="pointer-events-auto flex max-w-[600px] items-center gap-3 rounded-lg border border-orange-900/60 bg-slate-900/95 px-4 py-3 shadow-2xl backdrop-blur">
        <span aria-hidden className="text-base">▶</span>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-orange-400">
            Autoplay · step {(stepIndex % STEPS.length) + 1} / {STEPS.length}
          </div>
          <div className="text-sm text-zinc-100">{step.label}</div>
          <div className="text-[11px] text-zinc-500">{step.detail}</div>
        </div>
        <button
          onClick={() => setPaused((p) => !p)}
          className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-zinc-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
      </div>
    </div>
  )
}
