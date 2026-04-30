import { Extension } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
import { SlashList, type SlashCommand, type SlashListRef } from './SlashList'

const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'run',
    label: '/run',
    description: 'Insert a Python code block',
    onSelect: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setCodeBlock({ language: 'python' })
        .run()
    },
  },
  {
    id: 'template',
    label: '/template',
    description: 'Insert a request template (coming soon)',
    onSelect: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent('TODO: template')
        .run()
    },
  },
]

/**
 * Slash-command menu — `/` opens a small floating list.
 * Stub for Phase 4; templates list intentionally minimal.
 */
export const SlashMenu = Extension.create({
  name: 'slashMenu',

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashCommand>({
        editor: this.editor,
        char: '/',
        startOfLine: false,
        allowSpaces: false,
        pluginKey: { key: 'slashMenu' } as never,
        items: ({ query }) => {
          const q = query.toLowerCase()
          return SLASH_COMMANDS.filter((c) => c.id.toLowerCase().includes(q) || c.label.toLowerCase().includes(q))
        },
        command: ({ editor, range, props }) => {
          props.onSelect({ editor, range })
        },
        render: () => {
          let component: ReactRenderer<SlashListRef> | null = null
          let popup: TippyInstance | null = null

          return {
            onStart: (props) => {
              component = new ReactRenderer(SlashList, { props, editor: props.editor })
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
      } satisfies Partial<SuggestionOptions<SlashCommand>> as SuggestionOptions<SlashCommand>),
    ]
  },
})
