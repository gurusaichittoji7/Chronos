import { useEffect, useState } from 'react'
import { getAllRuns, deleteRun } from '../api'

const statusDot = {
  running: '#22c55e',
  success: '#22c55e',
  failed: '#f43f5e',
  replayed: '#a855f7',
}

const frameworkColors = {
  langchain: { bg: '#eff6ff', text: '#3b82f6', darkBg: '#0f1e3d', darkText: '#60a5fa' },
  langgraph: { bg: '#faf5ff', text: '#a855f7', darkBg: '#160d2e', darkText: '#c084fc' },
}

export default function RunsList({ selectedRunId, onSelectRun, darkMode, onToggleDark }) {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchRuns = async () => {
    try {
      const res = await getAllRuns()
      setRuns(res.data)
    } catch (err) {
      console.error('Failed to fetch runs', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRuns()
    const interval = setInterval(fetchRuns, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleDelete = async (e, runId) => {
    e.stopPropagation()
    try {
      await deleteRun(runId)
      setRuns((prev) => prev.filter((r) => r.id !== runId))
    } catch (err) {
      console.error('Failed to delete run', err)
    }
  }

  const fw = (run) => frameworkColors[run.framework] || frameworkColors.langchain

  return (
    <div className="w-72 min-h-screen flex flex-col relative z-10 border-r"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>

      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--border)' }}>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xl">🕰️</span>
            <h1 className="text-lg font-bold tracking-tight"
              style={{ color: 'var(--text-primary)' }}>Chronos</h1>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Agent Flight Recorder
          </p>
        </div>

        {/* Day/Night Toggle */}
        <button
          onClick={onToggleDark}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>

      {/* Runs */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1 px-1"
          style={{ color: 'var(--text-muted)' }}>
          Runs
        </p>

        {loading && (
          <p className="text-sm px-1" style={{ color: 'var(--text-muted)' }}>
            Loading runs...
          </p>
        )}

        {!loading && runs.length === 0 && (
          <p className="text-sm px-1" style={{ color: 'var(--text-muted)' }}>
            No runs yet. Start your demo agent.
          </p>
        )}

        {runs.map((run) => (
          <div
            key={run.id}
            onClick={() => onSelectRun(run.id)}
            className="p-3 rounded-xl cursor-pointer border transition-all group"
            style={{
              background: selectedRunId === run.id ? 'var(--accent-soft)' : 'var(--bg-card)',
              borderColor: selectedRunId === run.id ? 'var(--accent)' : 'var(--border)',
              boxShadow: selectedRunId === run.id ? 'var(--shadow)' : 'none',
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                #{run.id}
              </span>
              <div className="flex items-center gap-2">
                {run.status === 'running' ? (
                  <span className="text-xs font-semibold flex items-center gap-1"
                    style={{ color: '#22c55e' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                    live
                  </span>
                ) : (
                  <span className="w-2 h-2 rounded-full inline-block"
                    style={{ background: statusDot[run.status] || '#94a3b8' }} />
                )}
                <button
                  onClick={(e) => handleDelete(e, run.id)}
                  className="text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400"
                  style={{ color: 'var(--text-muted)' }}
                >
                  ✕
                </button>
              </div>
            </div>

            <p className="text-sm font-semibold truncate mb-2"
              style={{ color: 'var(--text-primary)' }}>
              {run.name}
            </p>

            <div className="flex items-center justify-between">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: darkMode ? fw(run).darkBg : fw(run).bg,
                  color: darkMode ? fw(run).darkText : fw(run).text,
                }}>
                {run.framework}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {run.total_tokens > 0 ? `${run.total_tokens} tokens` : ''}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t text-center" style={{ borderColor: 'var(--border)' }}>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Auto-refreshes every 5s
        </p>
      </div>
    </div>
  )
}