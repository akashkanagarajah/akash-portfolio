import { useEffect, useMemo, useRef, useState } from 'react'
import { useElementPower, usePowerProgress, usePowerSwitch } from '../hooks/usePowerProgress'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { buildCalendar, formatDay } from '../lib/contributions'
import snapshot from '../data/githubContributions.json'
import './CommitTelemetry.css'

/* ============================================================
   CommitTelemetry — the GitHub contribution calendar as a lamp panel.

   The grid starts dark. When the panel scrolls into view a scan line sweeps
   across it and every active day flashes on to its intensity as the scan
   passes, while the headline total tallies the weeks the scan has crossed.
   It plays once per visit; the latest day keeps a slow "live" pulse and the
   busiest day holds a glow.
   Reduced motion shows the finished panel straight away.

   Data is the committed snapshot in src/data/githubContributions.json,
   refreshed before each build by scripts/fetch-github-contributions.mjs —
   visitors' browsers never call GitHub or a third party.
   ============================================================ */

const PROFILE_URL = `https://github.com/${snapshot.user}`
const SCAN_MS = 1700
const SETTLE_MS = SCAN_MS + 800 // scan plus the last lamps' flash
const LEVELS = [0, 1, 2, 3, 4]

export default function CommitTelemetry() {
  const { reducedMotion } = usePowerProgress()
  // Phones get the last six months so the lamps stay big enough to read and tap.
  const compact = useMediaQuery('(max-width: 768px)')
  const cal = useMemo(() => buildCalendar(snapshot.days, { weeks: compact ? 26 : 53 }), [compact])
  const range = compact ? 'last 6 months' : 'last 12 months'

  const panelRef = useRef(null)
  const gridRef = useRef(null)
  const countRef = useRef(null)
  const on = usePowerSwitch(useElementPower(panelRef, { offset: ['start end', 'start 60%'] }), 0.5)
  const [played, setPlayed] = useState(false)
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    if (on) setPlayed(true)
  }, [on])
  // Once the scan is done the panel is settled: a later re-layout (e.g. a
  // phone rotating across the breakpoint) shows the finished state instead of
  // replaying the sweep.
  useEffect(() => {
    if (!played) return
    const id = setTimeout(() => setSettled(true), SETTLE_MS)
    return () => clearTimeout(id)
  }, [played])
  const live = played || reducedMotion

  // The total tallies each week as the scan crosses it; written straight to
  // the DOM, so the count-up never re-renders the grid.
  useEffect(() => {
    const el = countRef.current
    if (!el) return
    const show = (n) => (el.textContent = n.toLocaleString('en-CA'))
    if (reducedMotion || settled) return void show(cal.total)
    if (!played) return void show(0)
    let raf = 0
    let t0 = null
    const tick = (t) => {
      t0 ??= t
      const k = Math.min(1, (t - t0) / SCAN_MS)
      show(k < 1 ? cal.tally[Math.floor(k * cal.weeks)] : cal.total)
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [played, settled, reducedMotion, cal])

  // One tooltip for the whole grid, driven by event delegation.
  const [tip, setTip] = useState(null)
  const showTip = (e) => {
    const cell = e.target.closest('[data-date]')
    const grid = gridRef.current
    if (!cell || !grid) return setTip(null)
    const c = cell.getBoundingClientRect()
    const g = grid.getBoundingClientRect()
    const count = Number(cell.dataset.count)
    setTip({
      x: c.left - g.left + c.width / 2,
      y: c.top - g.top,
      alignEnd: c.left - g.left > g.width * 0.75,
      alignStart: c.left - g.left < g.width * 0.25,
      text: `${count === 0 ? 'No' : count.toLocaleString('en-CA')} contribution${count === 1 ? '' : 's'} · ${formatDay(cell.dataset.date)}`,
    })
  }

  const summary = `${cal.total.toLocaleString('en-CA')} GitHub contributions in the ${range}, across ${cal.activeDays} active days.`

  return (
    <figure ref={panelRef} className={`ct-panel${live ? ' is-live' : ''}${settled ? ' is-settled' : ''}`}>
      <figcaption className="ct-head">
        <div className="ct-title">
          <span className="ct-led" aria-hidden="true" />
          GitHub · commit telemetry
        </div>
        {/* The grid's role="img" label carries the total for screen readers;
            this animated copy is visual only. */}
        <div className="ct-total" aria-hidden="true">
          <span ref={countRef} className="ct-total__value">
            {reducedMotion ? cal.total.toLocaleString('en-CA') : 0}
          </span>
          <span className="ct-total__label">contributions · {range}</span>
        </div>
      </figcaption>

      <div className="ct-scroll" style={{ '--weeks': cal.weeks }}>
        <div className="ct-months" aria-hidden="true">
          {cal.months.map((m) => (
            <span key={`${m.col}-${m.label}`} style={{ gridColumn: `${m.col + 1} / span 3` }}>
              {m.label}
            </span>
          ))}
        </div>
        <div
          ref={gridRef}
          className="ct-grid"
          style={{ '--step': `${SCAN_MS / cal.weeks}ms`, '--scan': `${SCAN_MS}ms` }}
          role="img"
          aria-label={summary}
          onMouseOver={showTip}
          onMouseLeave={() => setTip(null)}
        >
          {cal.cells.map((c) =>
            c.void ? (
              <span key={c.date} className="ct-cell is-void" style={{ gridColumn: c.col + 1, gridRow: c.row + 1 }} />
            ) : (
              <span
                key={c.date}
                className={`ct-cell${c.today ? ' is-today' : ''}${c.peak ? ' is-peak' : ''}`}
                data-level={c.level}
                data-date={c.date}
                data-count={c.count}
                style={{ gridColumn: c.col + 1, gridRow: c.row + 1, '--c': c.col, '--r': c.row }}
              />
            )
          )}
          <span className="ct-scan" aria-hidden="true" />
          {tip && (
            <span
              className={`ct-tip${tip.alignEnd ? ' is-end' : ''}${tip.alignStart ? ' is-start' : ''}`}
              style={{ left: tip.x, top: tip.y }}
              aria-hidden="true"
            >
              {tip.text}
            </span>
          )}
        </div>
      </div>

      <div className="ct-foot">
        <div className="ct-legend" aria-hidden="true">
          <span>Less</span>
          {LEVELS.map((l) => (
            <span key={l} className="ct-cell ct-cell--key" data-level={l} />
          ))}
          <span>More</span>
        </div>
        <a className="ct-link" href={PROFILE_URL} target="_blank" rel="noreferrer">
          View on GitHub →
        </a>
      </div>
    </figure>
  )
}
