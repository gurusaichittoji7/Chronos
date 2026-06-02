import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))

from sqlmodel import Session
from database import engine, create_db_and_tables
from models import Run
from tracer import ChronosTracer, ChronosLangGraphTracer
from datetime import datetime
import json

# --- LLM Setup (Ollama or OpenAI) ---
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "ollama")

if LLM_PROVIDER == "openai":
    from langchain_openai import ChatOpenAI
    llm = ChatOpenAI(
        model=os.getenv("OPENAI_MODEL", "gpt-3.5-turbo"),
        temperature=0,
    )
else:
    from langchain_community.llms import Ollama
    llm = Ollama(
        base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
        model=os.getenv("OLLAMA_MODEL", "llama3"),
    )

# --- Tools ---
from langchain.tools import tool

@tool
def search_web(query: str) -> str:
    """Simulates a web search and returns a fake result."""
    return f"Search results for '{query}': Found 3 relevant articles about {query}."

@tool
def calculate(expression: str) -> str:
    """Evaluates a simple math expression."""
    try:
        result = eval(expression)
        return f"Result of {expression} = {result}"
    except Exception as e:
        return f"Error evaluating expression: {str(e)}"

@tool
def summarize_text(text: str) -> str:
    """Simulates summarizing a block of text."""
    words = text.split()
    return f"Summary: This text contains {len(words)} words and discusses: {' '.join(words[:5])}..."


# --- LangChain Agent Demo ---
def run_langchain_demo(run_id: int):
    from langchain.agents import initialize_agent, AgentType

    tracer = ChronosTracer(run_id=run_id)
    tools = [search_web, calculate, summarize_text]

    agent = initialize_agent(
        tools=tools,
        llm=llm,
        agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
        verbose=True,
        callbacks=[tracer],
    )

    result = agent.run(
        "Search for information about LangGraph, then calculate 42 * 7, then summarize what you found."
    )
    return result


# --- LangGraph Agent Demo ---
def run_langgraph_demo(run_id: int):
    from langgraph.graph import StateGraph, END
    from typing import TypedDict

    lg_tracer = ChronosLangGraphTracer(run_id=run_id)

    class AgentState(TypedDict):
        query: str
        search_result: str
        calculation: str
        summary: str
        final_answer: str

    @lg_tracer.trace_node("search_node")
    def search_node(state: AgentState) -> AgentState:
        result = search_web.invoke(state["query"])
        return {**state, "search_result": result}

    @lg_tracer.trace_node("calculate_node")
    def calculate_node(state: AgentState) -> AgentState:
        result = calculate.invoke("99 * 13")
        return {**state, "calculation": result}

    @lg_tracer.trace_node("summarize_node")
    def summarize_node(state: AgentState) -> AgentState:
        result = summarize_text.invoke(state["search_result"])
        return {**state, "summary": result}

    @lg_tracer.trace_node("final_node")
    def final_node(state: AgentState) -> AgentState:
        answer = f"Search: {state['search_result']} | Calc: {state['calculation']} | Summary: {state['summary']}"
        return {**state, "final_answer": answer}

    graph = StateGraph(AgentState)
    graph.add_node("search", search_node)
    graph.add_node("calculate", calculate_node)
    graph.add_node("summarize", summarize_node)
    graph.add_node("final", final_node)

    graph.set_entry_point("search")
    graph.add_edge("search", "calculate")
    graph.add_edge("calculate", "summarize")
    graph.add_edge("summarize", "final")
    graph.add_edge("final", END)

    app = graph.compile()
    result = app.invoke({"query": "LangGraph multi-agent systems", "search_result": "", "calculation": "", "summary": "", "final_answer": ""})
    return result


# --- Main ---
if __name__ == "__main__":
    create_db_and_tables()

    demo_type = sys.argv[1] if len(sys.argv) > 1 else "langgraph"

    with Session(engine) as session:
        run = Run(
            name=f"Demo Run — {demo_type.upper()} — {datetime.utcnow().strftime('%H:%M:%S')}",
            framework=demo_type,
            status="running",
        )
        session.add(run)
        session.commit()
        session.refresh(run)
        run_id = run.id

    print(f"\n🕰️  Chronos — Starting {demo_type.upper()} demo (Run ID: {run_id})\n")

    try:
        if demo_type == "langchain":
            result = run_langchain_demo(run_id)
        else:
            result = run_langgraph_demo(run_id)

        with Session(engine) as session:
            run = session.get(Run, run_id)
            run.status = "success"
            run.finished_at = datetime.utcnow()
            session.add(run)
            session.commit()

        print(f"\n✅ Run {run_id} completed successfully.")
        print(f"Result: {json.dumps(result, default=str, indent=2)}")

    except Exception as e:
        with Session(engine) as session:
            run = session.get(Run, run_id)
            run.status = "failed"
            run.finished_at = datetime.utcnow()
            session.add(run)
            session.commit()

        print(f"\n❌ Run {run_id} failed: {str(e)}")