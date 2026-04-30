/**
 * Matches the actual TicketDetail layout dimensions to avoid layout shift on
 * hydration. If you tweak `pages/TicketDetail.tsx`, update these heights too.
 */
export function TicketDetailSkeleton() {
  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-3 h-3 w-24 animate-pulse rounded bg-slate-800/60" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <section className="flex min-w-0 flex-col gap-4">
          <header className="flex flex-col gap-2">
            <div className="flex items-center gap-3 px-2">
              <div className="h-3 w-16 animate-pulse rounded bg-slate-800/60" />
              <div className="h-5 w-20 animate-pulse rounded-full bg-slate-800/60" />
              <div className="h-5 w-24 animate-pulse rounded bg-slate-800/60" />
              <div className="ml-auto h-6 w-6 animate-pulse rounded-full bg-slate-800/60" />
            </div>
            <div className="h-7 w-3/4 animate-pulse rounded bg-slate-800/60" />
          </header>

          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-md border border-slate-800/60 bg-slate-900/30 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="h-3 w-20 animate-pulse rounded bg-slate-800/60" />
                  <div className="h-3 w-12 animate-pulse rounded bg-slate-800/60" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-2 w-full animate-pulse rounded bg-slate-800/40" />
                  <div className="h-2 w-5/6 animate-pulse rounded bg-slate-800/40" />
                  <div className="h-2 w-2/3 animate-pulse rounded bg-slate-800/40" />
                </div>
              </div>
            ))}
          </div>

          <div className="h-9 animate-pulse rounded-md border border-slate-800/60 bg-slate-900/30" />
          <div className="h-32 animate-pulse rounded-md border border-slate-800/60 bg-slate-900/30" />
        </section>

        <aside className="flex flex-col gap-4 rounded-md border border-slate-800/60 bg-slate-900/20 p-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="h-2 w-12 animate-pulse rounded bg-slate-800/60" />
              <div className="h-7 w-full animate-pulse rounded bg-slate-800/40" />
            </div>
          ))}
        </aside>
      </div>
    </div>
  )
}
