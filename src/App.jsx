import { useState, useEffect } from 'react'
import { Hero, BentoSection, ReadingSection, CareerSection, EducationSection, ProjectsSection, ConnectSection, Dock } from './components/sections'

export default function App() {
  const [theme, setTheme] = useState('dark')
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <>
      <Hero />
      <BentoSection />
      <ReadingSection />
      <CareerSection />
      <EducationSection />
      <ProjectsSection />
      <ConnectSection />
      {/* Email CTA: copy `akashkanagarajah@gmail.com` in Connect (not mailto). Image path map: `src/constants/imageAssets.js`. */}
      <footer>© 2026 Akash Kanagarajah · Built with intention</footer>
      <Dock theme={theme} setTheme={setTheme} />
    </>
  )
}
