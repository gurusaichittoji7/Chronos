from fastapi import APIRouter, BackgroundTasks
from sqlmodel import Session
from database import engine, create_db_and_tables
from models import Run, Step
from datetime import datetime
import json
import time
import os

router = APIRouter(prefix="/demo", tags=["demo"])


def record_step(run_id, index, step_type, name, input_data, output_data, latency_ms=1):
    with Session(engine) as session:
        step = Step(
            run_id=run_id,
            step_index=index,
            step_type=step_type,
            name=name,
            input_data=json.dumps(input_data),
            output_data=json.dumps(output_data),
            status="success",
            latency_ms=latency_ms,
        )
        session.add(step)
        session.commit()


def run_builtin_demo(run_type: str):
    create_db_and_tables()

    with Session(engine) as session:
        run = Run(
            name=f"Demo Run — {run_type.upper()} — {datetime.utcnow().strftime('%H:%M:%S')}",
            framework=run_type,
            status="running",
        )
        session.add(run)
        session.commit()
        session.refresh(run)
        run_id = run.id

    try:
        if run_type == "langgraph":
            steps = [
                ("node", "search_node", {"query": "LangGraph multi-agent systems"}, {"search_result": "Found 3 relevant articles about LangGraph multi-agent systems."}, 2),
                ("node", "calculate_node", {"expression": "99 * 13"}, {"calculation": "Result of 99 * 13 = 1287"}, 1),
                ("node", "summarize_node", {"text": "LangGraph multi-agent systems article"}, {"summary": "LangGraph enables stateful multi-agent workflows using graphs."}, 3),
                ("node", "final_node", {"all_results": "combined"}, {"final_answer": "LangGraph is a framework for building stateful multi-agent systems. 99*13=1287."}, 1),
            ]
        else:
            steps = [
                ("llm", "LLM (Ollama)", {"prompts": ["Search for LangGraph then calculate 42*7"]}, {"output": "Thought: I should search for LangGraph first."}, 120),
                ("tool", "search_web", {"input": "LangGraph"}, {"output": "Search results for LangGraph: Found 3 relevant articles."}, 2),
                ("llm", "LLM (Ollama)", {"prompts": ["Observation: search results found"]}, {"output": "Thought: Now I should calculate 42*7."}, 95),
                ("tool", "calculate", {"input": "42 * 7"}, {"output": "Result of 42 * 7 = 294"}, 1),
                ("llm", "LLM (Ollama)", {"prompts": ["Observation: calculation done"]}, {"output": "Thought: Now summarize what I found."}, 88),
                ("tool", "summarize_text", {"input": "LangGraph articles"}, {"output": "Summary: LangGraph is a stateful multi-agent framework."}, 2),
                ("llm", "LLM (Ollama)", {"prompts": ["Observation: summary done"]}, {"output": "Final Answer: LangGraph enables multi-agent workflows. 42*7=294."}, 76),
            ]

        for i, (step_type, name, input_data, output_data, latency) in enumerate(steps):
            time.sleep(0.8)
            record_step(run_id, i, step_type, name, input_data, output_data, latency)

        with Session(engine) as session:
            run = session.get(Run, run_id)
            run.status = "success"
            run.finished_at = datetime.utcnow()
            run.total_latency_ms = sum(s[4] for s in steps)
            session.add(run)
            session.commit()

    except Exception as e:
        with Session(engine) as session:
            run = session.get(Run, run_id)
            run.status = "failed"
            run.finished_at = datetime.utcnow()
            session.add(run)
            session.commit()
        print(f"Demo failed: {e}")


@router.post("/run/{run_type}")
def trigger_demo(run_type: str, background_tasks: BackgroundTasks):
    if run_type not in ["langchain", "langgraph"]:
        return {"error": "run_type must be 'langchain' or 'langgraph'"}

    background_tasks.add_task(run_builtin_demo, run_type)

    return {
        "message": f"Demo agent ({run_type}) started",
        "run_type": run_type,
    }