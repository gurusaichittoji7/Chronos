from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
import json


class Run(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    framework: str                  # "langchain" or "langgraph"
    status: str = "running"         # "running", "success", "failed"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    finished_at: Optional[datetime] = None
    total_tokens: int = 0
    total_latency_ms: int = 0


class Step(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    run_id: int = Field(foreign_key="run.id")
    step_index: int
    step_type: str                  # "llm", "tool", "node"
    name: str
    input_data: str                 # JSON string
    output_data: str                # JSON string
    prompt: Optional[str] = None
    status: str = "success"         # "success", "failed", "replayed"
    latency_ms: int = 0
    token_usage: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_replayed: bool = False
    replayed_from_step: Optional[int] = None