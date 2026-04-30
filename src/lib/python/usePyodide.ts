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

// Module-level singleton — one worker for the whole browser session.
let worker: Worker | null = null
let api: Comlink.Remote<PythonAPI> | null = null
let initialized = false

function spawn(): { worker: Worker; api: Comlink.Remote<PythonAPI> } {
  worker = new Worker(new URL('../../workers/python.worker.ts', import.meta.url), {
    type: 'module',
    name: 'pyodide',
  })
  api = Comlink.wrap<PythonAPI>(worker)
  initialized = false
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
  initialized = false
}

function progressFromMessage(msg: string, prev: number): number {
  if (msg.includes('Pyodide runtime ready')) return Math.max(prev, 0.3)
  if (msg.toLowerCase().startsWith('loading')) return Math.min(0.95, prev + 0.05)
  if (msg.toLowerCase().startsWith('loaded')) return Math.min(0.95, prev + 0.1)
  if (msg.includes('Pandas ready')) return 1
  return prev
}

export function usePyodide() {
  const [status, setStatus] = useState<Status>('loading')
  const [loadProgress, setLoadProgress] = useState(0)
  const [loadMessage, setLoadMessage] = useState('Booting Python (loading pandas — first run only, ~12s)')
  const [output, setOutput] = useState<OutputChunk[]>([])
  const [lastRun, setLastRun] = useState<RunResult | null>(null)

  const runIdRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    const { api } = getWorker()

    const onMessage = Comlink.proxy((msg: string) => {
      if (cancelled) return
      setLoadMessage(msg)
      setLoadProgress((prev) => progressFromMessage(msg, prev))
    })

    if (!initialized) {
      initialized = true
      api
        .ready(onMessage)
        .then(() => {
          if (cancelled) return
          setStatus('ready')
          setLoadProgress(1)
        })
        .catch((err) => {
          if (cancelled) return
          setStatus('error')
          setLoadMessage(`Failed to load Python: ${err instanceof Error ? err.message : String(err)}`)
        })
    } else {
      setStatus('ready')
      setLoadProgress(1)
    }

    return () => {
      cancelled = true
    }
  }, [])

  const clear = useCallback(() => setOutput([]), [])

  const run = useCallback(async (code: string): Promise<RunResult | null> => {
    if (status !== 'ready') return null

    const myRunId = ++runIdRef.current
    setStatus('running')
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
      setStatus('error')
      // Re-spin in the background.
      const respawn = getWorker()
      const onMessage = Comlink.proxy((msg: string) => {
        setLoadMessage(msg)
        setLoadProgress((prev) => progressFromMessage(msg, prev))
      })
      initialized = true
      respawn.api.ready(onMessage).then(() => {
        setStatus('ready')
        setLoadProgress(1)
      })
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
      setStatus('ready')
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
      setStatus('error')
      return result
    }
  }, [status])

  return { status, loadProgress, loadMessage, run, clear, output, lastRun }
}
