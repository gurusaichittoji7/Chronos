import { useState, useEffect } from 'react'
import { getStepDetail, replayStep } from '../api'

const typeColors = {
  llm: { light: { bg: '#eff6ff', text: '#3b82f6' }, dark: { bg: '#0f1e3d', text: '#60a5fa' } },
  tool: { light: { bg: '#f0fdf4', text: '#22c55e' }, dark: { bg: '#0a1f14', text: '#4ade80' } },
  node: { light: { bg: '#faf5ff', text: '#a855f7' }, dark: { bg: '#160d2e', text: '#c084fc' } },
}

const statusColors = {
  success: '#22c55e',
  failed: '#f43f5e',
  running: '#f59e0b',
  replayed: '#a855f7',
}

export default function StepPanel({ step, runId, onReplaySuccess, darkMode }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('inline')
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
        runId, step.id, editedOutput,
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

  const tc = (type) => (typeColors[type] || typeColors.node)[darkMode ? 'dark' : 'light']

  const inputStyle = {
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    borderRadius: '10px',
    padding: '12px',
    fontSize: '12px',
    fontFamily: 'monospace',
    width: '100%',
    resize: 'none',
    outline: 'none',
  }

  if (!step) {
    return (
      <div className="w-96 flex items-center justify-center border-l relative z-10"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <div className="text-center px-6">
          {darkMode && <div style={{ fontSize: '48px', marginBottom: '12px' }}>✨</div>}
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Click any node in the graph to inspect and time-travel
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="w-96 flex items-center justify-center border-l relative z-10"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading step...</p>
      </div>
    )
  }

  return (
    <div className="w-96 flex flex-col overflow-hidden border-l relative z-10"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>

      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: tc(detail?.step_type).bg, color: tc(detail?.step_type).text }}>
            {detail?.step_type?.toUpperCase()}:
          </span>
          {detail?.is_replayed && (
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: '#faf5ff', color: '#a855f7' }}>
              replayed
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            {detail?.name}
          </h2>
          <span style={{ color: statusColors[detail?.status] }}>
            {detail?.status === 'success' ? '✅' : detail?.status === 'failed' ? '❌' : detail?.status === 'replayed' ? '🔁' : '⏳'}
          </span>
        </div>

        <div className="flex gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          {detail?.latency_ms > 0 && <span>⚡ {detail.latency_ms}ms</span>}
          {detail?.token_usage > 0 && <span>🪙 {detail.token_usage} tokens</span>}
          <span>Step #{detail?.step_index}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

        {/* Input */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: 'var(--text-muted)' }}>Input</p>
          <pre style={{ ...inputStyle, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(detail?.input_data, null, 2)}
          </pre>
        </div>

        {/* Output Editor */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}>Output Editor</p>
            <div className="flex rounded-lg overflow-hidden border"
              style={{ borderColor: 'var(--border)' }}>
              {['inline', 'full'].map((m) => (
                <button key={m}
                  onClick={() => setMode(m === 'full' ? 'full' : 'inline')}
                  className="text-xs px-3 py-1 transition-colors capitalize"
                  style={{
                    background: mode === m ? 'var(--accent)' : 'var(--bg-card)',
                    color: mode === m ? 'white' : 'var(--text-secondary)',
                  }}>
                  {m === 'full' ? 'Full Editor' : 'Inline'}
                </button>
              ))}
            </div>
          </div>

          {mode === 'inline' && (
            <div>
              <textarea
                value={editedOutput}
                onChange={(e) => handleOutputChange(e.target.value)}
                rows={6}
                style={inputStyle}
              />
              {jsonError && (
                <p className="text-xs mt-1" style={{ color: '#f43f5e' }}>{jsonError}</p>
              )}
            </div>
          )}

          {mode === 'full' && (
            <div className="flex flex-col gap-3">
              {detail?.prompt && (
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Prompt</p>
                  <textarea
                    value={editedPrompt}
                    onChange={(e) => setEditedPrompt(e.target.value)}
                    rows={5}
                    style={inputStyle}
                  />
                </div>
              )}
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Output</p>
                <textarea
                  value={editedOutput}
                  onChange={(e) => handleOutputChange(e.target.value)}
                  rows={8}
                  style={inputStyle}
                />
                {jsonError && (
                  <p className="text-xs mt-1" style={{ color: '#f43f5e' }}>{jsonError}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Replay Message */}
        {replayMsg && (
          <div className="text-xs p-3 rounded-xl"
            style={{
              background: replayMsg.type === 'success' ? '#f0fdf4' : '#fff1f2',
              color: replayMsg.type === 'success' ? '#22c55e' : '#f43f5e',
              border: `1px solid ${replayMsg.type === 'success' ? '#bbf7d0' : '#fecdd3'}`,
            }}>
            {replayMsg.text}
          </div>
        )}
      </div>

      {/* Replay Button */}
      <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={handleReplay}
          disabled={replaying || !!jsonError}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: replaying || jsonError ? 'var(--border)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: replaying || jsonError ? 'var(--text-muted)' : 'white',
            cursor: replaying || jsonError ? 'not-allowed' : 'pointer',
            boxShadow: replaying || jsonError ? 'none' : '0 4px 16px #6366f144',
          }}>
          {replaying ? '⏳ Replaying...' : '⏪ Time-Travel from this Step'}
        </button>
      </div>
    </div>
  )
}