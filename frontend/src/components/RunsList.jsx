import { useEffect, useState } from 'react'
import { getAllRuns, deleteRun } from '../api'

const statusColors = {
  running: 'bg-yellow-500',
  success: 'bg-green-500',
  failed: 'bg-red-500',
  replayed: 'bg-purple-500',
}

const frameworkBadge = {
  langchain: 'bg-blue-900 text-blue-300',
  langgraph: 'bg-indigo-900 text-indigo-300',
}

export default function RunsList({ selectedRunId, onSelectRun }) {
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

  return (
    <div className="w-72 min-h-screen bg-[#13151f] border-r border-[#2a2d3e] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#2a2d3e]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🕰️</span>
          <h1 className="text-lg font-bold text-white tracking-tight">Chronos</h1>
        </div>
        <p className="text-xs text-slate-500">Agent Flight Recorder</p>
      </div>

      {/* Runs */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1 px-1">
          Runs
        </p>

        {loading && (
          <p className="text-sm text-slate-500 px-1">Loading runs...</p>
        )}

        {!loading && runs.length === 0 && (
          <p className="text-sm text-slate-500 px-1">
            No runs yet. Start your demo agent.
          </p>
        )}

        {runs.map((run) => (
          <div
            key={run.id}
            onClick={() => onSelectRun(run.id)}
            className={`p-3 rounded-lg cursor-pointer border transition-all group
              ${selectedRunId === run.id
                ? 'bg-[#1e2130] border-indigo-500'
                : 'bg-[#1a1d27] border-transparent hover:border-[#3b4058]'
              }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400 font-mono">#{run.id}</span>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${statusColors[run.status] || 'bg-slate-500'}`}
                />
                <button
                  onClick={(e) => handleDelete(e, run.id)}
                  className="text-slate-600 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
            </div>

            <p className="text-sm text-white font-medium truncate mb-2">
              {run.name}
            </p>

            <div className="flex items-center justify-between">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${frameworkBadge[run.framework] || 'bg-slate-800 text-slate-400'}`}
              >
                {run.framework}
              </span>
              <span className="text-xs text-slate-500">
                {run.total_tokens > 0 ? `${run.total_tokens} tokens` : ''}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[#2a2d3e]">
        <p className="text-xs text-slate-600 text-center">
          Auto-refreshes every 5s
        </p>
      </div>
    </div>
  )
}