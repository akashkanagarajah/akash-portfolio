import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useMotionValue, useMotionValueEvent, useScroll, useSpring } from 'motion/react'
import { useMediaQuery, REDUCED_MOTION_QUERY } from './useMediaQuery'

/* ============================================================
   Power progress — the scroll-driven "reactor coming online" signal.

   The whole page is one power-up sequence: scroll progress 0 is the system
   dark at the hero, 1 is fully online at the bottom of the page. Sections are
   landmarks along that sequence, measured from their real DOM position so the
   numbers stay honest when copy, images or the shelf change the page height.

   <PowerProvider> wraps the app once. Anything below it reads the signal with
   usePowerProgress() (page-wide) or useSectionPower(id) (one section's local
   0 → 1). Values are MotionValues, so consumers can bind them straight to
   `motion.*` styles or subscribe without re-rendering on every scroll frame.
   ============================================================ */

// Section ids in page order (see App.jsx). Order is the power-up sequence.
export const POWER_SECTIONS = ['home', 'about', 'reading', 'resume', 'education', 'projects', 'connect']

// A section counts as "active" once its top edge crosses this fraction of the viewport.
const ACTIVE_LINE = 0.4

const PowerContext = createContext(null)

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

/* Landmarks are expressed in page-progress units (0–1) so they compare directly
   against `progress`:
     enter  — section's top edge reaches the bottom of the viewport
     top    — section's top edge reaches the top of the viewport
     center — section's centre lines up with the viewport's centre
     exit   — section's bottom edge leaves through the top of the viewport
   offsetTop/height are raw document pixels for anything that needs geometry. */
function measureLandmarks(ids) {
  const vh = window.innerHeight
  const max = Math.max(1, document.documentElement.scrollHeight - vh)
  const out = {}
  for (const id of ids) {
    const el = document.getElementById(id)
    if (!el) continue
    const rect = el.getBoundingClientRect()
    const top = rect.top + window.scrollY
    const h = rect.height
    out[id] = {
      enter: clamp01((top - vh) / max),
      top: clamp01(top / max),
      center: clamp01((top + h / 2 - vh / 2) / max),
      exit: clamp01((top + h) / max),
      offsetTop: Math.round(top),
      height: Math.round(h),
    }
  }
  return out
}

const fingerprint = (landmarks) =>
  Object.entries(landmarks)
    .map(([id, l]) => `${id}:${l.offsetTop}:${l.height}:${l.enter.toFixed(4)}`)
    .join('|')

function pickActive(ids, landmarks, scrollY) {
  const vh = window.innerHeight
  // Short last sections never reach the line; the bottom of the page means the end.
  if (scrollY + vh >= document.documentElement.scrollHeight - 2) {
    for (let i = ids.length - 1; i >= 0; i--) if (landmarks[ids[i]]) return ids[i]
  }
  const line = scrollY + vh * ACTIVE_LINE
  let active = ids.find((id) => landmarks[id]) ?? null
  for (const id of ids) {
    const l = landmarks[id]
    if (l && l.offsetTop <= line) active = id
  }
  return active
}

/* Map page progress onto one section's local 0 → 1 between two of its landmarks. */
export function mapSectionProgress(landmark, value, from = 'enter', to = 'center') {
  if (!landmark) return 0
  const a = landmark[from]
  const b = landmark[to]
  if (b <= a) return value >= b ? 1 : 0
  return clamp01((value - a) / (b - a))
}

export function PowerProvider({ children, sections = POWER_SECTIONS }) {
  const { scrollY, scrollYProgress } = useScroll()
  // Eased copy of progress for glow/intensity so fast flicks don't strobe.
  const smoothed = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.6, restDelta: 0.0005 })
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY)

  const [landmarks, setLandmarks] = useState({})
  const [activeSection, setActiveSection] = useState(sections[0] ?? null)
  const landmarksRef = useRef(landmarks)
  const sectionsKey = sections.join('|')

  // Re-measure whenever layout can move a section: resize, late images/fonts,
  // the shelf or an accordion changing the document height.
  useLayoutEffect(() => {
    let raf = 0
    let lastKey = ''
    const run = () => {
      raf = 0
      const next = measureLandmarks(sections)
      const key = fingerprint(next)
      if (key === lastKey) return
      lastKey = key
      landmarksRef.current = next
      setLandmarks(next)
      setActiveSection(pickActive(sections, next, window.scrollY))
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(run)
    }
    run()
    const ro = new ResizeObserver(schedule)
    ro.observe(document.body)
    window.addEventListener('resize', schedule)
    window.addEventListener('load', schedule)
    document.fonts?.ready.then(schedule)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('resize', schedule)
      window.removeEventListener('load', schedule)
    }
  }, [sectionsKey])

  useMotionValueEvent(scrollY, 'change', (y) => {
    setActiveSection(pickActive(sections, landmarksRef.current, y))
  })

  const value = useMemo(
    () => ({
      progress: scrollYProgress,
      power: reducedMotion ? scrollYProgress : smoothed,
      landmarks,
      sections,
      activeSection,
      reducedMotion,
    }),
    [scrollYProgress, smoothed, landmarks, sections, activeSection, reducedMotion]
  )

  return createElement(PowerContext.Provider, { value }, children)
}

/* Page-wide power signal. See PowerProvider for what each field means:
     progress       MotionValue 0–1  raw page scroll progress
     power          MotionValue 0–1  spring-eased progress (raw when reduced motion)
     landmarks      { [sectionId]: { enter, top, center, exit, offsetTop, height } }
     sections       section ids in power-up order
     activeSection  id of the section currently under the viewport's 40% line
     reducedMotion  true when the OS asks for reduced motion */
export function usePowerProgress() {
  const ctx = useContext(PowerContext)
  if (!ctx) throw new Error('usePowerProgress must be used inside <PowerProvider>')
  return ctx
}

/* One section's local power, 0 → 1, as a MotionValue.
   `from`/`to` pick the landmarks it ramps between (default: from the moment the
   section peeks in at the bottom until it is centred). `smooth` reads the eased
   `power` instead of raw `progress`. Under reduced motion it holds at 1 so no
   section is ever left stuck dim. */
export function useSectionPower(id, { from = 'enter', to = 'center', smooth = false } = {}) {
  const { progress, power, landmarks, reducedMotion } = usePowerProgress()
  const source = smooth ? power : progress
  const landmark = landmarks[id]
  const compute = (v) => (reducedMotion ? 1 : mapSectionProgress(landmark, v, from, to))

  const local = useMotionValue(compute(source.get()))
  useMotionValueEvent(source, 'change', (v) => local.set(compute(v)))
  useEffect(() => {
    local.set(compute(source.get()))
  }, [landmark, from, to, reducedMotion, source, local])

  return local
}
