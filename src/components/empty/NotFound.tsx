import { Link, useParams, useRouteError } from 'react-router-dom'

export function NotFound() {
  const error = useRouteError()
  const params = useParams<{ id?: string }>()

  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[router] error caught at NotFound:', error)
  }

  // If the URL had an id like /ticket/bgl-999, surface it in the copy.
  const missingId = params.id ? params.id.toUpperCase() : null

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
      <span aria-hidden className="text-3xl">🐾</span>
      <h1 className="text-lg font-semibold text-zinc-100">
        {missingId ? `${missingId} doesn't exist (yet).` : 'Trail goes cold here'}
      </h1>
      <p className="text-sm text-zinc-500">
        {missingId
          ? 'Want to file it? Press C anywhere to compose, or jump back to the queue.'
          : "This page either moved, was renamed, or never existed. Either way — it's not where the work is."}
      </p>
      <div className="mt-2 flex gap-2">
        <Link
          to="/"
          className="rounded-md border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          Back to queue
        </Link>
        <button
          onClick={() => {
            // GlobalShortcuts owns the Compose modal; opening via the same key.
            window.dispatchEvent(
              new KeyboardEvent('keydown', { key: 'c', bubbles: true }),
            )
          }}
          className="rounded-md border border-cyan-800 bg-cyan-950 px-3 py-1.5 text-xs text-cyan-200 transition-colors hover:bg-cyan-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          Compose new ticket →
        </button>
      </div>
    </div>
  )
}
