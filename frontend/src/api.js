import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// --- Runs ---
export const getAllRuns = () => api.get('/runs/')

export const getRun = (runId) => api.get(`/runs/${runId}`)

export const deleteRun = (runId) => api.delete(`/runs/${runId}`)

// --- Steps ---
export const getSteps = (runId) => api.get(`/runs/${runId}/steps`)

export const getStepDetail = (runId, stepId) =>
  api.get(`/runs/${runId}/steps/${stepId}/detail`)

// --- Replay ---
export const replayStep = (runId, stepId, editedOutput, editedPrompt = null) =>
  api.post(`/runs/${runId}/steps/${stepId}/replay`, {
    edited_output: editedOutput,
    edited_prompt: editedPrompt,
  })