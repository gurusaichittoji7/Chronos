from fastapi import APIRouter, BackgroundTasks
from sqlmodel import Session
from database import engine
from models import Run
from datetime import datetime
import subprocess
import sys
import os

router = APIRouter(prefix="/demo", tags=["demo"])


def run_demo_agent(run_type: str):
    demo_script = os.path.join(os.path.dirname(__file__), '..', '..', 'demo_agent', 'run_demo.py')
    subprocess.Popen(
        [sys.executable, demo_script, run_type],
        cwd=os.path.join(os.path.dirname(__file__), '..'),
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