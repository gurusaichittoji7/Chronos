from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import Run, Step
from typing import List

router = APIRouter(prefix="/runs", tags=["runs"])


@router.get("/", response_model=List[Run])
def get_all_runs(session: Session = Depends(get_session)):
    runs = session.exec(select(Run).order_by(Run.created_at.desc())).all()
    return runs


@router.get("/{run_id}", response_model=Run)
def get_run(run_id: int, session: Session = Depends(get_session)):
    run = session.get(Run, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@router.get("/{run_id}/steps", response_model=List[Step])
def get_steps(run_id: int, session: Session = Depends(get_session)):
    steps = session.exec(
        select(Step)
        .where(Step.run_id == run_id)
        .order_by(Step.step_index)
    ).all()
    return steps

@router.delete("/{run_id}")
def delete_run(run_id: int, session: Session = Depends(get_session)):
    run = session.get(Run, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    steps = session.exec(select(Step).where(Step.run_id == run_id)).all()
    for step in steps:
        session.delete(step)

    session.delete(run)
    session.commit()
    return {"message": f"Run {run_id} deleted successfully"}