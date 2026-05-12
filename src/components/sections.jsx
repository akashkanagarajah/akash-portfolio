import React, { useEffect, useRef, useState } from 'react'
import {
  BorderGlow,
  ScrollReveal,
  GradientText,
  PixelTransition,
  BentoGrid,
  BentoCard,
  ScrollStack,
  ScrollStackItem,
} from './animations'

/* ---------- Floating Dock (preserved + theme toggle) ---------- */
export function Dock({ theme, setTheme }) {
  const Btn = ({ href, title, target, onClick, children }) => (
    <a
      className="dock-btn"
      href={href}
      title={title}
      target={target}
      rel={target ? 'noopener noreferrer' : undefined}
      onClick={onClick}
    >
      {children}
    </a>
  )
  return (
    <nav className="dock" aria-label="Floating dock">
      <Btn href="#home" title="Home">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11.5L12 4l9 7.5"/><path d="M5 10v10h14V10"/></svg>
      </Btn>
      <Btn href="#resume" title="Resume / CV">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>
      </Btn>
      <Btn href="https://github.com/" target="_blank" title="GitHub">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.12-1.47-1.12-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.55 9.55 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z"/></svg>
      </Btn>
      <Btn href="https://linkedin.com/" target="_blank" title="LinkedIn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5a2.5 2.5 0 1 1 .02 5 2.5 2.5 0 0 1-.02-5zM3 9h4v12H3V9zm7 0h3.8v1.7h.1c.5-.9 1.8-1.9 3.7-1.9 4 0 4.7 2.6 4.7 6V21h-4v-5.4c0-1.3 0-3-1.9-3s-2.1 1.4-2.1 2.9V21H10V9z"/></svg>
      </Btn>
      <Btn href="https://x.com/" target="_blank" title="X / Twitter">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2H21l-6.52 7.45L22 22h-6.84l-4.79-6.27L4.8 22H2l7-8L2 2h6.96l4.34 5.74L18.244 2zm-1.2 18h1.84L7.04 4H5.12l11.92 16z"/></svg>
      </Btn>
      <Btn href="https://youtube.com/" target="_blank" title="YouTube">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M23 7.5s-.2-1.6-.9-2.3c-.8-.9-1.7-.9-2.1-1C16.9 4 12 4 12 4s-4.9 0-8 .2c-.4 0-1.3 0-2.1 1C1.2 5.9 1 7.5 1 7.5S.8 9.4.8 11.3v1.4c0 1.9.2 3.8.2 3.8s.2 1.6.9 2.3c.8.9 1.9.8 2.4.9 1.7.2 7.7.2 7.7.2s4.9 0 8-.2c.4 0 1.3 0 2.1-1 .7-.7.9-2.3.9-2.3s.2-1.9.2-3.8v-1.4c0-1.9-.2-3.8-.2-3.8zM10 15V9l5.2 3-5.2 3z"/></svg>
      </Btn>
      <div className="dock-sep" />
      <button
        className="dock-btn dock-theme"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        title="Toggle theme"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
        )}
      </button>
    </nav>
  )
}

/* ---------- Placeholder photo (stripey monospace) ---------- */
function ImgPlaceholder({ label, ratio = '100%', className = '', style = {} }) {
  return (
    <div className={`img-placeholder ${className}`} style={{ paddingTop: ratio, ...style }}>
      <div className="img-placeholder__stripes" />
      <div className="img-placeholder__label">{label}</div>
    </div>
  )
}

/* ---------- Section 1: Hero ---------- */
export function Hero() {
  return (
    <section className="hero" id="home">
      <div className="hero-left">
        <p className="hero-label">Computer Engineer · Toronto, ON</p>
        <h1 className="hero-heading">
          <span className="hero-greet">Hi, meet —</span>
          <span className="hero-name">
            <GradientText
              colors={['#C9A84C', '#f0c060', '#C9A84C', '#e8a820', '#C9A84C']}
              animationSpeed={6}
              yoyo={true}
            >
              Akash Kanagarajah
            </GradientText>
          </span>
        </h1>
        <ul className="hero-interests">
          <li>Engineering</li>
          <li>Gym &amp; Sport</li>
          <li>Building Things</li>
        </ul>
      </div>

      <div className="hero-right">
        <div className="hero-photo-frame">
          <PixelTransition
            firstContent={
              <ImgPlaceholder label="akash-main.jpg" ratio="133%" className="hero-photo-img" />
            }
            secondContent={
              <div style={{ position: 'absolute', inset: 0 }}>
                <ImgPlaceholder label="akash-alt.jpg" ratio="133%" className="hero-photo-img alt" />
              </div>
            }
            gridSize={10}
            pixelColor="#C9A84C"
            animationStepDuration={0.4}
            once={false}
            aspectRatio="133%"
            className="hero-pixel"
          />
        </div>
        <p className="hero-hint">HOVER · DISCOVER</p>
      </div>
    </section>
  )
}

/* ---------- Section 2: Bento ---------- */
function LiveTime() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const fmt24 = (tz) =>
    new Intl.DateTimeFormat('en-CA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: tz,
    }).format(now)

  const torontoTime = fmt24('America/Toronto')
  const torontoAbbr =
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Toronto',
      timeZoneName: 'short',
    })
      .formatToParts(now)
      .find((p) => p.type === 'timeZoneName')?.value || 'ET'

  const visitorTz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const visitorTime = fmt24(visitorTz)
  const visitorAbbr =
    new Intl.DateTimeFormat('en-US', {
      timeZone: visitorTz,
      timeZoneName: 'short',
    })
      .formatToParts(now)
      .find((p) => p.type === 'timeZoneName')?.value || visitorTz

  return (
    <div className="time-widget">
      <div className="time-block">
        <div className="time-label">
          <span className="live-dot" /> MY TIME
          <span className="time-mode">24H</span>
        </div>
        <div className="time-value">{torontoTime}</div>
        <div className="time-tz">{torontoAbbr} · Toronto</div>
      </div>
      <div className="time-divider" />
      <div className="time-block">
        <div className="time-label">YOUR TIME</div>
        <div className="time-value">{visitorTime}</div>
        <div className="time-tz">{visitorAbbr}</div>
      </div>
    </div>
  )
}

/* ---------- About Pager (3 paginated pages with dots) ---------- */
const ABOUT_PAGES = [
  {
    label: '01 · BACKGROUND',
    body: (
      <>
        <p>
          Computer Engineering graduate (B.Eng., 2024) with hands-on experience in <strong>control-system software</strong>,
          hardware qualification, and production-line automation.
        </p>
        <p>
          I like the slice of engineering where firmware meets the physical world — diagnostics, instrumentation, the
          stuff that has to actually keep working at 3am.
        </p>
      </>
    ),
  },
  {
    label: '02 · NUCLEAR',
    body: (
      <>
        <p>
          My engineering year at <a className="bio-link" href="https://www.opg.com/" target="_blank" rel="noreferrer">OPG Pickering</a> Nuclear
          Generating Station gave me deep exposure to SCADA systems, Python-driven diagnostics, and safety-critical
          environments.
        </p>
        <p>
          Backed by an <strong>OSCA nuclear site security clearance</strong> (CSIS &amp; OPP verified, Pickering &amp;
          Darlington NGS).
        </p>
      </>
    ),
  },
  {
    label: '03 · INDUSTRY & SIDE',
    body: (
      <>
        <p>
          I've also worked in electrical assembly at <strong>ABB</strong>, and automotive manufacturing at
          <strong> Stellantis</strong> and <strong>Honda</strong> — the floor teaches you respect for tolerance and takt.
        </p>
        <p>
          On the side, I co-founded <a className="bio-link" href="#" target="_blank" rel="noreferrer">★ PartyNI</a> — an event vendor
          booking marketplace, in active development.
        </p>
      </>
    ),
  },
]

function AboutPager() {
  const [page, setPage] = useState(0)
  const total = ABOUT_PAGES.length
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused) return
    const id = setInterval(() => setPage((p) => (p + 1) % total), 7000)
    return () => clearInterval(id)
  }, [paused, total])

  const current = ABOUT_PAGES[page]
  return (
    <div className="about-pager" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="about-pager-head">
        <div className="bento-label">WHO I AM</div>
        <div className="about-pager-page">{current.label}</div>
      </div>
      <div className="about-pager-stage">
        {ABOUT_PAGES.map((p, i) => (
          <div
            key={i}
            className={`about-pager-slide ${i === page ? 'is-active' : ''}`}
            aria-hidden={i !== page}
          >
            <div className="bento-bio">{p.body}</div>
          </div>
        ))}
      </div>
      <div className="about-pager-controls">
        <button
          className="about-arrow"
          aria-label="Previous"
          onClick={() => {
            setPaused(true)
            setPage((p) => (p - 1 + total) % total)
          }}
        >
          ‹
        </button>
        <div className="about-dots" role="tablist">
          {ABOUT_PAGES.map((_, i) => (
            <button
              key={i}
              className={`about-dot ${i === page ? 'is-active' : ''}`}
              aria-label={`Page ${i + 1}`}
              aria-selected={i === page}
              onClick={() => {
                setPaused(true)
                setPage(i)
              }}
            />
          ))}
        </div>
        <button
          className="about-arrow"
          aria-label="Next"
          onClick={() => {
            setPaused(true)
            setPage((p) => (p + 1) % total)
          }}
        >
          ›
        </button>
      </div>
    </div>
  )
}

/* ---------- Skills Panel: CSS marquee → click to reveal pills ---------- */
const SKILL_ROW_A = [
  'Python', 'VHDL', 'C / C++', 'Shell / Bash', 'SCADA', 'FPGA (Xilinx)', 'SQL', 'Git',
]
const SKILL_ROW_B = [
  'Linux', 'AutoCAD', 'DCC / PACE', 'Serial Comms', 'CSA N290', 'Nuclear Safety', 'Embedded', 'Digital Logic',
]
const ALL_SKILLS = [...SKILL_ROW_A, ...SKILL_ROW_B]

function SkillsPanel() {
  const [revealed, setRevealed] = useState(false)
  return (
    <div className={`skills-panel ${revealed ? 'is-revealed' : ''}`}>
      <div className="skills-head">
        <div className="bento-label">CURRENT STACK &amp; SKILLS</div>
        <button
          className="skills-toggle"
          onClick={() => setRevealed((v) => !v)}
          aria-pressed={revealed}
        >
          {revealed ? 'Show marquee' : 'Show all →'}
        </button>
      </div>
      {!revealed && (
        <div
          className="skills-marquee-css"
          onClick={() => setRevealed(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setRevealed(true)
          }}
        >
          <div className="skills-track skills-track-a">
            {[...SKILL_ROW_A, ...SKILL_ROW_A].map((s, i) => (
              <span key={`a-${i}`} className="skill-chip">
                {s}
              </span>
            ))}
          </div>
          <div className="skills-track skills-track-b">
            {[...SKILL_ROW_B, ...SKILL_ROW_B].map((s, i) => (
              <span key={`b-${i}`} className="skill-chip">
                {s}
              </span>
            ))}
          </div>
          <div className="skills-tap-hint">TAP TO REVEAL</div>
        </div>
      )}
      {revealed && (
        <div className="skills-pills">
          {ALL_SKILLS.map((s, i) => (
            <span key={i} className="pill skill-pill" style={{ animationDelay: `${i * 30}ms` }}>
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function BentoSection() {
  return (
    <section className="bento-section" id="about">
      <div className="section-heading">
        <span className="section-label">About</span>
        <h2 className="section-title">A bit about me.</h2>
      </div>

      <BentoGrid
        glowColor="201, 168, 76"
        enableStars={true}
        enableSpotlight={true}
        enableBorderGlow={true}
        enableMagnetism={true}
        clickEffect={true}
        spotlightRadius={350}
      >
        <BentoCard className="bento-about" span="about">
          <AboutPager />
        </BentoCard>

        <BentoCard className="bento-time" span="time">
          <LiveTime />
        </BentoCard>

        <BentoCard className="bento-skills" span="skills">
          <SkillsPanel />
        </BentoCard>

        <BentoCard className="bento-now" span="now">
          <div className="bento-label">CURRENTLY BUILDING</div>
          <div className="now-title">PartyNI</div>
          <p className="now-desc">
            An event vendor booking marketplace — connecting customers with vendors for any occasion.
            Currently in Sprint 3: messaging system, notifications, refund flows.
          </p>
          <div className="bento-divider" />
          <div className="bento-label">CURRENTLY LEARNING</div>
          <p className="now-desc">Agentic workflow design &amp; AI-assisted development pipelines.</p>
        </BentoCard>

        <BentoCard className="bento-bad" span="bad">
          <div className="bento-label">I ♥ BADMINTON</div>
          <p className="bad-desc">
            When I need to release stress, I play sports. Badminton is my go-to — TMU varsity team,
            two-time ROPSA champion, OFSA appearances. Also coached youth and adult athletes with the
            City of Brampton.
          </p>
          <div className="bad-thumb">
            <ImgPlaceholder label="badminton.jpg" ratio="62%" />
          </div>
        </BentoCard>
      </BentoGrid>
    </section>
  )
}

/* ---------- Resume entry (career / education) ---------- */
function ResumeEntry({ title, company, dates, tags = [], bullets = [], children }) {
  return (
    <BorderGlow
      glowColor="43 30 10"
      colors={['#C9A84C', '#e8c878', '#C9A84C']}
      borderRadius={16}
      glowRadius={35}
      glowIntensity={0.8}
      animated={false}
      backgroundColor="var(--bg-card)"
      className="resume-entry"
    >
      <div className="resume-row">
        <h3 className="resume-title">{title}</h3>
        <span className="resume-date">{dates}</span>
      </div>
      <div className="resume-company">{company}</div>
      {tags.length > 0 && (
        <div className="resume-tags">
          {tags.map((t, i) => (
            <span key={i} className="pill">
              {t}
            </span>
          ))}
        </div>
      )}
      {bullets.length > 0 && (
        <ul className="resume-bullets">
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
      {children}
    </BorderGlow>
  )
}

/* ---------- Section 3: Career ---------- */
export function CareerSection() {
  return (
    <section className="resume-section" id="resume">
      <div className="resume-grid">
        <div className="resume-side">
          <ScrollReveal as="span" baseOpacity={0} enableBlur={true} baseRotation={3} blurStrength={8} className="resume-side-label">
            Experience
          </ScrollReveal>
        </div>
        <div className="resume-main">
          <ScrollReveal as="h2" baseOpacity={0} enableBlur={true} baseRotation={3} blurStrength={8} className="section-title">
            Career
          </ScrollReveal>
          <ScrollReveal as="p" baseOpacity={0} enableBlur={true} baseRotation={3} blurStrength={8} className="section-sub">
            From nuclear control systems to assembly floors — the places that taught me to ship safe, working software.
          </ScrollReveal>

          <div className="resume-entries">
            <ResumeEntry
              title="Control Computers Intern — Professional Engineering Year"
              company="Ontario Power Generation · Pickering NGS"
              dates="May 2022 – Apr 2023"
              tags={['Python', 'SCADA', 'DCC/PACE', 'Serial Comms']}
              bullets={[
                'Developed a Python diagnostic tool to validate DES serial data packet integrity across SCADA streams from operating reactor units.',
                'Built automation scripts that streamlined system validation workflows, reducing manual testing time for control-computer updates.',
                'Supported rollout of safety-critical software changes across 4 DCC control computers under CSA N290.14-15.',
                'Held OSCA nuclear site security clearance (CSIS & OPP verified, Pickering & Darlington NGS).',
              ]}
            />
            <ResumeEntry
              title="Electrical Assembly Technician Intern"
              company="ABB Ltd."
              dates="Jun 2019 – Aug 2019"
              tags={['Circuit Breaker Retrofit', 'Soldering', 'Multimeters']}
              bullets={[
                'Retrofitted circuit breakers and assembled control panels on the production floor.',
                'Performed continuity, insulation and functional checks before unit handoff.',
              ]}
            />
            <ResumeEntry
              title="Automotive Production Technician — Engine Zone"
              company="Stellantis NV (FCA)"
              dates="Sep 2021 – Apr 2022"
              tags={['Assembly', 'Quality', 'Lean']}
              bullets={[
                'Worked the engine-zone line, hitting takt time without slipping on torque-spec and quality gates.',
              ]}
            />
            <ResumeEntry
              title="Student Assembler — Quality Zone"
              company="Honda of Canada Mfg."
              dates="May 2021 – Aug 2021"
              tags={['Assembly', 'Quality']}
              bullets={[
                'Final-quality station: visual + functional inspection of trim, electrical, and fit/finish before vehicles left the line.',
              ]}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- Section 4: Education ---------- */
function EduEntry({ title, sub, dates, courses = [] }) {
  const [open, setOpen] = useState(false)
  const contentRef = useRef(null)
  return (
    <BorderGlow
      glowColor="43 30 10"
      colors={['#C9A84C', '#e8c878', '#C9A84C']}
      borderRadius={16}
      glowRadius={35}
      glowIntensity={0.8}
      animated={false}
      backgroundColor="var(--bg-card)"
      className="resume-entry"
    >
      <div className="resume-row">
        <h3 className="resume-title">{title}</h3>
        <span className="resume-date">{dates}</span>
      </div>
      <div className="resume-company">{sub}</div>
      {courses.length > 0 && (
        <>
          <button
            className="course-btn"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            <span>{open ? 'Hide course summary' : 'View course summary'}</span>
            <span className={`course-chev ${open ? 'open' : ''}`}>↓</span>
          </button>
          <div
            className="course-panel"
            ref={contentRef}
            style={{
              maxHeight: open ? `${contentRef.current?.scrollHeight || 600}px` : '0px',
            }}
          >
            <div className="course-grid">
              {courses.map((c, i) => (
                <div className="course-item" key={i}>
                  <span className="course-bullet">·</span> {c}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </BorderGlow>
  )
}

export function EducationSection() {
  return (
    <section className="resume-section" id="education">
      <div className="resume-grid">
        <div className="resume-side">
          <ScrollReveal as="span" baseOpacity={0} enableBlur={true} baseRotation={3} blurStrength={8} className="resume-side-label">
            Education
          </ScrollReveal>
        </div>
        <div className="resume-main">
          <ScrollReveal as="h2" baseOpacity={0} enableBlur={true} baseRotation={3} blurStrength={8} className="section-title">
            Background
          </ScrollReveal>
          <ScrollReveal as="p" baseOpacity={0} enableBlur={true} baseRotation={3} blurStrength={8} className="section-sub">
            Where I picked up the fundamentals.
          </ScrollReveal>

          <div className="resume-entries">
            <EduEntry
              title="Toronto Metropolitan University"
              sub="Bachelor of Engineering — Computer Engineering (B.Eng.)"
              dates="2019 – 2024"
              courses={[
                'Computer Architecture',
                'Embedded Systems',
                'Digital Logic Design',
                'VLSI Design',
                'Operating Systems',
                'Computer Networks',
                'Control Systems',
                'Software Engineering',
                'Algorithms & Data Structures',
                'Engineering Economics',
              ]}
            />
            <EduEntry
              title="Advanced Placement High School"
              sub="AP Honours Graduate"
              dates="2016 – 2019"
              courses={['AP Calculus', 'AP Physics', 'AP Chemistry', 'AP Computer Science', 'AP English']}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- Section 5: Projects ---------- */
const PROJECTS = [
  {
    title: 'PartyNI — Event Vendor Marketplace',
    dates: '2024 – Present · Co-Founder',
    desc: 'Co-founding and actively developing PartyNI, a marketplace connecting customers with vendors for events. Active sprints: messaging, vendor onboarding, payment processing.',
    tags: ['Full-Stack', 'Marketplace', 'Product Development', 'Co-Founder'],
  },
  {
    title: 'SCADA Data Integrity Diagnostic Tool',
    dates: 'May 2022 – April 2023',
    desc: 'Python diagnostic tool at OPG Pickering NGS to validate DES serial data packet integrity, parsing hexadecimal sequence numbers to detect corruption and transmission errors in SCADA data streams from operating reactor units.',
    tags: ['Python', 'SCADA', 'Serial Comms', 'Data Validation'],
  },
  {
    title: 'Control Computer Validation Automation',
    dates: 'May 2022 – April 2023',
    desc: 'Python automation that streamlined system validation workflows and reduced manual testing time for control-computer updates in a safety-critical nuclear environment. Rollout across 4 DCC control computers.',
    tags: ['Python', 'Automation', 'DCC/PACE', 'CSA N290.14-15'],
  },
  {
    title: 'FPGA VGA Pong Game',
    dates: 'Coursework Project',
    desc: 'Pong on an FPGA in VHDL, driving VGA output for real-time graphics rendering. Built end-to-end from clock dividers to sprite rasterization.',
    tags: ['VHDL', 'FPGA (Xilinx)', 'VGA Display', 'Digital Logic'],
  },
  {
    title: 'RISC CPU on FPGA',
    dates: 'Coursework Project',
    desc: 'A custom RISC processor synthesized on FPGA — full instruction fetch, decode, execute and memory stages. Designed the ISA, datapath and control logic from the ground up.',
    tags: ['VHDL', 'FPGA (Xilinx)', 'RISC Architecture', 'Computer Architecture'],
  },
]

function ProjectStackCard({ p, i, total }) {
  return (
    <BorderGlow
      glowColor="43 30 10"
      colors={['#C9A84C', '#e8c878', '#C9A84C']}
      borderRadius={20}
      glowRadius={45}
      glowIntensity={0.9}
      animated={false}
      backgroundColor="var(--bg-card)"
      className="project-stack-card"
    >
      <div className="psc-meta">
        <span className="psc-num">
          {String(i + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
        <span className="psc-date">{p.dates}</span>
      </div>
      <h3 className="psc-title">{p.title}</h3>
      <p className="psc-desc">{p.desc}</p>
      <div className="psc-tags">
        {p.tags.map((t, j) => (
          <span key={j} className="pill">
            {t}
          </span>
        ))}
      </div>
    </BorderGlow>
  )
}

export function ProjectsSection() {
  return (
    <section className="projects-section" id="projects">
      <div className="section-heading center">
        <ScrollReveal as="span" baseOpacity={0} enableBlur={true} baseRotation={3} blurStrength={8} className="section-label">
          My Work
        </ScrollReveal>
        <ScrollReveal as="h2" baseOpacity={0} enableBlur={true} baseRotation={3} blurStrength={8} className="section-title">
          Projects
        </ScrollReveal>
        <ScrollReveal as="p" baseOpacity={0} enableBlur={true} baseRotation={3} blurStrength={8} className="section-sub">
          Scroll through — each card stacks on the next.
        </ScrollReveal>
      </div>
      <ScrollStack
        className="projects-stack"
        itemDistance={120}
        itemScale={0.025}
        itemStackDistance={28}
        stackPosition="22%"
        scaleEndPosition="12%"
        baseScale={0.86}
        blurAmount={1.5}
      >
        {PROJECTS.map((p, i) => (
          <ScrollStackItem key={i}>
            <ProjectStackCard p={p} i={i} total={PROJECTS.length} />
          </ScrollStackItem>
        ))}
      </ScrollStack>
    </section>
  )
}

/* ---------- Section 6: Connect ---------- */
function ConnectCard({ href, label, sub, icon }) {
  return (
    <a className="connect-link" href={href} target="_blank" rel="noreferrer">
      <BorderGlow
        glowColor="43 30 10"
        colors={['#C9A84C', '#e8c878', '#C9A84C']}
        borderRadius={16}
        glowRadius={35}
        glowIntensity={0.8}
        animated={false}
        backgroundColor="var(--bg-card)"
        className="connect-card"
      >
        <div className="connect-icon">{icon}</div>
        <div>
          <div className="connect-name">{label}</div>
          <div className="connect-sub">{sub}</div>
        </div>
      </BorderGlow>
    </a>
  )
}

export function ConnectSection() {
  return (
    <section className="connect-section" id="connect">
      <div className="section-heading center">
        <h2 className="section-title">Connect</h2>
        <p className="section-sub">Always open to a conversation about engineering, opportunities, or badminton.</p>
      </div>
      <div className="connect-cards">
        <ConnectCard
          href="https://linkedin.com/"
          label="LinkedIn"
          sub="Professional profile"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5a2.5 2.5 0 1 1 .02 5 2.5 2.5 0 0 1-.02-5zM3 9h4v12H3V9zm7 0h3.8v1.7h.1c.5-.9 1.8-1.9 3.7-1.9 4 0 4.7 2.6 4.7 6V21h-4v-5.4c0-1.3 0-3-1.9-3s-2.1 1.4-2.1 2.9V21H10V9z"/></svg>
          }
        />
        <ConnectCard
          href="https://github.com/"
          label="GitHub"
          sub="Code & projects"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.12-1.47-1.12-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.55 9.55 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z"/></svg>
          }
        />
        <ConnectCard
          href="mailto:hello@example.com"
          label="Email"
          sub="Send a message"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>
          }
        />
      </div>
    </section>
  )
}
