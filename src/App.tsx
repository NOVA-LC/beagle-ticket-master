import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { RevenueKanban } from '@/components/kanban/RevenueKanban'
import { NotFound } from '@/components/empty/NotFound'
import { TicketDetailSkeleton } from '@/components/skeletons/TicketDetailSkeleton'

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
        // Data-router lazy pattern — gives router-level loading state and
        // de-duplicates the chunk import when navigating between tickets.
        lazy: async () => {
          const m = await import('@/pages/TicketDetail')
          return { Component: m.TicketDetail }
        },
        // While the chunk loads, show the dimension-matched skeleton.
        hydrateFallbackElement: <TicketDetailSkeleton />,
      },
      { path: 'settings', element: <Settings /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} fallbackElement={<TicketDetailSkeleton />} />
}
