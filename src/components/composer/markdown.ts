import type { JSONContent } from '@tiptap/react'

/**
 * Minimal Tiptap-JSON → Markdown serializer.
 *
 * Round-trips the things we currently emit:
 *   - paragraph, heading, bulletList/orderedList/listItem
 *   - bold, italic, code marks
 *   - codeBlock
 *   - hardBreak
 *   - biLink → `[[Label]]`
 *
 * If you add new Tiptap nodes, extend `serializeNode`.
 */
export function serializeToMarkdown(doc: JSONContent): string {
  return serializeNode(doc).trim() + '\n'
}

function serializeNode(node: JSONContent | undefined): string {
  if (!node) return ''
  switch (node.type) {
    case 'doc':
      return (node.content ?? []).map(serializeNode).join('')
    case 'paragraph': {
      const inner = (node.content ?? []).map(serializeNode).join('')
      return `${inner}\n\n`
    }
    case 'heading': {
      const level = (node.attrs?.level as number) ?? 1
      const hashes = '#'.repeat(Math.min(Math.max(level, 1), 6))
      const inner = (node.content ?? []).map(serializeNode).join('')
      return `${hashes} ${inner}\n\n`
    }
    case 'bulletList':
      return (node.content ?? [])
          .map((li) => `- ${serializeNode(li).trim()}`)
          .join('\n') + '\n\n'
    case 'orderedList':
      return (node.content ?? [])
          .map((li, i) => `${i + 1}. ${serializeNode(li).trim()}`)
          .join('\n') + '\n\n'
    case 'listItem':
      // listItem usually wraps a paragraph; strip its trailing newlines.
      return (node.content ?? []).map(serializeNode).join('').trim()
    case 'codeBlock': {
      const lang = (node.attrs?.language as string) ?? ''
      const inner = (node.content ?? []).map((t) => t.text ?? '').join('')
      return `\`\`\`${lang}\n${inner}\n\`\`\`\n\n`
    }
    case 'hardBreak':
      return '  \n'
    case 'biLink': {
      const label = (node.attrs?.label as string) ?? ''
      return `[[${label}]]`
    }
    case 'text':
      return applyMarks(node.text ?? '', node.marks ?? [])
    default:
      // Unknown node — best-effort: serialize children.
      return (node.content ?? []).map(serializeNode).join('')
  }
}

function applyMarks(text: string, marks: NonNullable<JSONContent['marks']>): string {
  let out = text
  for (const m of marks) {
    if (m.type === 'bold') out = `**${out}**`
    else if (m.type === 'italic') out = `*${out}*`
    else if (m.type === 'code') out = `\`${out}\``
    else if (m.type === 'strike') out = `~~${out}~~`
  }
  return out
}
