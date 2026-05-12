import React, { useRef, useEffect, useCallback, useState, useLayoutEffect, useMemo } from 'react'

/* ---------- helpers shared across components ---------- */
function parseRGBish(str) {
  if (!str) return { r: 201, g: 168, b: 76 }
  if (str.startsWith('#')) {
    const h = str.replace('#', '')
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    }
  }
  const m = str.split(',').map((n) => parseInt(n.trim(), 10))
  return { r: m[0] || 0, g: m[1] || 0, b: m[2] || 0 }
}

/* ============================================================
   BorderGlow — pointer-following gradient cone + outer halo
   ============================================================ */
export function BorderGlow({
  children,
  className = '',
  edgeSensitivity = 30,
  glowColor = '43 30 10',
  backgroundColor = 'var(--bg-card)',
  borderRadius = 16,
  glowRadius = 35,
  glowIntensity = 0.8,
  coneSpread = 25,
  animated = false,
  colors = ['#C9A84C', '#e8c878', '#C9A84C'],
}) {
  const cardRef = useRef(null)

  const parts = glowColor.match(/([\d.]+)\s+([\d.]+)\s+([\d.]+)/)
  const h = parts ? parts[1] : 40
  const s = parts ? parts[2] : 80
  const l = parts ? parts[3] : 80

  const handlePointerMove = useCallback((e) => {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const cx = rect.width / 2
    const cy = rect.height / 2
    const dx = x - cx
    const dy = y - cy
    let kx = Infinity,
      ky = Infinity
    if (dx !== 0) kx = cx / Math.abs(dx)
    if (dy !== 0) ky = cy / Math.abs(dy)
    const edge = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1)
    let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90
    if (deg < 0) deg += 360
    card.style.setProperty('--edge-proximity', (edge * 100).toFixed(2))
    card.style.setProperty('--cursor-angle', `${deg.toFixed(2)}deg`)
  }, [])

  const style = {
    '--card-bg': backgroundColor,
    '--edge-sensitivity': edgeSensitivity,
    '--color-sensitivity': edgeSensitivity + 20,
    '--border-radius': `${borderRadius}px`,
    '--glow-padding': `${glowRadius}px`,
    '--cone-spread': coneSpread,
    '--c1': colors[0],
    '--c2': colors[1] || colors[0],
    '--c3': colors[2] || colors[0],
    '--glow-color': `hsl(${h}deg ${s}% ${l}% / ${100 * glowIntensity}%)`,
    '--glow-60': `hsl(${h}deg ${s}% ${l}% / ${60 * glowIntensity}%)`,
    '--glow-40': `hsl(${h}deg ${s}% ${l}% / ${40 * glowIntensity}%)`,
    '--glow-20': `hsl(${h}deg ${s}% ${l}% / ${20 * glowIntensity}%)`,
    '--glow-10': `hsl(${h}deg ${s}% ${l}% / ${10 * glowIntensity}%)`,
    borderRadius: `${borderRadius}px`,
  }

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      className={`border-glow-card ${className}`}
      style={style}
    >
      <span className="edge-light" />
      <div className="border-glow-inner">{children}</div>
    </div>
  )
}

/* ============================================================
   ScrollReveal — per-word opacity + blur as section scrolls into view
   ============================================================ */
export function ScrollReveal({
  children,
  baseOpacity = 0,
  enableBlur = true,
  baseRotation = 3,
  blurStrength = 8,
  className = '',
  as: Tag = 'div',
}) {
  const containerRef = useRef(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const update = () => {
      const el = containerRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      const start = vh * 0.9
      const end = vh * 0.25
      const p = 1 - Math.min(Math.max((r.top - end) / (start - end), 0), 1)
      setProgress(p)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  const text = typeof children === 'string' ? children : null
  if (text) {
    const words = text.split(/(\s+)/)
    return (
      <Tag ref={containerRef} className={`scroll-reveal ${className}`}>
        {words.map((w, i) => {
          if (/^\s+$/.test(w)) return <React.Fragment key={i}>{w}</React.Fragment>
          const local = Math.min(
            Math.max((progress - i / (words.length * 1.3)) * 2, 0),
            1
          )
          const op = baseOpacity + (1 - baseOpacity) * local
          const blur = enableBlur ? blurStrength * (1 - local) : 0
          const rot = baseRotation * (1 - local)
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                opacity: op,
                filter: enableBlur ? `blur(${blur}px)` : 'none',
                transform: `translateY(${rot * 4}px) rotate(${rot}deg)`,
                transition: 'opacity 0.08s linear, filter 0.08s linear, transform 0.08s linear',
              }}
            >
              {w}
            </span>
          )
        })}
      </Tag>
    )
  }

  const op = baseOpacity + (1 - baseOpacity) * progress
  const blur = enableBlur ? blurStrength * (1 - progress) : 0
  const rot = baseRotation * (1 - progress)
  return (
    <Tag
      ref={containerRef}
      className={`scroll-reveal ${className}`}
      style={{
        opacity: op,
        filter: enableBlur ? `blur(${blur}px)` : 'none',
        transform: `translateY(${rot * 4}px)`,
        transition: 'opacity 0.15s linear, filter 0.15s linear, transform 0.15s linear',
      }}
    >
      {children}
    </Tag>
  )
}

/* ============================================================
   GradientText — animated multi-stop gradient over text
   ============================================================ */
export function GradientText({
  children,
  className = '',
  colors = ['#C9A84C', '#f0c060', '#C9A84C', '#e8a820', '#C9A84C'],
  animationSpeed = 6,
  yoyo = true,
  direction = 'horizontal',
  showBorder = false,
}) {
  const [pos, setPos] = useState(0)
  const elapsedRef = useRef(0)
  const lastRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    const duration = animationSpeed * 1000
    const tick = (t) => {
      if (lastRef.current === null) lastRef.current = t
      const dt = t - lastRef.current
      lastRef.current = t
      elapsedRef.current += dt
      let p
      if (yoyo) {
        const cycle = duration * 2
        const ct = elapsedRef.current % cycle
        p = ct < duration ? (ct / duration) * 100 : 100 - ((ct - duration) / duration) * 100
      } else {
        p = ((elapsedRef.current / duration) * 100) % 100
      }
      setPos(p)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [animationSpeed, yoyo])

  const angle =
    direction === 'horizontal' ? 'to right' : direction === 'vertical' ? 'to bottom' : 'to bottom right'
  const gradientColors = [...colors, colors[0]].join(', ')
  const style = {
    backgroundImage: `linear-gradient(${angle}, ${gradientColors})`,
    backgroundSize: direction === 'horizontal' ? '300% 100%' : '100% 300%',
    backgroundRepeat: 'repeat',
    backgroundPosition: direction === 'horizontal' ? `${pos}% 50%` : `50% ${pos}%`,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    display: 'inline-block',
  }
  return (
    <span className={`animated-gradient-text ${className}`} style={style}>
      {children}
    </span>
  )
}

/* ============================================================
   PixelTransition — pixelated reveal on hover
   ============================================================ */
export function PixelTransition({
  firstContent,
  secondContent,
  gridSize = 10,
  pixelColor = '#C9A84C',
  animationStepDuration = 0.4,
  aspectRatio = '133%',
  once = false,
  className = '',
  style = {},
}) {
  const [active, setActive] = useState(false)
  const [shown, setShown] = useState(0)
  const totalPixels = gridSize * gridSize
  const orderRef = useRef(null)
  const rafRef = useRef(null)
  const startRef = useRef(null)

  if (orderRef.current === null) {
    const arr = Array.from({ length: totalPixels }, (_, i) => i)
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    orderRef.current = arr
  }

  const animate = useCallback(
    (toActive) => {
      cancelAnimationFrame(rafRef.current)
      startRef.current = null
      const dur = animationStepDuration * 1000
      const tick = (t) => {
        if (startRef.current === null) startRef.current = t
        const elapsed = t - startRef.current
        const phase = elapsed / dur
        if (phase < 1) {
          setShown(Math.floor(phase * totalPixels))
          rafRef.current = requestAnimationFrame(tick)
        } else if (phase < 2) {
          setActive(toActive)
          setShown(totalPixels - Math.floor((phase - 1) * totalPixels))
          rafRef.current = requestAnimationFrame(tick)
        } else {
          setShown(0)
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    },
    [animationStepDuration, totalPixels]
  )

  const handleEnter = () => {
    if (!active) animate(true)
  }
  const handleLeave = () => {
    if (active && !once) animate(false)
  }

  return (
    <div
      className={`pixelated-image-card ${className}`}
      style={{ position: 'relative', overflow: 'hidden', ...style }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
      tabIndex={0}
    >
      <div style={{ paddingTop: aspectRatio }} />
      <div
        className="pixelated-image-card__default"
        style={{ position: 'absolute', inset: 0, opacity: active ? 0 : 1 }}
        aria-hidden={active}
      >
        {firstContent}
      </div>
      <div
        className="pixelated-image-card__active"
        style={{ position: 'absolute', inset: 0, opacity: active ? 1 : 0 }}
        aria-hidden={!active}
      >
        {secondContent}
      </div>
      <div
        className="pixelated-image-card__pixels"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          display: 'grid',
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gridTemplateRows: `repeat(${gridSize}, 1fr)`,
        }}
      >
        {Array.from({ length: totalPixels }).map((_, idx) => {
          const order = orderRef.current.indexOf(idx)
          const visible = order < shown
          return (
            <div
              key={idx}
              style={{
                background: pixelColor,
                opacity: visible ? 1 : 0,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

/* ============================================================
   ScrollVelocity — scrolling marquee that speeds up with scroll velocity
   ============================================================ */
export function ScrollVelocity({
  texts = [],
  velocity = 80,
  className = '',
  numCopies = 8,
}) {
  const rowsRef = useRef([])
  const offsetsRef = useRef(texts.map(() => 0))
  const widthsRef = useRef(texts.map(() => 0))
  const lastY = useRef(window.scrollY)
  const velFactor = useRef(0)
  const lastT = useRef(performance.now())
  const rafRef = useRef(null)

  useEffect(() => {
    const measure = () => {
      rowsRef.current.forEach((row, i) => {
        if (!row) return
        const first = row.querySelector('.sv-copy')
        if (first) widthsRef.current[i] = first.offsetWidth
      })
    }
    measure()
    window.addEventListener('resize', measure)

    const onScroll = () => {
      const y = window.scrollY
      const dy = y - lastY.current
      lastY.current = y
      velFactor.current = Math.max(-5, Math.min(5, dy / 16))
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    const tick = (t) => {
      const dt = (t - lastT.current) / 1000
      lastT.current = t
      velFactor.current *= 0.92
      texts.forEach((_, i) => {
        const dir = i % 2 === 0 ? 1 : -1
        const w = widthsRef.current[i] || 1
        let v = velocity * dir
        v += v * velFactor.current
        offsetsRef.current[i] += v * dt
        let o = offsetsRef.current[i] % w
        if (o > 0) o -= w
        const row = rowsRef.current[i]
        if (row) {
          const scroller = row.querySelector('.sv-scroller')
          if (scroller) scroller.style.transform = `translateX(${o}px)`
        }
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', measure)
    }
  }, [texts, velocity])

  return (
    <div className={`scroll-velocity ${className}`}>
      {texts.map((text, i) => (
        <div
          key={i}
          className="sv-row"
          ref={(el) => (rowsRef.current[i] = el)}
        >
          <div className="sv-scroller">
            {Array.from({ length: numCopies }).map((_, j) => (
              <span key={j} className="sv-copy">
                {text}&nbsp;
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ============================================================
   MagicBento — BentoGrid + BentoCard
   ============================================================ */
function useMobile() {
  const [m, setM] = useState(false)
  useEffect(() => {
    const check = () => setM(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return m
}

export function BentoGrid({
  children,
  enableSpotlight = true,
  enableBorderGlow = true,
  enableStars = true,
  enableMagnetism = true,
  clickEffect = true,
  spotlightRadius = 350,
  glowColor = '201, 168, 76',
  className = '',
}) {
  const gridRef = useRef(null)
  const isMobile = useMobile()
  const disabled = isMobile

  useEffect(() => {
    if (disabled || !enableSpotlight || !gridRef.current) return
    const spotlight = document.createElement('div')
    spotlight.className = 'global-spotlight'
    spotlight.style.cssText = `
      position: fixed;
      width: 800px;
      height: 800px;
      border-radius: 50%;
      pointer-events: none;
      background: radial-gradient(circle,
        rgba(${glowColor}, 0.15) 0%,
        rgba(${glowColor}, 0.08) 15%,
        rgba(${glowColor}, 0.04) 25%,
        rgba(${glowColor}, 0.02) 40%,
        transparent 70%);
      z-index: 5;
      opacity: 0;
      transform: translate(-50%, -50%);
      mix-blend-mode: screen;
      transition: opacity 0.3s ease-out;
    `
    document.body.appendChild(spotlight)

    const onMove = (e) => {
      const section = gridRef.current
      if (!section) return
      const rect = section.getBoundingClientRect()
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      const cards = section.querySelectorAll('.magic-bento-card')
      if (!inside) {
        spotlight.style.opacity = 0
        cards.forEach((c) => c.style.setProperty('--glow-intensity', '0'))
        return
      }
      const proximity = spotlightRadius * 0.5
      const fade = spotlightRadius * 0.75
      let minDist = Infinity
      cards.forEach((c) => {
        const cr = c.getBoundingClientRect()
        const cx = cr.left + cr.width / 2
        const cy = cr.top + cr.height / 2
        const d = Math.max(
          0,
          Math.hypot(e.clientX - cx, e.clientY - cy) - Math.max(cr.width, cr.height) / 2
        )
        minDist = Math.min(minDist, d)
        let intensity = 0
        if (d <= proximity) intensity = 1
        else if (d <= fade) intensity = (fade - d) / (fade - proximity)
        const rx = ((e.clientX - cr.left) / cr.width) * 100
        const ry = ((e.clientY - cr.top) / cr.height) * 100
        c.style.setProperty('--glow-x', `${rx}%`)
        c.style.setProperty('--glow-y', `${ry}%`)
        c.style.setProperty('--glow-intensity', intensity.toString())
        c.style.setProperty('--glow-radius', `${spotlightRadius}px`)
      })
      spotlight.style.left = `${e.clientX}px`
      spotlight.style.top = `${e.clientY}px`
      const opacity =
        minDist <= proximity ? 0.8 : minDist <= fade ? ((fade - minDist) / (fade - proximity)) * 0.8 : 0
      spotlight.style.opacity = opacity
    }
    document.addEventListener('mousemove', onMove)
    return () => {
      document.removeEventListener('mousemove', onMove)
      spotlight.remove()
    }
  }, [disabled, enableSpotlight, spotlightRadius, glowColor])

  const ctx = {
    enableBorderGlow,
    enableStars,
    enableMagnetism,
    clickEffect,
    glowColor,
    disabled,
  }

  return (
    <div ref={gridRef} className={`bento-grid ${className}`} data-bento>
      {React.Children.map(children, (c) =>
        React.isValidElement(c) ? React.cloneElement(c, { _bento: ctx }) : c
      )}
    </div>
  )
}

export function BentoCard({
  children,
  className = '',
  style = {},
  span = '',
  _bento = {},
}) {
  const ref = useRef(null)
  const {
    enableBorderGlow = true,
    enableStars = true,
    enableMagnetism = true,
    clickEffect = true,
    glowColor = '201, 168, 76',
    disabled = false,
  } = _bento

  useEffect(() => {
    if (disabled || !ref.current) return
    const el = ref.current

    let raf
    const onMove = (e) => {
      if (!enableMagnetism) return
      const r = el.getBoundingClientRect()
      const x = e.clientX - r.left - r.width / 2
      const y = e.clientY - r.top - r.height / 2
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        el.style.transform = `translate3d(${x * 0.04}px, ${y * 0.04}px, 0)`
      })
    }
    const onLeave = () => {
      cancelAnimationFrame(raf)
      el.style.transform = 'translate3d(0,0,0)'
      el.querySelectorAll('.bento-particle').forEach((p) => p.remove())
    }
    const onEnter = () => {
      if (!enableStars) return
      const r = el.getBoundingClientRect()
      for (let i = 0; i < 10; i++) {
        const p = document.createElement('div')
        p.className = 'bento-particle'
        p.style.cssText = `
          position:absolute;width:4px;height:4px;border-radius:50%;
          background:rgba(${glowColor},1);
          box-shadow:0 0 6px rgba(${glowColor},0.6);
          left:${Math.random() * r.width}px;top:${Math.random() * r.height}px;
          pointer-events:none;z-index:3;opacity:0;transform:scale(0);
          transition:opacity 0.5s, transform 1.5s ease-in-out;
        `
        el.appendChild(p)
        const dx = (Math.random() - 0.5) * 80
        const dy = (Math.random() - 0.5) * 80
        setTimeout(() => {
          p.style.opacity = '1'
          p.style.transform = `translate(${dx}px, ${dy}px) scale(1)`
        }, 50 + i * 60)
        setTimeout(() => (p.style.opacity = '0.2'), 1200 + i * 60)
      }
    }
    const onClick = (e) => {
      if (!clickEffect) return
      const r = el.getBoundingClientRect()
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      const max = Math.max(
        Math.hypot(x, y),
        Math.hypot(x - r.width, y),
        Math.hypot(x, y - r.height),
        Math.hypot(x - r.width, y - r.height)
      )
      const ripple = document.createElement('div')
      ripple.style.cssText = `
        position:absolute;width:${max * 2}px;height:${max * 2}px;
        border-radius:50%;
        background:radial-gradient(circle, rgba(${glowColor},0.4) 0%, rgba(${glowColor},0.2) 30%, transparent 70%);
        left:${x - max}px;top:${y - max}px;
        pointer-events:none;z-index:4;opacity:1;transform:scale(0);
        transition:transform 0.8s ease-out, opacity 0.8s ease-out;
      `
      el.appendChild(ripple)
      requestAnimationFrame(() => {
        ripple.style.transform = 'scale(1)'
        ripple.style.opacity = '0'
      })
      setTimeout(() => ripple.remove(), 800)
    }
    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    el.addEventListener('click', onClick)
    return () => {
      el.removeEventListener('mouseenter', onEnter)
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
      el.removeEventListener('click', onClick)
    }
  }, [disabled, enableMagnetism, enableStars, clickEffect, glowColor])

  return (
    <div
      ref={ref}
      className={`magic-bento-card ${enableBorderGlow ? 'with-glow' : ''} ${className}`}
      style={{
        ...style,
        '--glow-color-rgb': glowColor,
        gridArea: span || undefined,
      }}
    >
      {children}
    </div>
  )
}

/* ============================================================
   ElectricBorder — animated jittery stroke around a card
   ============================================================ */
export function ElectricBorder({
  children,
  color = '#C9A84C',
  speed = 0.8,
  chaos = 0.08,
  thickness = 2,
  borderRadius = 20,
  className = '',
  style = {},
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const rafRef = useRef(0)
  const tRef = useRef(0)
  const lastRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext('2d')

    const rand = (x) => (Math.sin(x * 12.9898) * 43758.5453) % 1
    const noise2D = (x, y) => {
      const i = Math.floor(x),
        j = Math.floor(y)
      const fx = x - i,
        fy = y - j
      const a = rand(i + j * 57),
        b = rand(i + 1 + j * 57)
      const c = rand(i + (j + 1) * 57),
        d = rand(i + 1 + (j + 1) * 57)
      const ux = fx * fx * (3 - 2 * fx),
        uy = fy * fy * (3 - 2 * fy)
      return a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy
    }
    const octNoise = (x, t, seed) => {
      let y = 0,
        amp = chaos,
        freq = 10
      for (let i = 0; i < 8; i++) {
        y += amp * noise2D(freq * x + seed * 100, t * freq * 0.3)
        freq *= 1.6
        amp *= 0.7
      }
      return y
    }
    const cornerPt = (cx, cy, r, sa, al, p) => ({
      x: cx + r * Math.cos(sa + p * al),
      y: cy + r * Math.sin(sa + p * al),
    })
    const rectPt = (t, L, T, W, H, r) => {
      const sW = W - 2 * r,
        sH = H - 2 * r,
        ca = (Math.PI * r) / 2
      const P = 2 * sW + 2 * sH + 4 * ca,
        d = t * P
      let a = 0
      if (d <= a + sW) return { x: L + r + ((d - a) / sW) * sW, y: T }
      a += sW
      if (d <= a + ca)
        return cornerPt(L + W - r, T + r, r, -Math.PI / 2, Math.PI / 2, (d - a) / ca)
      a += ca
      if (d <= a + sH) return { x: L + W, y: T + r + ((d - a) / sH) * sH }
      a += sH
      if (d <= a + ca)
        return cornerPt(L + W - r, T + H - r, r, 0, Math.PI / 2, (d - a) / ca)
      a += ca
      if (d <= a + sW)
        return { x: L + W - r - ((d - a) / sW) * sW, y: T + H }
      a += sW
      if (d <= a + ca)
        return cornerPt(L + r, T + H - r, r, Math.PI / 2, Math.PI / 2, (d - a) / ca)
      a += ca
      if (d <= a + sH)
        return { x: L, y: T + H - r - ((d - a) / sH) * sH }
      a += sH
      return cornerPt(L + r, T + r, r, Math.PI, Math.PI / 2, (d - a) / ca)
    }

    const offset = 60
    let W = 0,
      H = 0
    const resize = () => {
      const rect = container.getBoundingClientRect()
      W = rect.width + offset * 2
      H = rect.height + offset * 2
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = W * dpr
      canvas.height = H * dpr
      canvas.style.width = W + 'px'
      canvas.style.height = H + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)

    const draw = (now) => {
      const dt = (now - lastRef.current) / 1000
      tRef.current += (dt || 0) * speed
      lastRef.current = now
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.strokeStyle = color
      ctx.lineWidth = thickness
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      const L = offset,
        T = offset,
        bW = W - 2 * offset,
        bH = H - 2 * offset
      const r = Math.min(borderRadius, Math.min(bW, bH) / 2)
      const perim = 2 * (bW + bH) + 2 * Math.PI * r
      const N = Math.floor(perim / 2)
      ctx.beginPath()
      for (let i = 0; i <= N; i++) {
        const p = i / N
        const pt = rectPt(p, L, T, bW, bH, r)
        const xn = octNoise(p * 8, tRef.current, 0) * 60
        const yn = octNoise(p * 8, tRef.current, 1) * 60
        const x = pt.x + xn,
          y = pt.y + yn
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.stroke()
      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [color, speed, chaos, thickness, borderRadius])

  return (
    <div
      ref={containerRef}
      className={`electric-border ${className}`}
      style={{ '--eb-color': color, borderRadius, ...style }}
    >
      <div className="eb-canvas-wrap">
        <canvas ref={canvasRef} />
      </div>
      <div className="eb-glow eb-g1" />
      <div className="eb-glow eb-g2" />
      <div className="eb-bg-glow" />
      <div className="eb-content" style={{ borderRadius: 'inherit' }}>
        {children}
      </div>
    </div>
  )
}

/* ============================================================
   ScrollStack — pinned card stack driven by window scroll
   ============================================================ */
export function ScrollStackItem({ children, className = '' }) {
  return <div className={`scroll-stack-card ${className}`}>{children}</div>
}

export function ScrollStack({
  children,
  className = '',
  itemDistance = 80,
  itemScale = 0.03,
  itemStackDistance = 30,
  stackPosition = '25%',
  scaleEndPosition = '10%',
  baseScale = 0.88,
  rotationAmount = 0,
  blurAmount = 2,
}) {
  const scrollerRef = useRef(null)

  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const cards = Array.from(scroller.querySelectorAll('.scroll-stack-card'))
    cards.forEach((c, i) => {
      if (i < cards.length - 1) c.style.marginBottom = itemDistance + 'px'
      c.style.willChange = 'transform, filter'
      c.style.transformOrigin = 'top center'
    })

    const parsePct = (v, h) =>
      typeof v === 'string' && v.includes('%') ? (parseFloat(v) / 100) * h : parseFloat(v)

    let raf
    const update = () => {
      const containerHeight = window.innerHeight
      const scrollTop = window.scrollY
      const stackPx = parsePct(stackPosition, containerHeight)
      const endPx = parsePct(scaleEndPosition, containerHeight)
      const endEl = scroller.querySelector('.scroll-stack-end')
      const endTop = endEl ? endEl.getBoundingClientRect().top + window.scrollY : 0

      cards.forEach((card, i) => {
        const cardTop = card.getBoundingClientRect().top + window.scrollY
        const triggerStart = cardTop - stackPx - itemStackDistance * i
        const triggerEnd = cardTop - endPx
        const pinStart = triggerStart
        const pinEnd = endTop - containerHeight / 2

        const prog =
          scrollTop < triggerStart
            ? 0
            : scrollTop > triggerEnd
              ? 1
              : (scrollTop - triggerStart) / (triggerEnd - triggerStart)
        const targetScale = baseScale + i * itemScale
        const scale = 1 - prog * (1 - targetScale)
        const rot = rotationAmount ? i * rotationAmount * prog : 0

        let blur = 0
        if (blurAmount) {
          let top = 0
          for (let j = 0; j < cards.length; j++) {
            const jTop = cards[j].getBoundingClientRect().top + window.scrollY
            if (scrollTop >= jTop - stackPx - itemStackDistance * j) top = j
          }
          if (i < top) blur = (top - i) * blurAmount
        }

        let ty = 0
        const pinned = scrollTop >= pinStart && scrollTop <= pinEnd
        if (pinned) ty = scrollTop - cardTop + stackPx + itemStackDistance * i
        else if (scrollTop > pinEnd) ty = pinEnd - cardTop + stackPx + itemStackDistance * i

        card.style.transform = `translate3d(0, ${ty}px, 0) scale(${scale}) rotate(${rot}deg)`
        card.style.filter = blur > 0 ? `blur(${blur}px)` : ''
      })
    }

    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [
    itemDistance,
    itemScale,
    itemStackDistance,
    stackPosition,
    scaleEndPosition,
    baseScale,
    rotationAmount,
    blurAmount,
  ])

  return (
    <div className={`scroll-stack-scroller ${className}`} ref={scrollerRef}>
      <div className="scroll-stack-inner">
        {children}
        <div className="scroll-stack-end" />
      </div>
    </div>
  )
}
