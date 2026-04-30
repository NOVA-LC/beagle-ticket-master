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

/**
 * Phase-8: replace raw Python tracebacks with a friendly preamble so the demo
 * audience sees something readable, then the full traceback follows for
 * actual debugging. Common cases get specific hints.
 */
function formatPythonError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)

  let preamble: string | null = null

  const moduleMatch = msg.match(/No module named ['"]([^'"]+)['"]/)
  if (moduleMatch) {
    preamble = `❗ Module '${moduleMatch[1]}' isn't loaded — try \`pyodide.loadPackage('${moduleMatch[1]}')\` first.`
  } else if (msg.includes('SyntaxError')) {
    preamble = `❗ Python syntax error — the code didn't parse.`
  } else if (msg.includes('IndentationError')) {
    preamble = `❗ Indentation issue — Python is whitespace-sensitive.`
  } else if (msg.includes('NameError')) {
    const nameMatch = msg.match(/name ['"]([^'"]+)['"] is not defined/)
    if (nameMatch) preamble = `❗ '${nameMatch[1]}' isn't defined yet — typo, or maybe defined in a different cell?`
  } else if (msg.includes('TypeError')) {
    preamble = `❗ Type mismatch — Python got a value it didn't know how to use.`
  } else if (msg.includes('KeyError')) {
    preamble = `❗ Key not found in dict/DataFrame.`
  }

  const body = msg.endsWith('\n') ? msg : `${msg}\n`
  return preamble ? `${preamble}\n\n${body}` : body
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
      cb.onStderr(formatPythonError(err))
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
