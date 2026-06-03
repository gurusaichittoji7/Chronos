from fastapi import APIRouter, BackgroundTasks
import subprocess
import sys
import os

router = APIRouter(prefix="/demo", tags=["demo"])

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DEMO_SCRIPT = os.path.abspath(os.path.join(BACKEND_DIR, '..', 'demo_agent', 'run_demo.py'))


def run_demo_agent(run_type: str):
    subprocess.Popen(
        [sys.executable, DEMO_SCRIPT, run_type],
        cwd=BACKEND_DIR,
        env={**os.environ, 'PYTHONPATH': BACKEND_DIR},
    )


@router.post("/run/{run_type}")
def trigger_demo(run_type: str, background_tasks: BackgroundTasks):
    if run_type not in ["langchain", "langgraph"]:
        return {"error": "run_type must be 'langchain' or 'langgraph'"}

    background_tasks.add_task(run_demo_agent, run_type)

    return {
        "message": f"Demo agent ({run_type}) started in background",
        "run_type": run_type,
    }