import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner'

/**
 * Phase-7 swap: the original homegrown toaster has been replaced by Sonner.
 * The export surface stays the same so existing callsites (palette,
 * CodeRunner, etc.) keep working without churn.
 *
 * Sonner gives us:
 *   - swipe-to-dismiss + stacking by default
 *   - `toast.success / .error / .info` variants
 *   - `toast(..., { action: { label, onClick } })` for Undo affordances
 */
export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="bottom-right"
      offset={16}
      toastOptions={{
        style: {
          background: 'rgb(15 23 42)',
          border: '1px solid rgb(30 41 59)',
          color: 'rgb(228 228 231)',
          fontSize: '12px',
        },
      }}
    />
  )
}

export const toast = sonnerToast
