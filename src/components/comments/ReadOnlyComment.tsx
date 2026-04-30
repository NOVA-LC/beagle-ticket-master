import { useEditor, EditorContent, type JSONContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { BiLink } from '@/components/composer/BiLink'

interface Props {
  /** Markdown body — used as fallback when bodyJson is missing. */
  body: string
  /** Tiptap JSON snapshot, set on submit by the Composer. */
  bodyJson?: unknown
}

/**
 * Renders a stored comment via Tiptap in read-only mode so bi-links keep their
 * AIContext popovers (Radix-anchored hover/click) inside the timeline.
 *
 * If `bodyJson` is missing (e.g., legacy comment from before Phase 5), falls
 * back to a plain markdown <pre> — keeps history readable without crashing.
 */
export function ReadOnlyComment({ body, bodyJson }: Props) {
  const editor = useEditor({
    editable: false,
    extensions: [StarterKit.configure({ dropcursor: false, gapcursor: false }), BiLink],
    content: (bodyJson as JSONContent | undefined) ?? body,
  })

  if (bodyJson === undefined && body) {
    // Legacy fallback: render markdown as preformatted text.
    return (
      <pre className="whitespace-pre-wrap font-sans text-[13px] text-zinc-200">{body}</pre>
    )
  }

  return (
    <div className="prose prose-invert prose-sm max-w-none [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_p]:my-1">
      <EditorContent editor={editor} />
    </div>
  )
}
