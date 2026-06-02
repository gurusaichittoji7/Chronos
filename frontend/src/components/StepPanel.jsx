import { useState, useEffect } from 'react'
import { getStepDetail, replayStep } from '../api'

const statusColors = {
  success: 'text-green-400',
  failed: 'text-red-400',
  running: 'text-yellow-400',
  replayed: 'text-purple-400',
}

const typeColors = {
  llm: 'bg-blue-900 text-blue-300',
  tool: 'bg-green-900 text-green-300',
  node: 'bg-purple-900 text-purple-300',
}

export default function StepPanel({ step, runId, onReplaySuccess }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('inline') // 'inline' or 'full'
  const [editedOutput, setEditedOutput] = useState('')
  const [editedPrompt, setEditedPrompt] = useState('')
  const [replaying, setReplaying] = useState(false)
  const [replayMsg, setReplayMsg] = useState(null)
  const [jsonError, setJsonError] = useState(null)

  useEffect(() => {
    if (!step || !runId) return
    setLoading(true)
    setReplayMsg(null)
    setJsonError(null)

    getStepDetail(runId, step.id)
      .then((res) => {
        setDetail(res.data)
        setEditedOutput(JSON.stringify(res.data.output_data, null, 2))
        setEditedPrompt(res.data.prompt || '')
      })
      .catch((err) => console.error('Failed to fetch step detail', err))
      .finally(() => setLoading(false))
  }, [step, runId])

  const handleOutputChange = (val) => {
    setEditedOutput(val)
    try {
      JSON.parse(val)
      setJsonError(null)
    } catch {
      setJsonError('Invalid JSON')
    }
  }

  const handleReplay = async () => {
    if (jsonError) return
    setReplaying(true)
    setReplayMsg(null)
    try {
      const res = await replayStep(
        runId,
        step.id,
        editedOutput,
        mode === 'full' ? editedPrompt : null
      )
      setReplayMsg({ type: 'success', text: res.data.message })
      onReplaySuccess()
    } catch (err) {
      setReplayMsg({
        type: 'error',
        text: err.response?.data?.detail || 'Replay failed',
      })
    } finally {
      setReplaying(false)
    }
  }

  if (!step) {
    return (
      <div className="w-96 bg-[#13151f] border-l border-[#2a2d3e] flex items-center justify-center">
        <p className="text-slate-600 text-sm text-center px-4">
          Click any node in the graph to inspect and time-travel
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="w-96 bg-[#13151f] border-l border-[#2a2d3e] flex items-center justify-center">
        <p className="text-slate-500 text-sm">Loading step...</p>
      </div>
    )
  }

  return (
    <div className="w-96 bg-[#13151f] border-l border-[#2a2d3e] flex flex-col overflow-hidden">

      {/* Header */}
      <div className="p-4 border-b border-[#2a2d3e]">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[detail?.step_type] || 'bg-slate-800 text-slate-400'}`}>
            {detail?.step_type}
          </span>
          <span className={`text-xs font-medium ${statusColors[detail?.status]}`}>
            {detail?.status}
          </span>
          {detail?.is_replayed && (
            <span className="text-xs bg-purple-900 text-purple-300 px-2 py-0.5 rounded-full">
              replayed
            </span>
          )}
        </div>
        <h2 className="text-white font-semibold text-sm">{detail?.name}</h2>
        <div className="flex gap-3 mt-2 text-xs text-slate-500">
          {detail?.latency_ms > 0 && <span>⚡ {detail.latency_ms}ms</span>}
          {detail?.token_usage > 0 && <span>🪙 {detail.token_usage} tokens</span>}
          <span>Step #{detail?.step_index}</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

        {/* Input */}
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Input</p>
          <pre className="text-xs bg-[#0f1117] border border-[#2a2d3e] rounded-lg p-3 text-slate-300 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(detail?.input_data, null, 2)}
          </pre>
        </div>

        {/* Mode Toggle */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              Output Editor
            </p>
            <div className="flex bg-[#0f1117] border border-[#2a2d3e] rounded-lg overflow-hidden">
              <button
                onClick={() => setMode('inline')}
                className={`text-xs px-3 py-1 transition-colors ${mode === 'inline' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Inline
              </button>
              <button
                onClick={() => setMode('full')}
                className={`text-xs px-3 py-1 transition-colors ${mode === 'full' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Full Editor
              </button>
            </div>
          </div>

          {/* Inline JSON Editor */}
          {mode === 'inline' && (
            <div>
              <textarea
                value={editedOutput}
                onChange={(e) => handleOutputChange(e.target.value)}
                rows={6}
                className="w-full text-xs bg-[#0f1117] border border-[#2a2d3e] rounded-lg p-3 text-slate-300 font-mono resize-none focus:outline-none focus:border-indigo-500 transition-colors"
              />
              {jsonError && (
                <p className="text-xs text-red-400 mt-1">{jsonError}</p>
              )}
            </div>
          )}

          {/* Full Editor */}
          {mode === 'full' && (
            <div className="flex flex-col gap-3">
              {detail?.prompt && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Prompt</p>
                  <textarea
                    value={editedPrompt}
                    onChange={(e) => setEditedPrompt(e.target.value)}
                    rows={5}
                    className="w-full text-xs bg-[#0f1117] border border-[#2a2d3e] rounded-lg p-3 text-slate-300 font-mono resize-none focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500 mb-1">Output</p>
                <textarea
                  value={editedOutput}
                  onChange={(e) => handleOutputChange(e.target.value)}
                  rows={8}
                  className="w-full text-xs bg-[#0f1117] border border-[#2a2d3e] rounded-lg p-3 text-slate-300 font-mono resize-none focus:outline-none focus:border-indigo-500 transition-colors"
                />
                {jsonError && (
                  <p className="text-xs text-red-400 mt-1">{jsonError}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Replay Message */}
        {replayMsg && (
          <div className={`text-xs p-3 rounded-lg ${replayMsg.type === 'success' ? 'bg-green-900/40 text-green-300 border border-green-800' : 'bg-red-900/40 text-red-300 border border-red-800'}`}>
            {replayMsg.text}
          </div>
        )}
      </div>

      {/* Replay Button */}
      <div className="p-4 border-t border-[#2a2d3e]">
        <button
          onClick={handleReplay}
          disabled={replaying || !!jsonError}
          className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all
            bg-indigo-600 hover:bg-indigo-500 text-white
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {replaying ? '⏳ Replaying...' : '⏪ Time-Travel from this Step'}
        </button>
      </div>
    </div>
  )
}