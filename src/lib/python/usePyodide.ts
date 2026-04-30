import { useCallback, useEffect, useRef, useState } from 'react'
import * as Comlink from 'comlink'
import type { PythonAPI } from '@/workers/python.worker'

export type Stream = 'stdout' | 'stderr'
export interface OutputChunk {
  stream: Stream
  text: string
}

export type Status = 'loading' | 'ready' | 'running' | 'error'

export interface RunResult {
  stdout: string
  stderr: string
  durationMs: number
  timedOut: boolean
}

const RUN_TIMEOUT_MS = 30_000

// ── Module singletons ────────────────────────────────────────────────────────
// One worker per browser session. `preloadState` is shared across all hook
// instances so the CodeRunner reflects ongoing init progress even when the
// init was kicked off from main.tsx (Phase 8 pre-warm).
let worker: Worker | null = null
let api: Comlink.Remote<PythonAPI> | null = null
let preloadPromise: Promise<void> | null = null

interface PreloadState {
  ready: boolean
  errored: boolean
  progress: number
  message: string
}

const preloadState: PreloadState = {
  ready: false,
  errored: false,
  progress: 0,
  message: 'Booting Python (loading pandas — first run only, ~12s)',
}

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

function spawn(): { worker: Worker; api: Comlink.Remote<PythonAPI> } {
  worker = new Worker(new URL('../../workers/python.worker.ts', import.meta.url), {
    type: 'module',
    name: 'pyodide',
  })
  api = Comlink.wrap<PythonAPI>(worker)
  return { worker, api }
}

function getWorker() {
  if (!worker || !api) spawn()
  return { worker: worker!, api: api! }
}

function killWorker() {
  worker?.terminate()
  worker = null
  api = null
  preloadPromise = null
  preloadState.ready = false
  preloadState.errored = false
  preloadState.progress = 0
  preloadState.message = 'Restarting Python…'
  notify()
}

function progressFromMessage(msg: string, prev: number): number {
  if (msg.includes('Pyodide runtime ready')) return Math.max(prev, 0.3)
  if (msg.toLowerCase().startsWith('loading')) return Math.min(0.95, prev + 0.05)
  if (msg.toLowerCase().startsWith('loaded')) return Math.min(0.95, prev + 0.1)
  if (msg.includes('Pandas ready')) return 1
  return prev
}

/**
 * Phase-8: pre-warm Pyodide on app boot so by the time the user clicks Run,
 * pandas is already loaded. Idempotent — calling multiple times returns the
 * same promise.
 */
export function preloadPyodide(): Promise<void> {
  if (preloadPromise) return preloadPromise
  const { api } = getWorker()
  preloadPromise = api
    .ready(
      Comlink.proxy((msg: string) => {
        preloadState.message = msg
        preloadState.progress = progressFromMessage(msg, preloadState.progress)
        notify()
      }),
    )
    .then(() => {
      preloadState.ready = true
      preloadState.errored = false
      preloadState.progress = 1
      notify()
    })
    .catch((err) => {
      preloadState.errored = true
      preloadState.message = `Failed to load Python: ${err instanceof Error ? err.message : String(err)}`
      preloadPromise = null // allow retry
      notify()
    })
  return preloadPromise
}

export function usePyodide() {
  const [, force] = useState(0)
  const [running, setRunning] = useState(false)
  const [output, setOutput] = useState<OutputChunk[]>([])
  const [lastRun, setLastRun] = useState<RunResult | null>(null)
  const runIdRef = useRef(0)

  useEffect(() => {
    const sync = () => force((n) => n + 1)
    listeners.add(sync)
    if (!preloadPromise) void preloadPyodide()
    return () => {
      listeners.delete(sync)
    }
  }, [])

  const status: Status = running
    ? 'running'
    : preloadState.errored
      ? 'error'
      : preloadState.ready
        ? 'ready'
        : 'loading'

  const clear = useCallback(() => setOutput([]), [])

  const run = useCallback(
    async (code: string): Promise<RunResult | null> => {
      if (status !== 'ready') return null

      const myRunId = ++runIdRef.current
      setRunning(true)
      setOutput([])

      const stdoutBuf: string[] = []
      const stderrBuf: string[] = []

      const append = (stream: Stream, text: string) => {
        if (runIdRef.current !== myRunId) return
        ;(stream === 'stdout' ? stdoutBuf : stderrBuf).push(text)
        setOutput((chunks) => [...chunks, { stream, text }])
      }

      const cb = Comlink.proxy({
        onStdout: (s: string) => append('stdout', s),
        onStderr: (s: string) => append('stderr', s),
      })

      let timedOut = false
      const { worker: w, api: a } = getWorker()

      const timer = window.setTimeout(() => {
        timedOut = true
        w.terminate()
        killWorker()
        append('stderr', '\nScript timed out — terminated.\n')
        const result: RunResult = {
          stdout: stdoutBuf.join(''),
          stderr: stderrBuf.join('') + '\nScript timed out — terminated.\n',
          durationMs: RUN_TIMEOUT_MS,
          timedOut: true,
        }
        setLastRun(result)
        setRunning(false)
        // Re-spin in the background so the next run isn't a cold start UX-wise.
        void preloadPyodide()
      }, RUN_TIMEOUT_MS)

      try {
        const { durationMs } = await a.run(code, cb)
        window.clearTimeout(timer)
        if (timedOut) return null

        const result: RunResult = {
          stdout: stdoutBuf.join(''),
          stderr: stderrBuf.join(''),
          durationMs,
          timedOut: false,
        }
        setLastRun(result)
        setRunning(false)
        return result
      } catch (err) {
        window.clearTimeout(timer)
        if (timedOut) return null
        const msg = err instanceof Error ? err.message : String(err)
        append('stderr', `${msg}\n`)
        const result: RunResult = {
          stdout: stdoutBuf.join(''),
          stderr: stderrBuf.join('') + msg + '\n',
          durationMs: 0,
          timedOut: false,
        }
        setLastRun(result)
        setRunning(false)
        return result
      }
    },
    [status],
  )

  return {
    status,
    loadProgress: preloadState.progress,
    loadMessage: preloadState.message,
    run,
    clear,
    output,
    lastRun,
  }
}
