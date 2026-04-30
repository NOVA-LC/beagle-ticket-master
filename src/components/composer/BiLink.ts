import { Node, mergeAttributes } from '@tiptap/core'
import { ReactRenderer, ReactNodeViewRenderer } from '@tiptap/react'
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
import { searchEntities, type Entity } from '@/lib/entities'
import { SuggestionList, type SuggestionListRef } from './SuggestionList'
import { BiLinkNodeView } from './BiLinkNodeView'

/**
 * Two-character `[[` trigger for entity bi-links.
 *
 * IMPORTANT: Tiptap's @tiptap/suggestion accepts only a single-character
 * `char` config. We trigger on `[` and reject the activation in `allow()`
 * unless the previous character is also `[`. The `command` callback then
 * deletes the leading `[` (one before the captured range) before inserting
 * the bi-link node, so the user ends up with just the styled `[[Label]]`
 * atom — no leftover bracket.
 */

const PLUGIN_KEY = 'biLinkSuggestion'

export interface BiLinkAttrs {
  kind: Entity['kind']
  id: string
  label: string
}

export const BiLink = Node.create({
  name: 'biLink',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true, // single unit — arrow keys jump over it; backspace deletes whole

  addAttributes() {
    return {
      kind: { default: 'property' as Entity['kind'] },
      id: { default: null as string | null },
      label: { default: null as string | null },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-bi-link]' }]
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-bi-link': '',
        'data-kind': node.attrs.kind,
        'data-id': node.attrs.id,
        class:
          'rounded border border-blue-900/50 bg-blue-950/50 px-1 text-blue-300 hover:bg-blue-900/60 cursor-pointer',
      }),
      `[[${node.attrs.label}]]`,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(BiLinkNodeView)
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<Entity>({
        editor: this.editor,
        char: '[',
        startOfLine: false,
        allowSpaces: true,
        pluginKey: { key: PLUGIN_KEY } as never,
        // Only fire when the character BEFORE our `[` is also `[`. This is
        // how we get a two-character `[[` trigger out of a single-char API.
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from)
          const before = state.doc.textBetween(
            Math.max(0, $from.pos - 1),
            $from.pos,
            undefined,
            '￼',
          )
          return before === '['
        },
        items: ({ query }) => searchEntities(query),
        command: ({ editor, range, props }) => {
          // Suggestion captured `[query` (the second `[` and what came after).
          // Extend the deletion range one to the left to also remove the first `[`.
          const fullFrom = Math.max(0, range.from - 1)
          editor
            .chain()
            .focus()
            .deleteRange({ from: fullFrom, to: range.to })
            .insertContent({
              type: 'biLink',
              attrs: {
                kind: props.kind,
                id: props.id,
                label: props.label,
              } satisfies BiLinkAttrs,
            })
            .insertContent(' ')
            .run()
        },
        render: () => {
          let component: ReactRenderer<SuggestionListRef> | null = null
          let popup: TippyInstance | null = null

          return {
            onStart: (props) => {
              component = new ReactRenderer(SuggestionList, {
                props,
                editor: props.editor,
              })
              if (!props.clientRect) return
              popup = tippy(document.body, {
                getReferenceClientRect: () => {
                  const r = props.clientRect?.()
                  return r ?? new DOMRect(0, 0, 0, 0)
                },
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
                offset: [0, 6],
              })
            },
            onUpdate: (props) => {
              component?.updateProps(props)
              if (!props.clientRect) return
              popup?.setProps({
                getReferenceClientRect: () => {
                  const r = props.clientRect?.()
                  return r ?? new DOMRect(0, 0, 0, 0)
                },
              })
            },
            onKeyDown: (props) => {
              if (props.event.key === 'Escape') {
                popup?.hide()
                return true
              }
              return component?.ref?.onKeyDown({ event: props.event }) ?? false
            },
            onExit: () => {
              popup?.destroy()
              component?.destroy()
              popup = null
              component = null
            },
          }
        },
      } satisfies Partial<SuggestionOptions<Entity>> as SuggestionOptions<Entity>),
    ]
  },
})
