// Copies Pyodide's runtime assets (.wasm, .zip, .whl, lock file, .mjs glue)
// from node_modules/pyodide → public/pyodide so loadPyodide({ indexURL: '/pyodide/' })
// can fetch them at runtime. Cross-platform — no bash, no rsync.
import { mkdir, cp, readdir, rm, stat } from 'node:fs/promises'
import path from 'node:path'

const SRC = path.resolve('node_modules/pyodide')
const DEST = path.resolve('public/pyodide')

const SKIP = new Set([
  'package.json',
  'README.md',
  'CHANGELOG.md',
  'LICENSE',
  'node_modules',
])

async function main() {
  // If pyodide isn't installed yet (e.g. fresh clone before deps resolve),
  // bail silently — the next `npm i` will trigger postinstall again.
  try {
    await stat(SRC)
  } catch {
    console.warn('[pyodide] node_modules/pyodide not found yet — skipping copy')
    return
  }

  await rm(DEST, { recursive: true, force: true })
  await mkdir(DEST, { recursive: true })

  const entries = await readdir(SRC)
  let copied = 0
  for (const name of entries) {
    if (SKIP.has(name)) continue
    if (name.endsWith('.d.ts') || name.endsWith('.ts')) continue
    await cp(path.join(SRC, name), path.join(DEST, name), { recursive: true })
    copied++
  }
  console.log(`[pyodide] copied ${copied} entries → ${path.relative(process.cwd(), DEST)}`)
}

main().catch((err) => {
  console.error('[pyodide] copy failed:', err)
  process.exit(1)
})
