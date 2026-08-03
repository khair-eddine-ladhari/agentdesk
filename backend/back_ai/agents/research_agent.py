import os
import time
from langchain_groq import ChatGroq
from langgraph.prebuilt import create_react_agent
from tools.agent_lang_graph_tools.query_workspace_docs import query_workspace_docs
from tools.agent_lang_graph_tools.search_web import search_web
from tools.agent_lang_graph_tools.calculate import calculate
from tools.agent_lang_graph_tools.propose_action import propose_action

SYSTEM_PROMPT = """You are a research assistant for a business workspace.

You have four tools available:
- query_workspace_docs: search the workspace's own stored documents
- search_web: search the web for external/current information
- calculate: perform deterministic math on numbers you already have
- propose_action: draft a proposed task/email/meeting (never executes anything)

Reason step by step about which tools this question actually needs - not
every question needs every tool. Combine tools when the question genuinely
requires it (e.g. comparing a workspace figure to a web-sourced figure).

Before calling search_web, restate the user's request as a clean, well-formed
search query in your own words - correcting grammar/typos - rather than
passing the user's raw wording straight into the tool call. For example, if
the user asks "how much other competitors subscription cost" the query
argument should be something like "competitor subscription pricing", not the
user's literal phrasing.

Never invent numbers, names, or facts not returned by a tool or given by
the user. If a tool returns nothing useful, say so honestly rather than
guessing. If the user's request implies an action should be taken, use
propose_action rather than claiming you've done it yourself - you never
execute anything directly.

You may also be given recent conversation history and known facts already
extracted from workspace documents. Use them to understand what the user
is referring to, but still verify anything numeric or time-sensitive with
a tool rather than trusting memory alone.
"""

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


def _invoke_agent_with_retry(messages, max_attempts=5, backoff_seconds=1.0):
    """
    Groq's tool-calling occasionally emits malformed function-call syntax
    (tool_use_failed, HTTP 400) even at temperature=0 - it's a generation
    glitch, not a logic error, and retrying the same input often succeeds.
    Only retries on that specific failure mode; anything else re-raises
    immediately so real errors aren't hidden behind pointless retries.

    max_attempts bumped from 3 to 5 - on some queries (compound/multi-clause
    ones especially) Groq's malformed-call rate is high enough that 3
    attempts wasn't always enough to land a valid call.
    """
    last_exc = None
    for attempt in range(max_attempts):
        try:
            return _agent.invoke({"messages": messages})
        except Exception as exc:
            is_tool_use_failure = "tool_use_failed" in str(exc) or "Failed to call a function" in str(exc)
            print(f"[research_agent] attempt {attempt + 1}/{max_attempts} failed: {repr(exc)}")  # TEMP DEBUG
            if not is_tool_use_failure:
                raise
            last_exc = exc
            if attempt < max_attempts - 1:
                time.sleep(backoff_seconds * (attempt + 1))
    raise last_exc


def _debug_print_trace(result):
    """
    TEMP DEBUG - remove once the search_web hallucination question is
    resolved. Prints every message in the agent's run so we can see
    whether a tool was actually invoked and what it returned, instead of
    only seeing the final synthesized answer.
    """
    print("=" * 60)
    for m in result["messages"]:
        content_preview = repr(getattr(m, "content", None))[:300]
        print(type(m).__name__, "-", content_preview)
        if hasattr(m, "tool_calls") and m.tool_calls:
            print("  tool_calls:", m.tool_calls)
    print("=" * 60)


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
        _debug_print_trace(result)  # TEMP DEBUG - remove after diagnosing
        final_message = result["messages"][-1].content
    except Exception as exc:
        print("=" * 60)  # TEMP DEBUG
        print("RESEARCH AGENT FAILED (all retries exhausted):", repr(exc))  # TEMP DEBUG
        print("=" * 60)  # TEMP DEBUG
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