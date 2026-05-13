/** Public email shown in Connect; copy action uses the same value. */
export const CONTACT_EMAIL = 'akashkanagarajah@gmail.com'

let confettiLoad = null

function getConfetti() {
  if (!confettiLoad) {
    confettiLoad = import('canvas-confetti').then((m) => m.default)
  }
  return confettiLoad
}

/**
 * Normalized confetti origin (0–1) from `getBoundingClientRect()` vs the viewport.
 */
function originFromRect(rect) {
  const vw = window.innerWidth || 1
  const vh = window.innerHeight || 1
  return {
    x: (rect.left + rect.width / 2) / vw,
    y: (rect.top + rect.height / 2) / vh,
  }
}

/**
 * Copies the contact email to the clipboard, then runs a short confetti burst from the click origin.
 * Confetti loads only after a successful copy (dynamic import, cached thereafter).
 *
 * @param {React.MouseEvent<HTMLElement> | MouseEvent} [clickEvent] — uses `event.target.getBoundingClientRect()` when `target` is an `Element`; otherwise `currentTarget` so the burst still anchors to the Email control.
 */
export async function copyContactEmailToClipboard(clickEvent) {
  if (!navigator.clipboard?.writeText) {
    throw new Error('Clipboard API not available')
  }
  await navigator.clipboard.writeText(CONTACT_EMAIL)

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (prefersReduced) return

  const confetti = await getConfetti()

  let origin = { x: 0.5, y: 0.5 }
  if (clickEvent && typeof clickEvent === 'object') {
    if (clickEvent.target instanceof Element) {
      const rect = clickEvent.target.getBoundingClientRect()
      origin = originFromRect(rect)
    } else if (clickEvent.currentTarget instanceof Element) {
      const rect = clickEvent.currentTarget.getBoundingClientRect()
      origin = originFromRect(rect)
    }
  }

  confetti({
    particleCount: 48,
    spread: 42,
    startVelocity: 16,
    ticks: 75,
    gravity: 1.08,
    scalar: 0.9,
    origin,
    disableForReducedMotion: true,
  })
}
