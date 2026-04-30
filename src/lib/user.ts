export type Persona = { name: string; color: string }

const PERSONAS: Record<string, Persona> = {
  david:  { name: 'David Park · CS',        color: '#f97316' },
  morgan: { name: 'Morgan Lin · Data Eng',  color: '#22d3ee' },
  riley:  { name: 'Riley Sun · CS Lead',    color: '#a78bfa' },
  sam:    { name: 'Sam Ortiz · Data Eng',   color: '#34d399' },
}

const PALETTE = ['#22d3ee', '#a78bfa', '#f472b6', '#fb923c', '#34d399', '#fbbf24']

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/**
 * Resolves the local user.
 *
 * - `?simulate=david` → returns the David persona (used for screencast demos
 *   where the recorder needs to "be" CS Rep David in one tab and Eng in another).
 * - `?simulate=anything-else` → returns a stable persona for that name.
 * - default → returns a one-off "Engineer 412" name with a stable palette color.
 */
export function getCurrentUser(): Persona {
  const sim = new URLSearchParams(window.location.search).get('simulate')?.toLowerCase()
  if (sim && PERSONAS[sim]) return PERSONAS[sim]
  if (sim) {
    const name = `${sim[0].toUpperCase()}${sim.slice(1)}`
    return { name, color: PALETTE[hash(name) % PALETTE.length] }
  }
  const id = (hash(navigator.userAgent + Math.random().toString(36)) % 900) + 100
  const name = `Engineer ${id}`
  return { name, color: PALETTE[hash(name) % PALETTE.length] }
}
