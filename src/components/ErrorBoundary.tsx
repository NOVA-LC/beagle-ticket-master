import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * App-level error boundary. Sits inside AppLayout so the shell (sidebar,
 * header, palette) keeps working when a route subtree blows up — and the
 * fallback can reassure the user that local data isn't lost.
 *
 * No Sentry yet; we just `console.error` the error + componentStack. Future
 * phases can wire a real error reporter here.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
        <span aria-hidden className="text-3xl">🐾</span>
        <h1 className="text-lg font-semibold text-zinc-100">Something broke</h1>
        <p className="text-sm text-zinc-400">
          Your data is safe in IndexedDB — nothing was lost. Refresh to recover.
        </p>
        <details className="w-full max-w-sm text-left">
          <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-300">
            Show error
          </summary>
          <pre className="mt-2 overflow-auto rounded border border-slate-800 bg-slate-950 p-2 text-[11px] text-red-400">
            {this.state.error.message}
          </pre>
        </details>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 rounded-md border border-slate-800 bg-slate-900 px-4 py-2 text-xs text-zinc-200 transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          Refresh
        </button>
      </div>
    )
  }
}
