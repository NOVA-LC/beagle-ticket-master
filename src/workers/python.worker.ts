/// <reference lib="webworker" />
import * as Comlink from 'comlink'
import { loadPyodide, type PyodideInterface } from 'pyodide'

let pyodide: PyodideInterface | null = null
let initPromise: Promise<void> | null = null

// jsdelivr serves the full Pyodide distribution (runtime + wheel index + wheels).
// The npm `pyodide` package only ships the runtime JS/WASM, not the package wheels —
// pointing indexURL at the CDN bundle is the canonical fix unless you want to ship
// ~200MB of wheels in your own static assets.
const PYODIDE_INDEX_URL = 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/'

async function init(onMessage: (msg: string) => void): Promise<void> {
  pyodide = await loadPyodide({
    indexURL: PYODIDE_INDEX_URL,
    stdout: () => {},
    stderr: () => {},
  })
  onMessage('Pyodide runtime ready')

  await pyodide.loadPackage('pandas', {
    messageCallback: (m) => onMessage(m),
    errorCallback: (m) => onMessage(`error: ${m}`),
  })
  onMessage('Pandas ready')
}

interface RunCallbacks {
  onStdout: (chunk: string) => void
  onStderr: (chunk: string) => void
}

const api = {
  /** Idempotent — first call starts init; subsequent calls await the same promise. */
  async ready(onMessage: (msg: string) => void): Promise<void> {
    if (!initPromise) initPromise = init(onMessage)
    return initPromise
  },

  /**
   * Runs `code`. stdout/stderr stream chunk-by-chunk via the callback proxies.
   * Returns durationMs. Python exceptions are converted into stderr chunks
   * (the traceback) so the UI doesn't need separate error UX.
   */
  async run(code: string, cb: RunCallbacks): Promise<{ durationMs: number }> {
    if (!pyodide) throw new Error('Pyodide not initialized — call ready() first')

    pyodide.setStdout({
      batched: (s: string) => {
        cb.onStdout(s.endsWith('\n') ? s : `${s}\n`)
      },
    })
    pyodide.setStderr({
      batched: (s: string) => {
        cb.onStderr(s.endsWith('\n') ? s : `${s}\n`)
      },
    })

    const t0 = performance.now()
    try {
      await pyodide.runPythonAsync(code)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      cb.onStderr(msg.endsWith('\n') ? msg : `${msg}\n`)
    }
    return { durationMs: performance.now() - t0 }
  },

  /** Eager pandas preload — useful if init was started without it. */
  async preloadPandas(onMessage: (msg: string) => void): Promise<void> {
    if (!pyodide) throw new Error('Pyodide not initialized')
    await pyodide.loadPackage('pandas', { messageCallback: (m) => onMessage(m) })
  },
}

export type PythonAPI = typeof api

Comlink.expose(api)
