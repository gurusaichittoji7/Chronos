from langchain.callbacks.base import BaseCallbackHandler
from sqlmodel import Session
from models import Run, Step
from database import engine
from datetime import datetime
import json
import time


class ChronosTracer(BaseCallbackHandler):
    """
    LangChain callback handler that intercepts every LLM and tool call
    and records it as a Step in the database.
    """

    def __init__(self, run_id: int):
        self.run_id = run_id
        self.step_index = 0
        self.start_times = {}

    def _next_index(self):
        idx = self.step_index
        self.step_index += 1
        return idx

    # --- LLM Hooks ---

    def on_llm_start(self, serialized, prompts, **kwargs):
        self.start_times["llm"] = time.time()
        with Session(engine) as session:
            step = Step(
                run_id=self.run_id,
                step_index=self._next_index(),
                step_type="llm",
                name=serialized.get("name", "LLM Call"),
                input_data=json.dumps({"prompts": prompts}),
                output_data="{}",
                status="running",
                prompt=prompts[0] if prompts else None,
            )
            session.add(step)
            session.commit()
            self._current_llm_step_id = step.id

    def on_llm_end(self, response, **kwargs):
        latency = int((time.time() - self.start_times.get("llm", time.time())) * 1000)
        output_text = response.generations[0][0].text if response.generations else ""
        token_usage = 0
        if response.llm_output:
            usage = response.llm_output.get("token_usage", {})
            token_usage = usage.get("total_tokens", 0)

        with Session(engine) as session:
            step = session.get(Step, self._current_llm_step_id)
            if step:
                step.output_data = json.dumps({"output": output_text})
                step.status = "success"
                step.latency_ms = latency
                step.token_usage = token_usage
                session.add(step)

                # update run totals
                run = session.get(Run, self.run_id)
                if run:
                    run.total_tokens += token_usage
                    run.total_latency_ms += latency
                    session.add(run)

                session.commit()

    def on_llm_error(self, error, **kwargs):
        with Session(engine) as session:
            step = session.get(Step, self._current_llm_step_id)
            if step:
                step.status = "failed"
                step.output_data = json.dumps({"error": str(error)})
                session.add(step)
                session.commit()

    # --- Tool Hooks ---

    def on_tool_start(self, serialized, input_str, **kwargs):
        self.start_times["tool"] = time.time()
        with Session(engine) as session:
            step = Step(
                run_id=self.run_id,
                step_index=self._next_index(),
                step_type="tool",
                name=serialized.get("name", "Tool Call"),
                input_data=json.dumps({"input": input_str}),
                output_data="{}",
                status="running",
            )
            session.add(step)
            session.commit()
            self._current_tool_step_id = step.id

    def on_tool_end(self, output, **kwargs):
        latency = int((time.time() - self.start_times.get("tool", time.time())) * 1000)
        with Session(engine) as session:
            step = session.get(Step, self._current_tool_step_id)
            if step:
                step.output_data = json.dumps({"output": output})
                step.status = "success"
                step.latency_ms = latency
                session.add(step)
                session.commit()

    def on_tool_error(self, error, **kwargs):
        with Session(engine) as session:
            step = session.get(Step, self._current_tool_step_id)
            if step:
                step.status = "failed"
                step.output_data = json.dumps({"error": str(error)})
                session.add(step)
                session.commit()


# --- LangGraph Hook ---

class ChronosLangGraphTracer:
    """
    Wraps a LangGraph node function to record its execution as a Step.
    Usage: wrap your node functions with @chronos_node(run_id, name)
    """

    def __init__(self, run_id: int):
        self.run_id = run_id
        self.step_index = 0

    def trace_node(self, name: str):
        def decorator(fn):
            def wrapper(state):
                step_index = self.step_index
                self.step_index += 1
                start = time.time()

                with Session(engine) as session:
                    step = Step(
                        run_id=self.run_id,
                        step_index=step_index,
                        step_type="node",
                        name=name,
                        input_data=json.dumps(state, default=str),
                        output_data="{}",
                        status="running",
                    )
                    session.add(step)
                    session.commit()
                    step_id = step.id

                try:
                    result = fn(state)
                    latency = int((time.time() - start) * 1000)
                    with Session(engine) as session:
                        step = session.get(Step, step_id)
                        if step:
                            step.output_data = json.dumps(result, default=str)
                            step.status = "success"
                            step.latency_ms = latency
                            session.add(step)
                            session.commit()
                    return result

                except Exception as e:
                    latency = int((time.time() - start) * 1000)
                    with Session(engine) as session:
                        step = session.get(Step, step_id)
                        if step:
                            step.status = "failed"
                            step.output_data = json.dumps({"error": str(e)})
                            step.latency_ms = latency
                            session.add(step)
                            session.commit()
                    raise e

            return wrapper
        return decorator