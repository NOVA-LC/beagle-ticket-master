import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { doc, tickets } from './lib/yjs/doc'
import { seedIfEmpty } from './lib/seed'
import './index.css'

// Kick off seeding alongside React mount. The Y.Doc and providers were
// instantiated at module-load time of `lib/yjs/doc`; seedIfEmpty races the
// WebRTC peer-sync event against a 1s timeout and only seeds if no peer
// supplied state.
void seedIfEmpty(doc, tickets)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
