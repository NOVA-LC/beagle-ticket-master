import { useEffect, useMemo, useRef, useState } from 'react'
import * as Y from 'yjs'
import Editor from 'react-simple-code-editor'
import Prism from 'prismjs'
import 'prismjs/components/prism-python'
import { usePyodide } from '@/lib/python/usePyodide'
import { appendTicketEvent } from '@/lib/yjs/doc'
import { getCurrentUser } from '@/lib/user'
import { toast } from '@/components/ui/toaster'
import { cn } from '@/lib/utils'

const STARTER_CODE = `import pandas as pd

# Westlake Communities — waiver enrollment reconciliation
data = [
    {"unit": "101", "tenant": "Martinez, Jose A.", "waiver": True,  "billed": True},
    {"unit": "102", "tenant": "Chen, Wei",         "waiver": True,  "billed": False},
    {"unit": "103", "tenant": "Patel, Priya",      "waiver": False, "billed": False},
]
df = pd.DataFrame(data)
missing = df[(df.waiver) & (~df.billed)]
print(f"Westlake reconciliation — {len(df)} units")
print(f"Missing waiver charges: {len(missing)}")
print(missing[["unit","tenant"]].to_string(index=False))
`

interface Props { ticket: Y.Map<unknown> }

export function CodeRunner({ ticket }: Props) {
  const ticketId = ticket.get('id') as string
  const [code, setCode] = useState(STARTER_CODE)
  const { status, loadProgress, loadMessage, run, clear, output } = usePyodide()
  const user = useMemo(() => getCurrentUser(), [])

  const preRef = useRef<HTMLPreElement>(null)
  const stuckRef = useRef(true)
  const onScroll = () => {
    const el = preRef.current
    if (!el) return
    stuckRef.current = el.scrollHeight - el.clientHeight - el.scrollTop < 8
  }
  useEffect(() => {
    if (stuckRef.current && preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight
    }
  }, [output])

  const isReady = status === 'ready'
  const isRunning = status === 'running'

  const onRun = async () => {
    if (!isReady) return
    const result = await run(code)
    if (!result) return
    if (result.timedOut) {
      toast.error('Script timed out — terminated after 30s')
      return
    }
    appendTicketEvent(ticketId, {
      type: 'script_run',
      by: user.name,
      at: Date.now(),
      code,
      stdout: result.stdout,
      stderr: result.stderr,
      durationMs: result.durationMs,
      runBy: user.name,
    })
    toast.success(`Ran ${(result.durationMs / 1000).toFixed(1)}s · output below`)
  }

  // Stable ref so the global event listener always invokes the freshest version.
  const onRunRef = useRef(onRun)
  onRunRef.current = onRun
  useEffect(() => {
    const handler = () => { void onRunRef.current() }
    window.addEventListener('beagle:run-last-script', handler)
    return () => window.removeEventListener('beagle:run-last-script', handler)
  }, [])

  const onCopyStdout = async () => {
    const text = output.filter((c) => c.stream === 'stdout').map((c) => c.text).join('')
    await navigator.clipboard.writeText(text)
  }

  const onEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      void onRun()
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-[11px] text-zinc-500">
        <span
          aria-hidden
          className={cn(
            'h-2 w-2 rounded-full transition-colors duration-150',
            isReady && 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]',
            isRunning && 'bg-amber-400 animate-pulse',
            status === 'loading' && 'bg-slate-700',
            status === 'error' && 'bg-red-500',
          )}
        />
        <span>
          {status === 'loading' && 'Booting Python…'}
          {isReady && 'Python ready'}
          {isRunning && 'Running…'}
          {status === 'error' && 'Error — recovering'}
        </span>
      </div>
      {(status === 'loading' || (status === 'error' && loadProgress < 1)) && (
        <div className="flex flex-col gap-1.5 rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>{loadMessage}</span>
            <span className="tabular-nums">{Math.round(loadProgress * 100)}%</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded bg-slate-800">
            <div
              className="h-full bg-cyan-500/70 transition-[width] duration-300 ease-out"
              style={{ width: `${loadProgress * 100}%` }}
            />
          </div>
        </div>
      )}

      <div
        className="overflow-hidden rounded-md border border-slate-800 bg-slate-950"
        onKeyDown={onEditorKeyDown}
      >
        <Editor
          value={code}
          onValueChange={setCode}
          highlight={(c) => Prism.highlight(c, Prism.languages.python, 'python')}
          padding={16}
          textareaId="code-runner-editor"
          className="text-[13px] text-zinc-200 caret-zinc-100"
          style={{
            fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
            minHeight: 200,
          }}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onRun}
          disabled={!isReady}
          className={cn(
            'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-colors',
            isReady
              ? 'border-cyan-800 bg-cyan-950 text-cyan-200 hover:bg-cyan-900'
              : 'border-slate-800 bg-slate-900 text-zinc-500',
          )}
        >
          {isRunning ? 'Running…' : 'Run'}
          <kbd className="rounded border border-slate-700 px-1 text-[10px] text-zinc-400">⌘↵</kbd>
        </button>
        <button
          onClick={clear}
          className="rounded-md border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-zinc-300 hover:bg-slate-800"
        >
          Clear output
        </button>
        <button
          onClick={onCopyStdout}
          className="rounded-md border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-zinc-300 hover:bg-slate-800"
        >
          Copy stdout
        </button>
      </div>

      <pre
        ref={preRef}
        onScroll={onScroll}
        className="max-h-[260px] overflow-auto rounded-md border border-slate-800 bg-slate-950 p-3 font-mono text-[12px] leading-relaxed"
      >
        {output.length === 0 ? (
          <span className="text-zinc-600">— no output —</span>
        ) : (
          output.map((c, i) => (
            <span key={i} className={c.stream === 'stderr' ? 'text-red-400' : 'text-zinc-200'}>
              {c.text}
            </span>
          ))
        )}
      </pre>
    </div>
  )
}
