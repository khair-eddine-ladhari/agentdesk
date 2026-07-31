import os
import time
from langchain_groq import ChatGroq
from langgraph.prebuilt import create_react_agent
from tools.agent_lang_graph_tools.query_workspace_docs import query_workspace_docs
from tools.agent_lang_graph_tools.search_web import search_web
from tools.agent_lang_graph_tools.calculate import calculate
from tools.agent_lang_graph_tools.propose_action import propose_action

SYSTEM_PROMPT = """... (unchanged) ..."""

_llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    groq_api_key=os.environ.get("GROQ_API_KEY"),
    temperature=0,
)

_agent = create_react_agent(
    _llm,
    tools=[query_workspace_docs, search_web, calculate, propose_action],
    prompt=SYSTEM_PROMPT,
)


def _invoke_agent_with_retry(messages, max_attempts=3, backoff_seconds=1.0):
    """
    Groq's tool-calling occasionally emits malformed function-call syntax
    (tool_use_failed, HTTP 400) even at temperature=0 - it's a generation
    glitch, not a logic error, and retrying the same input often succeeds.
    Only retries on that specific failure mode; anything else re-raises
    immediately so real errors aren't hidden behind pointless retries.
    """
    last_exc = None
    for attempt in range(max_attempts):
        try:
            return _agent.invoke({"messages": messages})
        except Exception as exc:
            is_tool_use_failure = "tool_use_failed" in str(exc) or "Failed to call a function" in str(exc)
            if not is_tool_use_failure:
                raise
            last_exc = exc
            if attempt < max_attempts - 1:
                time.sleep(backoff_seconds * (attempt + 1))
    raise last_exc


def run_research_agent(query: str, namespace: str = None, history: list = None, known_facts: str = "") -> dict:
    full_query = query
    if namespace:
        full_query = f"{query}\n\n(workspace namespace: {namespace})"

    messages = []
    if known_facts:
        messages.append(("system", known_facts))
    for turn in (history or []):
        messages.append((turn["role"], turn["content"]))
    messages.append(("user", full_query))

    try:
        result = _invoke_agent_with_retry(messages)
        final_message = result["messages"][-1].content
    except Exception as exc:
        if "tool_use_failed" in str(exc) or "Failed to call a function" in str(exc):
            final_message = (
                "I had trouble using my tools to answer that just now - could you "
                "try rephrasing the question, or ask again in a moment?"
            )
        else:
            final_message = "The research agent hit an error and couldn't complete this request."

    return {
        "agentType": "research",
        "result": final_message,
        "sources": None,
        "requiresApproval": False,
        "toolCalls": None,
    }