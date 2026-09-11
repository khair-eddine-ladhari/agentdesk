import os
import time

from langchain_groq import ChatGroq
from langgraph.prebuilt import create_react_agent

from tools.agent_lang_graph_tools.query_workspace_docs import query_workspace_docs
from tools.agent_lang_graph_tools.propose_action import propose_action
from tools.agent_lang_graph_tools.summary_tool import make_summarize_tool

SYSTEM_PROMPT = """You are a meeting-prep assistant for a business workspace.

You have three tools available:
- summarize_upcoming_meetings: build a brief for each upcoming meeting,
  combining relevant workspace documents and related open tasks
- query_workspace_docs: search the workspace's own stored documents for
  anything the summary doesn't already cover
- propose_action: draft a proposed task/email/meeting (never executes
  anything)

Always call summarize_upcoming_meetings first, before anything else -
never answer from memory or skip straight to another tool. Then always
call query_workspace_docs as well, even if the summary already looks
complete, to check the workspace's documents for anything relevant that
the summary's per-meeting search may have missed. Only call
propose_action if the user's request implies an action should be taken
(a follow-up, a task, a reminder) - do not invent an action if nothing
in the request calls for one. Never invent meeting details, documents,
or tasks not returned by a tool, and never claim you've sent an email,
created a task, or scheduled a meeting yourself - propose_action only
drafts, it never executes.
"""

_llm = ChatGroq(
    model="openai/gpt-oss-20b",
    groq_api_key=os.environ.get("GROQ_API_KEY"),
    temperature=0,
)


def _invoke_agent_with_retry(agent, messages, max_attempts=5, backoff_seconds=1.0):
    # same tool_use_failed retry behavior as research_agent.py
    last_exc = None
    for attempt in range(max_attempts):
        try:
            return agent.invoke({"messages": messages})
        except Exception as exc:
            is_tool_use_failure = "tool_use_failed" in str(exc) or "Failed to call a function" in str(exc)
            print(f"[summarize_agent] attempt {attempt + 1}/{max_attempts} failed: {repr(exc)}")  # TEMP DEBUG
            if not is_tool_use_failure:
                raise
            last_exc = exc
            if attempt < max_attempts - 1:
                time.sleep(backoff_seconds * (attempt + 1))
    raise last_exc


def run_summarize_agent(
    query: str,
    namespace: str = None,
    meetings: list = None,
    tasks: list = None,
    history: list = None,
    known_facts: str = "",
) -> dict:       
    summarize_tool = make_summarize_tool(namespace, meetings or [], tasks or [])
    agent = create_react_agent(
        _llm,
        tools=[summarize_tool, query_workspace_docs, propose_action],
        prompt=SYSTEM_PROMPT,
    )

    messages = []
    if known_facts:
        messages.append(("system", known_facts))
    for turn in (history or []):
        messages.append((turn["role"], turn["content"]))
    messages.append(("user", query))

    try:
        result = _invoke_agent_with_retry(agent, messages)
        final_message = result["messages"][-1].content
    except Exception as exc:
        print("[summarize_agent] FAILED (all retries exhausted):", repr(exc))  # TEMP DEBUG
        if "tool_use_failed" in str(exc) or "Failed to call a function" in str(exc):
            final_message = (
                "I had trouble summarizing your meetings just now - could you "
                "try again in a moment?"
            )
        else:
            final_message = "The summarize agent hit an error and couldn't complete this request."

    return {
        "agentType": "summarize",
        "result": final_message,
        "sources": None,
        "requiresApproval": False,
        "toolCalls": None,
    }