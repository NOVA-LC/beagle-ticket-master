import { useState } from 'react'
import * as Y from 'yjs'
import { useYArray } from '@/lib/yjs/useYArray'
import type {
  AssignedEvent,
  CommentEvent,
  CreatedEvent,
  ScriptRunEvent,
  StatusChangeEvent,
  TicketEvent,
} from '@/lib/yjs/types'
import { STATUS_LABELS } from '@/lib/yjs/types'
import { ReadOnlyComment } from '@/components/comments/ReadOnlyComment'
import { formatRelative } from '@/lib/draft-persistence'

export function EventTimeline({ ticket }: { ticket: Y.Map<unknown> }) {
  const eventsArr = (ticket.get('events') as Y.Array<unknown> | undefined) ?? new Y.Array<unknown>()
  const events = useYArray<TicketEvent>(eventsArr)

  const visible = events.filter((e) => e.type !== 'comment_deleted')

  if (visible.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800/60 bg-slate-900/30 px-4 py-12 text-center text-xs text-zinc-500">
        This timeline starts here — say something useful.
      </div>
    )
  }

  return (
    <ol className="space-y-3">
      {visible.map((ev) => (
        <li key={ev.id}>{renderEvent(ev)}</li>
      ))}
    </ol>
  )
}

function renderEvent(event: TicketEvent) {
  switch (event.type) {
    case 'created':
      return <CreatedRow event={event} />
    case 'comment':
      return <CommentRow event={event} />
    case 'status_change':
      return <StatusChangeRow event={event} />
    case 'assigned':
      return <AssignedRow event={event} />
    case 'script_run':
      return <ScriptRunRow event={event} />
    default:
      return null
  }
}

function MutedRow({ text, at }: { text: React.ReactNode; at: number }) {
  return (
    <div className="flex items-center gap-2 px-1 text-xs text-zinc-500">
      <span aria-hidden className="h-1 w-1 rounded-full bg-slate-700" />
      <span>{text}</span>
      <span aria-hidden>·</span>
      <span className="tabular-nums">{formatRelative(at)}</span>
    </div>
  )
}

function CreatedRow({ event }: { event: CreatedEvent }) {
  return <MutedRow text={<><span className="text-zinc-300">{event.by}</span> created this ticket</>} at={event.at} />
}

function StatusChangeRow({ event }: { event: StatusChangeEvent }) {
  return (
    <MutedRow
      at={event.at}
      text={
        <>
          <span className="text-zinc-300">{event.by}</span> moved to{' '}
          <span className="text-zinc-300">{STATUS_LABELS[event.to]}</span>
        </>
      }
    />
  )
}

function AssignedRow({ event }: { event: AssignedEvent }) {
  return (
    <MutedRow
      at={event.at}
      text={
        <>
          <span className="text-zinc-300">{event.by}</span> assigned to{' '}
          <span className="text-zinc-300">{event.to}</span>
        </>
      }
    />
  )
}

function CommentRow({ event }: { event: CommentEvent }) {
  return (
    <article className="rounded-md border border-slate-800/60 bg-slate-900/30 p-3">
      <header className="mb-1.5 flex items-center justify-between text-[11px] text-zinc-500">
        <span className="text-zinc-300">{event.by}</span>
        <span className="tabular-nums">{formatRelative(event.at)}</span>
      </header>
      <ReadOnlyComment body={event.body} bodyJson={event.bodyJson} />
    </article>
  )
}

function ScriptRunRow({ event }: { event: ScriptRunEvent }) {
  const [open, setOpen] = useState(false)
  return (
    <article className="rounded-md border border-slate-800/60 bg-slate-900/30">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[11px] text-zinc-500 transition-colors hover:bg-slate-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <span>
          <span className="text-zinc-300">{event.runBy}</span> ran a script
          <span aria-hidden> · </span>
          <span className="tabular-nums">{Math.round(event.durationMs)}ms</span>
          <span aria-hidden> · </span>
          <span className="tabular-nums">{formatRelative(event.at)}</span>
        </span>
        <span className="text-zinc-500">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="space-y-2 px-3 pb-3">
          <pre className="overflow-auto rounded border border-slate-800 bg-slate-950 p-2 font-mono text-[11px] text-zinc-400">
            <code>{event.code}</code>
          </pre>
          <pre className="overflow-auto rounded border border-slate-800 bg-slate-950 p-2 font-mono text-[12px]">
            <span className="text-zinc-200">{event.stdout}</span>
            {event.stderr && <span className="text-red-400">{event.stderr}</span>}
          </pre>
        </div>
      )}
    </article>
  )
}
