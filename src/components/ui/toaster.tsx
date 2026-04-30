import { useEffect, useState } from 'react'

interface ToastItem { id: number; msg: string }

let push: ((msg: string) => void) | null = null

export function toast(msg: string) {
  push?.(msg)
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    push = (msg: string) => {
      const id = Date.now() + Math.random()
      setItems((prev) => [...prev, { id, msg }])
      window.setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== id))
      }, 3000)
    }
    return () => { push = null }
  }, [])

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[200] flex flex-col gap-2">
      {items.map((i) => (
        <div
          key={i.id}
          className="pointer-events-auto rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-zinc-200 shadow-xl"
        >
          {i.msg}
        </div>
      ))}
    </div>
  )
}
