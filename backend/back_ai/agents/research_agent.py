import os
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


def run_research_agent(query: str, namespace: str = None, history: list = None, known_facts: str = "") -> dict:
    """
    Runs the ReAct research agent, which decides for itself which tools
    (workspace docs, web search, calculator, action-proposal) it needs
    for this specific question, in whatever order/combination it reasons
    is necessary. Recent conversation history and previously-extracted
    workspace facts are injected into the message list so the agent has
    the same context the other agents get, without changing its own
    static system prompt.
    """
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
        result = _agent.invoke({"messages": messages})
        final_message = result["messages"][-1].content
    except Exception as exc:
        final_message = f"The research agent hit an error: {exc}"

    return {
        "agentType": "research",
        "result": final_message,
        "sources": None,
        "requiresApproval": False,
        "toolCalls": None,
    }