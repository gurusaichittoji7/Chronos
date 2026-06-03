import { useEffect, useCallback, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { getSteps } from '../api'

const nodeIcons = {
  llm: '🧠',
  tool: '🔧',
  node: '📋',
}

const statusIcons = {
  success: '✅',
  failed: '⚠️',
  running: '⏳',
  replayed: '🔁',
}

const nodeColors = {
  llm: { light: { bg: '#eff6ff', border: '#3b82f6' }, dark: { bg: '#0f1e3d', border: '#3b82f6' } },
  tool: { light: { bg: '#f0fdf4', border: '#22c55e' }, dark: { bg: '#0a1f14', border: '#22c55e' } },
  node: { light: { bg: '#faf5ff', border: '#a855f7' }, dark: { bg: '#160d2e', border: '#a855f7' } },
  error: { light: { bg: '#fff1f2', border: '#f43f5e' }, dark: { bg: '#1f0a0e', border: '#f43f5e' } },
}

function getToolIcon(name) {
  if (!name) return '🔧'
  const n = name.toLowerCase()
  if (n.includes('search')) return '🔍'
  if (n.includes('calc')) return '🧮'
  if (n.includes('summar')) return '📝'
  if (n.includes('llm') || n.includes('ollama') || n.includes('openai')) return '🧠'
  return '🔧'
}

function buildNodes(steps, darkMode) {
  return steps.map((step, i) => {
    const isError = step.status === 'failed'
    const colorKey = isError ? 'error' : step.step_type
    const colors = (nodeColors[colorKey] || nodeColors.node)[darkMode ? 'dark' : 'light']
    const icon = isError ? '⚠️' : (step.step_type === 'llm' ? '🧠' : getToolIcon(step.name))
    const typeLine = isError ? 'ERROR' : step.step_type.toUpperCase()
    const nameLine = isError ? 'Exception' : step.name

    return {
      id: String(step.id),
      type: 'default',
      position: { x: 250, y: i * 160 },
      data: {
        label: (
  <div style={{ textAlign: 'center', width: '100%' }}>
    <div style={{
      width: 80,
      height: 80,
      borderRadius: '50%',
      background: colors.bg,
      border: `2px solid ${colors.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto',
      boxShadow: darkMode ? `0 0 16px ${colors.border}44` : `0 2px 12px ${colors.border}33`,
    }}>
      <div style={{ fontSize: '26px' }}>{icon}</div>
    </div>
    <div style={{ marginTop: '8px' }}>
      <div style={{ fontSize: '11px', color: darkMode ? '#94a3b8' : '#475569' }}>
        {nameLine}
      </div>
    </div>
  </div>
        ),
        step,
      },
      style: {
  background: 'transparent',
  border: 'none',
  width: 100,
  height: 130,
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  cursor: 'pointer',
},
    }
  })
}

function renderNode(icon, label, step, colors, darkMode) {
  return (
    <div style={{ textAlign: 'center', width: '100%' }}>
      <div style={{ fontSize: '24px', lineHeight: 1 }}>{icon}</div>
      {step.status === 'success' && (
        <div style={{ fontSize: '10px', color: '#22c55e', marginTop: '2px' }}>✓</div>
      )}
    </div>
  )
}

function buildEdges(steps, darkMode) {
  return steps.slice(0, -1).map((step, i) => ({
    id: `e${step.id}-${steps[i + 1].id}`,
    source: String(step.id),
    target: String(steps[i + 1].id),
    animated: steps[i + 1].status === 'running',
    style: {
      stroke: steps[i + 1].status === 'replayed'
        ? '#a855f7'
        : darkMode ? '#3b82f6' : '#94a3b8',
      strokeWidth: 2,
    },
  }))
}

// Custom node label rendered below the circle
function NodeWithLabel({ nodes, steps, darkMode }) {
  return null
}

export default function GraphView({ runId, onSelectStep, darkMode }) {
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
    setNodes((prevNodes) => {
      const newNodes = buildNodes(steps, darkMode)
      return newNodes.map((n) => {
        const existing = prevNodes.find((p) => p.id === n.id)
        return existing ? { ...n, position: existing.position } : n
      })
    })
    setEdges(buildEdges(steps, darkMode))
  } catch (err) {
    console.error('Failed to fetch steps', err)
  } finally {
    setLoading(false)
  }
}

    fetchSteps()
    const interval = setInterval(fetchSteps, 2000)
    return () => clearInterval(interval)
  }, [runId, darkMode])

  const onNodeClick = useCallback((event, node) => {
    onSelectStep(node.data.step)
  }, [onSelectStep])

  if (!runId) {
    return (
      <div className="flex-1 flex items-center justify-center"
        style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <p className="text-5xl mb-4">🕰️</p>
          <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
            Select a run to visualize
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            or start your demo agent to create one
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center"
        style={{ background: 'var(--bg-primary)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading graph...</p>
      </div>
    )
  }

  return (
  <div className="flex-1 relative" style={{ height: '100%' }}>
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      fitView
      fitViewOptions={{ padding: 0.3 }}
    >
      <Background
        color={darkMode ? '#1e2d45' : '#e2e8f0'}
        gap={24}
        size={1}
      />
      <Controls />
    </ReactFlow>

    <style>{`
      .react-flow__node-default {
        overflow: visible !important;
      }
      .react-flow__node .react-flow__handle {
        background: transparent !important;
        border: none !important;
        width: 8px !important;
        height: 8px !important;
      }
    `}</style>
  </div>
)
}