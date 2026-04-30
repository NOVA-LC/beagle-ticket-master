import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

/**
 * Phase-8 boot order:
 *   1. If `?reset=hard`, delete IndexedDB BEFORE any module that touches it
 *      runs. We achieve this by dynamic-importing `lib/yjs/doc` (which opens
 *      IndexeddbPersistence at module scope) inside `bootstrap()`.
 *   2. Dynamic-import the rest, then kick off seeding.
 *   3. Pre-warm Pyodide so the first Run is instant.
 *   4. Render React.
 */
async function bootstrap() {
  const params = new URLSearchParams(window.location.search)

  if (params.get('reset') === 'hard') {
    try {
      const dbs =
        (await (
          (
            indexedDB as unknown as {
              databases?: () => Promise<{ name?: string }[]>
            }
          ).databases?.()
        )) ?? []
      await Promise.all(
        dbs
          .filter((db) => db.name?.startsWith('beagle'))
          .map(
            (db) =>
              new Promise<void>((resolve) => {
                const req = indexedDB.deleteDatabase(db.name!)
                req.onsuccess = req.onerror = req.onblocked = () => resolve()
              }),
          ),
      )
      // eslint-disable-next-line no-console
      console.info('[reset] IndexedDB cleared — re-seeding fresh.')
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[reset] failed:', err)
    }
    params.delete('reset')
    const next = window.location.pathname + (params.toString() ? `?${params}` : '')
    window.history.replaceState({}, '', next)
  }

  // Now safe to import modules that open IDB / instantiate providers.
  const [{ doc, tickets }, { seedIfEmpty }, { preloadPyodide }, { default: App }] =
    await Promise.all([
      import('./lib/yjs/doc'),
      import('./lib/seed'),
      import('./lib/python/usePyodide'),
      import('./App'),
    ])

  if (import.meta.env.DEV) {
    void Promise.all([import('@axe-core/react'), import('react-dom')]).then(
      ([{ default: axe }, ReactDOMModule]) => {
        axe(React, ReactDOMModule, 1000)
      },
    )
  }

  // Race-safe seed (Phase 6).
  void seedIfEmpty(doc, tickets)

  // Phase-8 pre-warm: by the time the user clicks Run, pandas is loaded.
  void preloadPyodide()

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

void bootstrap()
