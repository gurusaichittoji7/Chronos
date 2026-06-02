import { useEffect, useState, useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { getSteps } from '../api'

const stepTypeColors = {
  llm: { bg: '#1e3a5f', border: '#3b82f6', text: '#93c5fd' },
  tool: { bg: '#1a3a2a', border: '#22c55e', text: '#86efac' },
  node: { bg: '#2d1b4e', border: '#a855f7', text: '#d8b4fe' },
}

const statusIcons = {
  success: '✅',
  failed: '❌',
  running: '⏳',
  replayed: '🔁',
}

function buildNodes(steps) {
  return steps.map((step, i) => {
    const colors = stepTypeColors[step.step_type] || stepTypeColors.node
    return {
      id: String(step.id),
      type: 'default',
      position: { x: 250, y: i * 140 },
      data: {
        label: (
          <div className="text-left w-full">
            <div className="flex items-center justify-between mb-1">
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: colors.text }}
              >
                {step.step_type}
              </span>
              <span className="text-xs">
                {statusIcons[step.status] || '❓'}
              </span>
            </div>
            <div className="text-sm font-semibold text-white truncate mb-1">
              {step.name}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {step.latency_ms > 0 && <span>⚡ {step.latency_ms}ms</span>}
              {step.token_usage > 0 && <span>🪙 {step.token_usage}</span>}
            </div>
          </div>
        ),
        step,
      },
      style: {
        background: colors.bg,
        border: `1.5px solid ${colors.border}`,
        borderRadius: '10px',
        padding: '10px 14px',
        width: 220,
        cursor: 'pointer',
      },
    }
  })
}

function buildEdges(steps) {
  return steps.slice(0, -1).map((step, i) => ({
    id: `e${step.id}-${steps[i + 1].id}`,
    source: String(step.id),
    target: String(steps[i + 1].id),
    animated: steps[i + 1].status === 'running',
    style: {
      stroke: steps[i + 1].status === 'replayed' ? '#a855f7' : '#3b4058',
      strokeWidth: 2,
    },
  }))
}

export default function GraphView({ runId, onSelectStep }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!runId) return
    setLoading(true)

    const fetchSteps = async () => {
      try {
        const res = await getSteps(runId)
        const steps = res.data
        setNodes(buildNodes(steps))
        setEdges(buildEdges(steps))
      } catch (err) {
        console.error('Failed to fetch steps', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSteps()
    const interval = setInterval(fetchSteps, 2000)
    return () => clearInterval(interval)
  }, [runId])

  const onNodeClick = useCallback((event, node) => {
    onSelectStep(node.data.step)
  }, [onSelectStep])

  if (!runId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0f1117]">
        <div className="text-center">
          <p className="text-4xl mb-4">🕰️</p>
          <p className="text-slate-400 text-lg font-medium">Select a run to visualize</p>
          <p className="text-slate-600 text-sm mt-1">
            or start your demo agent to create one
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0f1117]">
        <p className="text-slate-400">Loading graph...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-[#0f1117]" style={{ height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.3 }}
      >
        <Background color="#2a2d3e" gap={20} />
        <Controls
          style={{
            background: '#1a1d27',
            border: '1px solid #2a2d3e',
            borderRadius: '8px',
          }}
        />
        <MiniMap
  style={{
    background: '#13151f',
    border: '1px solid #2a2d3e',
    bottom: 60,
    right: 10,
  }}
  nodeColor={(node) => {
    const type = node.data?.step?.step_type
    return stepTypeColors[type]?.border || '#3b4058'
  }}
/>
      </ReactFlow>
    </div>
  )
}