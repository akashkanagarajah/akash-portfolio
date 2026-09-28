import { useEffect, useMemo, useRef, useState } from 'react'
import { useMotionValueEvent } from 'motion/react'
import { usePowerProgress } from '../hooks/usePowerProgress'
import { useMediaQuery } from '../hooks/useMediaQuery'
import './ReactorField.css'

/* ============================================================
   ReactorField — fixed circuit-trace backdrop behind the whole page.

   Two stacked SVG layers share one generated layout:
     cold — every trace as faint unpowered wiring; static, never repaints
     live — gold copies that energise one by one as the page is scrolled
   Each trace is assigned to a section and flickers on while that section
   scrolls into view, so the field powers up section by section. Overall
   brightness rides the live layer's opacity (compositor-only). Flow pulses
   only run on traces that are lit.
   ============================================================ */

const PULSE = 26 // length of a travelling flow pulse, in viewBox units

const LAYOUTS = {
  // Landscape: traces kept to the side bands so the reading column stays calm.
  wide: { width: 1440, height: 900, grid: 24, count: 26, band: 0.3, seed: 7 },
  // Portrait / phones: fewer traces, wider bands (the content column is the screen).
  tall: { width: 420, height: 860, grid: 20, count: 11, band: 0.42, seed: 23 },
}

const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]

function mulberry32(seed) {
  let s = seed
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* PCB-style router: orthogonal runs joined by short 45° chamfers, sometimes a
   jog (two opposite chamfers) instead of a turn. Deterministic per seed so the
   field is identical on every load. */
function generateLayout({ width: W, height: H, grid: G, count, band, seed }) {
  const rand = mulberry32(seed)
  const int = (a, b) => a + Math.floor(rand() * (b - a + 1))
  const snap = (v) => Math.round(v / G) * G
  const occupied = new Set()
  const traces = []
  // Just past the right / bottom edges, on the grid, for traces that enter from off-screen.
  const xOff = Math.ceil(W / G) * G + G
  const yOff = Math.ceil(H / G) * G + G

  const zoneBounds = {
    left: { x0: -G, x1: W * band, y0: G, y1: H - G },
    right: { x0: W * (1 - band), x1: xOff, y0: G, y1: H - G },
    top: { x0: G, x1: W - G, y0: -G, y1: H * 0.22 },
    bottom: { x0: G, x1: W - G, y0: H * 0.78, y1: yOff },
  }

  const maxSteps = (x, y, [dx, dy], b) => {
    let s = Infinity
    if (dx > 0) s = Math.min(s, Math.floor((b.x1 - x) / G))
    if (dx < 0) s = Math.min(s, Math.floor((x - b.x0) / G))
    if (dy > 0) s = Math.min(s, Math.floor((b.y1 - y) / G))
    if (dy < 0) s = Math.min(s, Math.floor((y - b.y0) / G))
    return s
  }

  for (let attempt = 0; traces.length < count && attempt < count * 40; attempt++) {
    const r = rand()
    const zone = r < 0.4 ? 'left' : r < 0.8 ? 'right' : r < 0.9 ? 'top' : 'bottom'
    const b = zoneBounds[zone]
    const fromEdge = rand() < 0.55
    let x, y, d
    if (zone === 'left' || zone === 'right') {
      y = snap(G * 2 + rand() * (H - G * 4))
      x = fromEdge ? (zone === 'left' ? -G : xOff) : snap(b.x0 + G * 3 + rand() * (b.x1 - b.x0 - G * 6))
      d = fromEdge ? (zone === 'left' ? 0 : 4) : [0, 2, 4, 6][int(0, 3)]
    } else {
      x = snap(G * 2 + rand() * (W - G * 4))
      y = fromEdge ? (zone === 'top' ? -G : yOff) : snap(b.y0 + G * 2 + rand() * Math.max(G, b.y1 - b.y0 - G * 4))
      d = fromEdge ? (zone === 'top' ? 2 : 6) : [0, 2, 4, 6][int(0, 3)]
    }

    const pts = [[x, y]]
    const cells = []
    const move = (steps) => {
      const [dx, dy] = DIRS[d]
      for (let i = 0; i < steps; i++) {
        x += dx * G
        y += dy * G
        cells.push(`${x},${y}`)
      }
      pts.push([x, y])
    }

    const runs = int(2, 4)
    for (let run = 0; run < runs; run++) {
      const want = run === 0 && fromEdge ? int(4, 11) : int(3, 9)
      const steps = Math.min(want, maxSteps(x, y, DIRS[d], b))
      if (steps < 2) break
      move(steps)
      if (run === runs - 1) break
      const turn = rand() < 0.5 ? 1 : -1
      d = (d + turn + 8) % 8
      const diag = Math.min(int(1, 3), maxSteps(x, y, DIRS[d], b))
      if (diag < 1) break
      move(diag)
      d = (d + (rand() < 0.7 ? turn : -turn) + 8) % 8
    }

    // Reject stubs, traces that end off-screen (the pad must be visible) and
    // traces that would run on top of one already placed.
    let len = 0
    for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
    const end = pts[pts.length - 1]
    if (len < G * 5 || pts.length < 3) continue
    if (end[0] < G || end[0] > W - G || end[1] < G || end[1] > H - G) continue
    if (cells.some((c) => occupied.has(c))) continue
    cells.forEach((c) => occupied.add(c))

    const dur = Math.min(7.5, Math.max(2.8, len / (G * 5.5)))
    traces.push({
      d: 'M' + pts.map(([px, py]) => `${px} ${py}`).join(' L'),
      len: Math.round(len),
      start: fromEdge ? null : pts[0],
      end,
      midY: pts.reduce((s, p) => s + p[1], 0) / pts.length,
      flow: len > G * 8 && rand() < 0.7,
      dur: +dur.toFixed(2),
      delay: +(-rand() * dur).toFixed(2),
    })
  }
  return { width: W, height: H, traces }
}

const GENERATED = {
  wide: generateLayout(LAYOUTS.wide),
  tall: generateLayout(LAYOUTS.tall),
}

/* Spread traces across the sections after the hero, top of the screen first, so
   each section lights its own batch between its `enter` and `center` landmarks.
   Returns each trace's rank in lighting order plus the sorted thresholds. */
function scheduleTraces(traces, landmarks, sections) {
  const n = traces.length
  const byHeight = traces.map((_, i) => i).sort((a, b) => traces[a].midY - traces[b].midY)
  const groups = sections.slice(1).filter((id) => landmarks[id])
  const thresholds = new Array(n)
  byHeight.forEach((ti, k) => {
    if (!groups.length) {
      thresholds[ti] = 0.02 + (k / n) * 0.93
      return
    }
    const slot = (k / n) * groups.length
    const g = Math.floor(slot)
    const lm = landmarks[groups[g]]
    const b = Math.max(lm.center, lm.enter + 0.01)
    thresholds[ti] = Math.max(0.006, lm.enter + (b - lm.enter) * (0.08 + (slot - g) * 0.84))
  })
  const order = thresholds.map((_, i) => i).sort((a, b) => thresholds[a] - thresholds[b])
  const rank = new Array(n)
  order.forEach((ti, r) => (rank[ti] = r))
  return { rank, sorted: order.map((i) => thresholds[i]) }
}

const countBelow = (sorted, v) => {
  let n = 0
  while (n < sorted.length && sorted[n] <= v) n++
  return n
}

/* Corner gauge (landscape only): a half-dial whose sweep and needle track power. */
const DIAL = { cx: 200, cy: 200, r: 150 }
const DIAL_TICKS = Array.from({ length: 21 }, (_, i) => {
  const a = Math.PI + (i / 20) * Math.PI
  const major = i % 5 === 0
  const r0 = DIAL.r - (major ? 18 : 9)
  const r1 = DIAL.r - 2
  return {
    major,
    x1: DIAL.cx + r0 * Math.cos(a),
    y1: DIAL.cy + r0 * Math.sin(a),
    x2: DIAL.cx + r1 * Math.cos(a),
    y2: DIAL.cy + r1 * Math.sin(a),
  }
})
const DIAL_ARC = `M${DIAL.cx - DIAL.r} ${DIAL.cy} A${DIAL.r} ${DIAL.r} 0 0 1 ${DIAL.cx + DIAL.r} ${DIAL.cy}`
const DIAL_INNER = `M${DIAL.cx - DIAL.r + 30} ${DIAL.cy} A${DIAL.r - 30} ${DIAL.r - 30} 0 0 1 ${DIAL.cx + DIAL.r - 30} ${DIAL.cy}`

const STATIC_POWER = 0.12 // reduced motion: lit, but at low intensity

export default function ReactorField() {
  const { progress, power, landmarks, sections, reducedMotion } = usePowerProgress()
  const portrait = useMediaQuery('(max-aspect-ratio: 1/1)')
  const layout = portrait ? GENERATED.tall : GENERATED.wide

  const liveRef = useRef(null)
  const sweepRef = useRef(null)
  const needleRef = useRef(null)

  const { rank, sorted } = useMemo(
    () => scheduleTraces(layout.traces, landmarks, sections),
    [layout, landmarks, sections]
  )
  const [litCount, setLitCount] = useState(() => countBelow(sorted, progress.get()))

  useMotionValueEvent(progress, 'change', (v) => setLitCount(countBelow(sorted, v)))
  useEffect(() => setLitCount(countBelow(sorted, progress.get())), [sorted, progress])

  // Intensity + gauge are written straight to the DOM: no re-render per frame.
  useEffect(() => {
    let last = -1
    const apply = (v) => {
      const q = Math.round(v * 400) / 400
      if (q === last) return
      last = q
      if (liveRef.current) liveRef.current.style.opacity = (0.4 + q * 0.6).toFixed(3)
      sweepRef.current?.setAttribute('stroke-dashoffset', (100 - q * 100).toFixed(2))
      if (needleRef.current) {
        needleRef.current.setAttribute('transform', `rotate(${(q * 180).toFixed(2)} ${DIAL.cx} ${DIAL.cy})`)
        needleRef.current.style.opacity = (0.12 + q * 0.45).toFixed(3)
      }
    }
    if (reducedMotion) {
      apply(STATIC_POWER)
      return
    }
    apply(power.get())
    return power.on('change', apply)
  }, [power, reducedMotion, portrait])

  const { width: W, height: H, traces } = layout
  const viewBox = `0 0 ${W} ${H}`

  return (
    <div className={`reactor-field${reducedMotion ? ' is-static' : ''}`} aria-hidden="true">
      <svg className="rf-layer rf-layer--cold" viewBox={viewBox} preserveAspectRatio="xMidYMid slice">
        {traces.map((t, i) => (
          <g key={i}>
            <path className="rf-wire" d={t.d} />
            {t.start && <circle className="rf-via" cx={t.start[0]} cy={t.start[1]} r={2.4} />}
            <circle className="rf-pad" cx={t.end[0]} cy={t.end[1]} r={3.2} />
          </g>
        ))}
      </svg>

      <svg ref={liveRef} className="rf-layer rf-layer--live" viewBox={viewBox} preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="rf-halo">
            <stop offset="0%" style={{ stopColor: 'var(--accent-2)', stopOpacity: 0.55 }} />
            <stop offset="100%" style={{ stopColor: 'var(--accent-2)', stopOpacity: 0 }} />
          </radialGradient>
        </defs>
        {traces.map((t, i) => {
          const lit = reducedMotion || rank[i] < litCount
          return (
            <g
              key={i}
              className={`rf-trace${lit ? ' is-lit' : ''}`}
              style={{ '--pulse-from': `${PULSE}px`, '--pulse-to': `${-t.len}px`, '--dur': `${t.dur}s`, '--delay': `${t.delay}s` }}
            >
              <path className="rf-glow" d={t.d} />
              <path className="rf-lit" d={t.d} />
              {t.flow && <path className="rf-flow" d={t.d} strokeDasharray={`${PULSE} ${t.len + PULSE}`} />}
              <circle className="rf-halo" cx={t.end[0]} cy={t.end[1]} r={16} fill="url(#rf-halo)" />
              <circle className="rf-node-ring" cx={t.end[0]} cy={t.end[1]} r={6.5} />
              <circle className="rf-node" cx={t.end[0]} cy={t.end[1]} r={3.2} />
            </g>
          )
        })}
      </svg>

      {!portrait && (
        <svg className="rf-dial" viewBox="0 0 400 400">
          <path className="rf-dial-track" d={DIAL_ARC} />
          <path className="rf-dial-inner" d={DIAL_INNER} />
          {DIAL_TICKS.map((tk, i) => (
            <line key={i} className={`rf-dial-tick${tk.major ? ' is-major' : ''}`} x1={tk.x1} y1={tk.y1} x2={tk.x2} y2={tk.y2} />
          ))}
          <path ref={sweepRef} className="rf-dial-sweep" d={DIAL_ARC} pathLength="100" strokeDasharray="100 100" strokeDashoffset="100" />
          <line ref={needleRef} className="rf-dial-needle" x1={DIAL.cx} y1={DIAL.cy} x2={DIAL.cx - DIAL.r + 26} y2={DIAL.cy} />
          <circle className="rf-dial-hub" cx={DIAL.cx} cy={DIAL.cy} r={5} />
        </svg>
      )}
    </div>
  )
}
