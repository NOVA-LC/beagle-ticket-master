import { useEffect, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import * as Y from 'yjs'
import { appendTicketEvent } from '@/lib/yjs/doc'
import { getCurrentUser } from '@/lib/user'
import { useDraftPersistence, formatRelative } from '@/lib/draft-persistence'
import { BiLink } from './BiLink'
import { SlashMenu } from './SlashMenu'
import { serializeToMarkdown } from './markdown'
import { cn } from '@/lib/utils'

interface Props {
  ticket: Y.Map<unknown>
}

/**
 * Tiptap-backed comment composer.
 *
 * Persistence model:
 *   - Drafts → localStorage, debounced 500ms, keyed by ticket id.
 *   - On mount, restored content is loaded into the editor and a banner
 *     surfaces "Draft restored — N minutes ago" with a × that clears.
 *   - On submit, content is serialized to markdown, appended to the ticket's
 *     `events` Y.Array as a `comment` event, then editor + draft are cleared.
 */
export function Composer({ ticket }: Props) {
  const ticketId = ticket.get('id') as string
  const user = useMemo(() => getCurrentUser(), [])

  const draftKey = `draft:ticket:${ticketId}`
  const { restored, save, clear, dismissRestored } = useDraftPersistence({ key: draftKey })

  // We need the latest onSubmit inside Tiptap's keymap closure → ref.
  const onSubmitRef = useRef<() => void>(() => {})

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          dropcursor: false,
          gapcursor: false,
        }),
        BiLink,
        SlashMenu,
      ],
      content: '',
      editorProps: {
        attributes: {
          class:
            'prose prose-invert prose-sm max-w-none min-h-[100px] px-3 py-2 focus:outline-none ' +
            '[&_p]:my-2 [&_h1]:mt-3 [&_h2]:mt-3 [&_pre]:bg-slate-950 [&_pre]:border [&_pre]:border-slate-800 [&_code]:text-zinc-200',
          role: 'textbox',
          'aria-multiline': 'true',
          'aria-label': 'Comment',
        },
        handleKeyDown(_view, event) {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault()
            onSubmitRef.current()
            return true
          }
          return false
        },
      },
      onUpdate: ({ editor }) => {
        save(JSON.stringify(editor.getJSON()))
      },
    },
    [draftKey],
  )

  // One-shot draft restore.
  const [restoredAt, setRestoredAt] = useState<number | null>(null)
  useEffect(() => {
    if (!editor || !restored) return
    try {
      const json = JSON.parse(restored.content)
      editor.commands.setContent(json, { emitUpdate: false })
      setRestoredAt(restored.at)
    } catch {
      // Bad blob — drop silently.
    }
  }, [editor, restored])

  const dismissBanner = () => {
    setRestoredAt(null)
    dismissRestored()
    clear()
    editor?.commands.clearContent()
  }

  const onSubmit = () => {
    if (!editor) return
    const json = editor.getJSON()
    const body = serializeToMarkdown(json).trim()
    if (!body) return
    appendTicketEvent(ticketId, {
      type: 'comment',
      by: user.name,
      at: Date.now(),
      body,
      bodyJson: json,
    })
    editor.commands.clearContent()
    clear()
    setRestoredAt(null)
  }
  onSubmitRef.current = onSubmit

  const hasContent = !!editor && !editor.isEmpty

  return (
    <div className="flex flex-col gap-2 rounded-md border border-slate-800 bg-slate-900/30">
      {restoredAt !== null && (
        <div className="flex items-center justify-between border-b border-slate-800 px-3 py-1.5 text-[11px] text-zinc-400">
          <span>
            Draft restored — <span className="text-zinc-300">{formatRelative(restoredAt)}</span>
          </span>
          <button
            onClick={dismissBanner}
            aria-label="Dismiss restored draft"
            className="rounded px-1 text-zinc-500 hover:bg-slate-800 hover:text-zinc-200"
          >
            ×
          </button>
        </div>
      )}

      {hasContent && editor && <Toolbar editor={editor} />}

      <EditorContent editor={editor} />

      <div className="flex items-center justify-between border-t border-slate-800 px-3 py-2 text-[11px] text-zinc-500">
        <span>
          Type <kbd className="rounded border border-slate-700 bg-slate-950 px-1 font-mono text-[10px] text-zinc-400">[[</kbd> to link a property,
          <span className="px-1" />
          <kbd className="rounded border border-slate-700 bg-slate-950 px-1 font-mono text-[10px] text-zinc-400">/</kbd> for commands
        </span>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!hasContent}
          className={cn(
            'inline-flex items-center gap-2 rounded-md border px-3 py-1 text-[11px] transition-colors',
            hasContent
              ? 'border-cyan-800 bg-cyan-950 text-cyan-200 hover:bg-cyan-900'
              : 'border-slate-800 bg-slate-900 text-zinc-600',
          )}
        >
          Comment
          <kbd className="rounded border border-slate-700 px-1 text-[10px] text-zinc-400">⌘↵</kbd>
        </button>
      </div>
    </div>
  )
}

interface ToolbarProps { editor: NonNullable<ReturnType<typeof useEditor>> }

function Toolbar({ editor }: ToolbarProps) {
  const btn = (active: boolean) =>
    cn(
      'rounded px-1.5 py-0.5 text-[11px] transition-colors',
      active ? 'bg-slate-700 text-zinc-100' : 'text-zinc-400 hover:bg-slate-800 hover:text-zinc-200',
    )

  return (
    <div className="flex items-center gap-1 border-b border-slate-800 px-2 py-1">
      <button onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))}>B</button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'))}>
        <span className="italic">I</span>
      </button>
      <button onClick={() => editor.chain().focus().toggleCode().run()} className={btn(editor.isActive('code'))}>
        <span className="font-mono">`</span>
      </button>
      <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={btn(editor.isActive('codeBlock'))}>
        <span className="font-mono">{'</>'}</span>
      </button>
      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive('bulletList'))}>
        •
      </button>
    </div>
  )
}
