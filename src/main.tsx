import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { doc, tickets } from './lib/yjs/doc'
import { seedIfEmpty } from './lib/seed'
import './index.css'

// Phase-7 a11y: in dev only, run axe-core against every render and log
// violations to the browser console. Lazy-imported so it never ships to prod.
if (import.meta.env.DEV) {
  void Promise.all([import('@axe-core/react'), import('react-dom')]).then(
    ([{ default: axe }, ReactDOMModule]) => {
      axe(React, ReactDOMModule, 1000)
    },
  )
}

// Race-safe seeding (Phase 6).
void seedIfEmpty(doc, tickets)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
