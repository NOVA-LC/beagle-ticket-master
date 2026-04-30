import { lazy, Suspense } from 'react'
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { RevenueKanban } from '@/components/kanban/RevenueKanban'
import { NotFound } from '@/components/empty/NotFound'

/**
 * TicketDetail pulls in Tiptap + Radix + prismjs + react-simple-code-editor +
 * the Pyodide hook (~520kB pre-gzip). Lazy-loading the route keeps `/` fast.
 */
const TicketDetailPage = lazy(() =>
  import('@/pages/TicketDetail').then((m) => ({ default: m.TicketDetail })),
)

function RouteFallback() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="h-3 w-40 animate-pulse rounded bg-slate-800" />
      <div className="mt-3 h-2 w-24 animate-pulse rounded bg-slate-900" />
    </div>
  )
}

function Settings() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-lg font-semibold text-zinc-100">Settings</h1>
      <p className="mt-2 text-sm text-zinc-500">Coming soon.</p>
    </div>
  )
}

const router = createBrowserRouter([
  {
    element: (
      <AppLayout>
        <Outlet />
      </AppLayout>
    ),
    errorElement: <NotFound />,
    children: [
      { index: true, element: <RevenueKanban /> },
      {
        path: 'ticket/:id',
        element: (
          <Suspense fallback={<RouteFallback />}>
            <TicketDetailPage />
          </Suspense>
        ),
      },
      { path: 'settings', element: <Settings /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
