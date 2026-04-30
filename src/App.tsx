import { lazy, Suspense } from 'react'
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { RevenueKanban } from '@/components/kanban/RevenueKanban'
import { NotFound } from '@/components/empty/NotFound'
import { TicketDetailSkeleton } from '@/components/skeletons/TicketDetailSkeleton'

const DemoPage = lazy(() => import('@/pages/Demo').then((m) => ({ default: m.Demo })))

function Settings() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-lg font-semibold text-zinc-100">Settings</h1>
      <p className="mt-2 text-sm text-zinc-500">Coming soon.</p>
    </div>
  )
}

const baseChildren = [
  { index: true, element: <RevenueKanban /> },
  {
    path: 'ticket/:id',
    lazy: async () => {
      const m = await import('@/pages/TicketDetail')
      return { Component: m.TicketDetail }
    },
    hydrateFallbackElement: <TicketDetailSkeleton />,
  },
  { path: 'settings', element: <Settings /> },
]

// Phase-8: /demo autoplay route is DEV-only. In production builds it
// resolves to the catch-all NotFound, so the autoplay overlay never ships.
const devChildren = import.meta.env.DEV
  ? [
      ...baseChildren,
      {
        path: 'demo',
        element: (
          <>
            <RevenueKanban />
            <Suspense fallback={null}>
              <DemoPage />
            </Suspense>
          </>
        ),
      },
    ]
  : baseChildren

const router = createBrowserRouter([
  {
    element: (
      <AppLayout>
        <Outlet />
      </AppLayout>
    ),
    errorElement: <NotFound />,
    children: [...devChildren, { path: '*', element: <NotFound /> }],
  },
])

export default function App() {
  return <RouterProvider router={router} fallbackElement={<TicketDetailSkeleton />} />
}
