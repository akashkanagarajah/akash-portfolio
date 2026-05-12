import { useState, useEffect } from 'react'
import { Hero, BentoSection, CareerSection, EducationSection, ProjectsSection, ConnectSection, Dock } from './components/sections'

export default function App() {
  const [theme, setTheme] = useState('dark')
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <>
      <Hero />
      <BentoSection />
      <CareerSection />
      <EducationSection />
      <ProjectsSection />
      <ConnectSection />
      <footer>© 2026 Akash Kanagarajah · Built with intention</footer>
      <Dock theme={theme} setTheme={setTheme} />
    </>
  )
}
