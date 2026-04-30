import { useRef, useState } from 'react'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import * as Popover from '@radix-ui/react-popover'
import { AIContext } from './AIContext'
import type { EntityKind } from '@/lib/entities'

const HOVER_OPEN_DELAY = 150
const HOVER_CLOSE_DELAY = 80

/**
 * Inline React node view for the BiLink atom.
 *
 * Behaviour:
 *   - Click toggles the popover.
 *   - Hovering the trigger or the content keeps it open (delayed close so
 *     the user can move into the popover without it disappearing).
 *
 * Spec asked for Radix Popover specifically (not HoverCard); we wire hover
 * via pointer events on the trigger + content to avoid the flicker that
 * happens when you cross the gap.
 */
export function BiLinkNodeView({ node }: NodeViewProps) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<number>(0)

  const cancelClose = () => window.clearTimeout(closeTimer.current)
  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = window.setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY)
  }
  const scheduleOpen = () => {
    cancelClose()
    closeTimer.current = window.setTimeout(() => setOpen(true), HOVER_OPEN_DELAY)
  }

  const kind = (node.attrs.kind as EntityKind) ?? 'property'
  const id = (node.attrs.id as string) ?? ''
  const label = (node.attrs.label as string) ?? ''

  return (
    <NodeViewWrapper as="span" className="inline">
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <span
            data-bi-link
            data-kind={kind}
            data-id={id}
            onPointerEnter={scheduleOpen}
            onPointerLeave={scheduleClose}
            onClick={(e) => {
              e.preventDefault()
              cancelClose()
              setOpen((o) => !o)
            }}
            className="cursor-pointer rounded border border-blue-900/50 bg-blue-950/50 px-1 text-blue-300 transition-colors hover:bg-blue-900/60"
          >
            [[{label}]]
          </span>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            sideOffset={6}
            align="start"
            onPointerEnter={cancelClose}
            onPointerLeave={scheduleClose}
            onOpenAutoFocus={(e) => e.preventDefault()}
            className="aicontext z-[80] w-[320px] rounded-md border border-slate-800 bg-slate-900 p-3 shadow-lg"
          >
            <AIContext entityId={id} entityKind={kind} />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </NodeViewWrapper>
  )
}
