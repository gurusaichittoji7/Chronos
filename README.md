# Chronos 🕰️

> Agent Flight Recorder & Time Travel Debugger for LLM workflows.

Chronos intercepts every step of your LangChain or LangGraph agent run, capturing prompts, tool calls, outputs, token usage, and latency and visualizes it as an interactive graph. Click any past step, edit the output, and resume execution from that exact point.

### Features

- 🔍 **Full trace capture**:  every LLM call, tool invocation, and node transition recorded
- 🕸️ **Visual graph UI**:  see your agent's execution as a live, interactive flow diagram
- ⏪ **Time-travel debugging**:  click any step, modify the output, resume from there
- ⚡ **Dual editor**:  inline JSON edit for simple outputs, full prompt/response editor for complex ones
- 🔌 **LangChain + LangGraph**:  works with both frameworks out of the box

### Tech Stack

- **Backend**: FastAPI, SQLite, LangChain, LangGraph
- **Frontend**: React, Vite, Tailwind CSS, React Flow
- **Deployment**: Docker, AWS Lightsail

### Project Structure
chronos/
├── backend/        # FastAPI app, tracer, DB
├── frontend/       # React + Vite UI
├── demo_agent/     # Sample agent to demo Chronos
└── docker-compose.yml

### Getting Started

Coming soon.
