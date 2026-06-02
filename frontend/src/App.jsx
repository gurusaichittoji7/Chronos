import { useState } from 'react'
import RunsList from './components/RunsList'
import GraphView from './components/GraphView'
import StepPanel from './components/StepPanel'

export default function App() {
  const [selectedRunId, setSelectedRunId] = useState(null)
  const [selectedStep, setSelectedStep] = useState(null)

  const handleSelectRun = (runId) => {
    setSelectedRunId(runId)
    setSelectedStep(null)
  }

  const handleSelectStep = (step) => {
    setSelectedStep(step)
  }

  const handleReplaySuccess = () => {
  const current = selectedRunId
  setSelectedRunId(null)
  setTimeout(() => setSelectedRunId(current), 100)
  setSelectedStep(null)
}

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0f1117]">

      {/* Left — Runs Sidebar */}
      <RunsList
        selectedRunId={selectedRunId}
        onSelectRun={handleSelectRun}
      />

      {/* Center — Graph */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="h-12 bg-[#13151f] border-b border-[#2a2d3e] flex items-center px-4 gap-3">
          <span className="text-sm text-slate-400">
            {selectedRunId
              ? `Viewing Run #${selectedRunId}`
              : 'No run selected'}
          </span>
          {selectedRunId && (
            <span className="text-xs bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded-full">
              Click any node to inspect
            </span>
          )}
        </div>

        {/* Graph */}
        <GraphView
          runId={selectedRunId}
          onSelectStep={handleSelectStep}
        />
      </div>

      {/* Right — Step Panel */}
      <StepPanel
        step={selectedStep}
        runId={selectedRunId}
        onReplaySuccess={handleReplaySuccess}
      />

    </div>
  )
}
