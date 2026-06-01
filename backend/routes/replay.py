from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import Run, Step
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
import json

router = APIRouter(prefix="/runs", tags=["replay"])


class ReplayRequest(BaseModel):
    edited_output: str          # JSON string of the modified output
    edited_prompt: Optional[str] = None


class ReplayResponse(BaseModel):
    message: str
    replayed_step_id: int
    run_id: int
    step_index: int


@router.post("/{run_id}/steps/{step_id}/replay", response_model=ReplayResponse)
def replay_from_step(
    run_id: int,
    step_id: int,
    payload: ReplayRequest,
    session: Session = Depends(get_session),
):
    # validate run exists
    run = session.get(Run, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    # validate step belongs to this run
    step = session.get(Step, step_id)
    if not step or step.run_id != run_id:
        raise HTTPException(status_code=404, detail="Step not found in this run")

    # validate edited output is valid JSON
    try:
        json.loads(payload.edited_output)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="edited_output must be valid JSON")

    # mark all steps after this one as replayed
    downstream_steps = session.exec(
        select(Step)
        .where(Step.run_id == run_id)
        .where(Step.step_index > step.step_index)
    ).all()

    for downstream in downstream_steps:
        downstream.status = "replayed"
        session.add(downstream)

    # update the target step with the edited output
    step.output_data = payload.edited_output
    step.is_replayed = True
    step.replayed_from_step = step.step_index
    if payload.edited_prompt:
        step.prompt = payload.edited_prompt
    session.add(step)

    # mark run as replayed
    run.status = "replayed"
    run.finished_at = datetime.utcnow()
    session.add(run)

    session.commit()
    session.refresh(step)

    return ReplayResponse(
        message=f"Step {step_id} replayed successfully. {len(downstream_steps)} downstream steps marked as replayed.",
        replayed_step_id=step.id,
        run_id=run_id,
        step_index=step.step_index,
    )


@router.get("/{run_id}/steps/{step_id}/detail")
def get_step_detail(
    run_id: int,
    step_id: int,
    session: Session = Depends(get_session),
):
    step = session.get(Step, step_id)
    if not step or step.run_id != run_id:
        raise HTTPException(status_code=404, detail="Step not found")

    return {
        "id": step.id,
        "run_id": step.run_id,
        "step_index": step.step_index,
        "step_type": step.step_type,
        "name": step.name,
        "input_data": json.loads(step.input_data),
        "output_data": json.loads(step.output_data),
        "prompt": step.prompt,
        "status": step.status,
        "latency_ms": step.latency_ms,
        "token_usage": step.token_usage,
        "is_replayed": step.is_replayed,
        "replayed_from_step": step.replayed_from_step,
        "created_at": step.created_at,
    }