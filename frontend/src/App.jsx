import { useState, useEffect } from 'react'
import RunsList from './components/RunsList'
import GraphView from './components/GraphView'
import StepPanel from './components/StepPanel'

export default function App() {
  const [selectedRunId, setSelectedRunId] = useState(null)
  const [selectedStep, setSelectedStep] = useState(null)
  const [darkMode, setDarkMode] = useState(true)

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const handleSelectRun = (runId) => {
    setSelectedRunId(runId)
    setSelectedStep(null)
  }

  const handleSelectStep = (step) => {
    setSelectedStep(step)
  }

  const handleReplaySuccess = () => {
    const current = selectedRunId
    const currentStep = selectedStep
    setSelectedRunId(null)
    setTimeout(() => {
      setSelectedRunId(current)
      setSelectedStep(currentStep)
    }, 100)
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden relative"
      style={{ background: 'var(--bg-primary)' }}>

      {/* Star background (dark mode only) */}
      <div className="stars" />

      {/* Left — Runs Sidebar */}
      <RunsList
        selectedRunId={selectedRunId}
        onSelectRun={handleSelectRun}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(!darkMode)}
      />

      {/* Center — Graph */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">

        {/* Top bar */}
        <div className="h-12 flex items-center px-4 gap-3 border-b"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {selectedRunId ? `Viewing Run #${selectedRunId}` : 'No run selected'}
          </span>
          {selectedRunId && (
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              Click any node to inspect
            </span>
          )}
        </div>

        {/* Graph */}
        <GraphView
          runId={selectedRunId}
          onSelectStep={handleSelectStep}
          darkMode={darkMode}
        />
      </div>

      {/* Right — Step Panel */}
      <StepPanel
        step={selectedStep}
        runId={selectedRunId}
        onReplaySuccess={handleReplaySuccess}
        darkMode={darkMode}
      />
    </div>
  )
}
