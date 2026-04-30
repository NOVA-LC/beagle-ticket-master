import { Link, useRouteError } from 'react-router-dom'

export function NotFound() {
  const error = useRouteError()
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[router] error caught at NotFound:', error)
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
      <span aria-hidden className="text-3xl">🐾</span>
      <h1 className="text-lg font-semibold text-zinc-100">Trail goes cold here</h1>
      <p className="text-sm text-zinc-500">
        This page either moved, was renamed, or never existed. Either way — it's not where the work is.
      </p>
      <Link
        to="/"
        className="mt-2 rounded-md border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        Back to the queue →
      </Link>
    </div>
  )
}
