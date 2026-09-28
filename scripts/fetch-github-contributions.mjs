// Refreshes src/data/githubContributions.json — the snapshot behind the
// "commit telemetry" panel at the end of About. Runs before every `npm run build`
// (prebuild) and on demand with `npm run contributions`.
//
// Source: GitHub's own public contribution calendar (no token needed), with
// the jogruber contributions API as a fallback. If neither is reachable the
// committed snapshot is kept and the build carries on, so an offline build
// never fails. The file is only rewritten when the data actually changed,
// which keeps the working tree clean on repeat builds.

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const USER = 'akashkanagarajah'
const OUT = fileURLToPath(new URL('../src/data/githubContributions.json', import.meta.url))
const TIMEOUT_MS = 10_000

async function get(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': `${USER}-portfolio-build` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`)
  return res
}

// The calendar is an HTML table: one <td data-date id> per day, and a
// <tool-tip for=id> holding "N contributions on …" / "No contributions on …".
async function fromGitHub() {
  const html = await (await get(`https://github.com/users/${USER}/contributions`)).text()
  const idToDate = new Map()
  for (const [tag] of html.matchAll(/<td\b[^>]*\bdata-date="\d{4}-\d{2}-\d{2}"[^>]*>/g)) {
    const date = /\bdata-date="([^"]+)"/.exec(tag)[1]
    const id = /\bid="([^"]+)"/.exec(tag)?.[1]
    if (id) idToDate.set(id, date)
  }
  const counts = new Map()
  for (const [, id, text] of html.matchAll(/<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const date = idToDate.get(id)
    if (!date) continue
    const n = /^\s*(\d[\d,]*)\s+contributions?\b/i.exec(text)
    if (n) counts.set(date, Number(n[1].replace(/,/g, '')))
    else if (/^\s*No contributions/i.test(text)) counts.set(date, 0)
    else throw new Error(`unrecognised tooltip text: "${text.trim()}"`)
  }
  if (counts.size !== idToDate.size) throw new Error(`matched ${counts.size} counts for ${idToDate.size} days`)
  return [...counts]
}

async function fromJogruber() {
  const data = await (await get(`https://github-contributions-api.jogruber.de/v4/${USER}?y=last`)).json()
  return data.contributions.map((d) => [d.date, d.count])
}

function validate(days) {
  days.sort((a, b) => (a[0] < b[0] ? -1 : 1))
  if (days.length < 300) throw new Error(`only ${days.length} days`)
  if (!days.every(([d, n]) => /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isInteger(n) && n >= 0)) {
    throw new Error('malformed day entries')
  }
  return days
}

function serialise(source, days) {
  const rows = days.map((d) => JSON.stringify(d)).join(',\n    ')
  return `{\n  "user": "${USER}",\n  "source": "${source}",\n  "through": "${days.at(-1)[0]}",\n  "days": [\n    ${rows}\n  ]\n}\n`
}

async function main() {
  let result = null
  for (const [source, load] of [['github.com', fromGitHub], ['github-contributions-api.jogruber.de', fromJogruber]]) {
    try {
      result = { source, days: validate(await load()) }
      break
    } catch (err) {
      console.warn(`[contributions] ${source} failed: ${err.message}`)
    }
  }
  const prev = await readFile(OUT, 'utf8').catch(() => '')
  if (!result) {
    console.warn(
      prev
        ? '[contributions] keeping the committed snapshot'
        : `[contributions] no snapshot at ${OUT} and no source reachable — the panel's import will fail until one is fetched`
    )
    return
  }
  const next = serialise(result.source, result.days)
  // Compare the day data only, so a source switch alone doesn't churn the file.
  const daysOf = (text) => text.slice(text.indexOf('"days"'))
  if (prev && daysOf(prev) === daysOf(next)) {
    console.log(`[contributions] unchanged (through ${result.days.at(-1)[0]})`)
    return
  }
  await writeFile(OUT, next)
  const total = result.days.reduce((s, [, n]) => s + n, 0)
  console.log(`[contributions] ${total} contributions through ${result.days.at(-1)[0]} (from ${result.source})`)
}

main().catch((err) => {
  // Never fail the build over this panel.
  console.warn(`[contributions] ${err.message}; keeping the committed snapshot`)
})
