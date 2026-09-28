/* Turns the contribution snapshot ([date, count] pairs, oldest first) into
   what the commit-telemetry panel draws: GitHub-style week columns
   (Sunday-first), month labels, intensity levels and a few headline stats.
   Dates are handled as UTC calendar days so no timezone can shift a cell. */

const DAY_MS = 86_400_000
const toTime = (date) => Date.parse(`${date}T00:00:00Z`)
const toDate = (time) => new Date(time).toISOString().slice(0, 10)

const MONTH = new Intl.DateTimeFormat('en-CA', { month: 'short', timeZone: 'UTC' })
const LONG_DATE = new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
export const formatDay = (date) => LONG_DATE.format(toTime(date))

/* Levels 1–4 split the active days into quarters by rank. GitHub's own
   buckets are relative to the busiest day, so a few very large days flatten
   everything else to level 1; ranking keeps the grid readable. A day's level
   is the quarter its count reaches (ties share the higher quarter), so the
   busiest day is always level 4, even with only a handful of active days. */
function levelScale(counts) {
  const active = counts.filter((n) => n > 0).sort((a, b) => a - b)
  if (!active.length) return () => 0
  const levels = new Map()
  active.forEach((n, i) => levels.set(n, Math.max(1, Math.ceil(((i + 1) / active.length) * 4))))
  return (n) => (n <= 0 ? 0 : levels.get(n))
}

export function buildCalendar(days, { weeks = 53 } = {}) {
  const byDate = new Map(days)
  const last = toTime(days[days.length - 1][0])
  const first = toTime(days[0][0])
  // Last column ends on the last day; the first column starts on a Sunday.
  const lastSunday = last - new Date(last).getUTCDay() * DAY_MS
  const start = lastSunday - (weeks - 1) * 7 * DAY_MS

  const inRange = days.filter(([d]) => toTime(d) >= start)
  const level = levelScale(inRange.map(([, n]) => n))

  const cells = []
  const months = []
  const tally = [] // running total at the end of each column, for the count-up
  let running = 0
  let peak = null
  for (let col = 0; col < weeks; col++) {
    const colStart = start + col * 7 * DAY_MS
    const monthStartsHere = new Date(colStart).getUTCDate() <= 7
    if (monthStartsHere && col < weeks - 2 && (!months.length || col - months.at(-1).col >= 3)) {
      months.push({ col, label: MONTH.format(colStart) })
    }
    for (let row = 0; row < 7; row++) {
      const t = colStart + row * DAY_MS
      if (t > last) break
      const date = toDate(t)
      if (t < first || !byDate.has(date)) {
        cells.push({ col, row, date, void: true })
        continue
      }
      const count = byDate.get(date)
      running += count
      const cell = { col, row, date, count, level: level(count), today: t === last }
      if (count > 0 && (!peak || count > peak.count)) peak = cell
      cells.push(cell)
    }
    tally.push(running)
  }
  if (peak) peak.peak = true

  return {
    weeks,
    cells,
    months,
    tally,
    total: running,
    activeDays: inRange.filter(([, n]) => n > 0).length,
  }
}
