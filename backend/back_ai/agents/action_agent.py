import os
import json
from langchain_groq import ChatGroq

SYSTEM_PROMPT = """You are an action-planning assistant for a business workspace.
The user will describe something they want done (e.g. "create a task for Sarah to
review the contract by Friday", "schedule a meeting with the design team").

Your job is NOT to perform the action - you only PROPOSE it. A human will review
and approve or reject your proposal before anything actually happens.

Respond with ONLY valid JSON in this exact shape, nothing else:
{
  "action": "create_task" | "send_email" | "schedule_meeting" | "unknown",
  "summary": "...",
  "parameters": {
    // for create_task: { "title": string, "assignee": string, "dueDate": string }
    // for send_email: { "to": string, "subject": string, "body": string }
    // for schedule_meeting: { "attendees": [string], "time": string, "title": string }
  }
}

If the request doesn't clearly map to a supported action, or is missing required
info, use "action": "unknown" and explain what's missing in "summary". Never
invent details (names, dates, emails) that weren't given to you.
"""


def run_action_agent(query: str) -> dict:
    """
    Takes a natural-language request and asks the LLM to turn it into a
    structured, proposed action - not an executed one. This agent never
    calls a real tool itself; it only produces a toolCalls payload that
    some approval step (a UI confirmation, an /approve endpoint, etc.)
    is responsible for executing.
    """
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        groq_api_key=os.environ.get("GROQ_API_KEY"),
        temperature=0.1,  # low - this is structured planning, not creative writing
    )

    response = llm.invoke(
        [
            ("system", SYSTEM_PROMPT),
            ("user", query),
        ]
    )

    proposed = _parse_json_safely(response.content)

    if proposed.get("action") == "unknown" or "_parse_error" in proposed:
        return {
            "agentType": "action",
            "result": proposed.get("summary", "I couldn't determine a clear action from that request."),
            "sources": None,
            "requiresApproval": False,  # nothing valid to approve
            "toolCalls": None,
        }

    return {
        "agentType": "action",
        "result": proposed.get("summary", ""),
        "sources": None,
        "requiresApproval": True,  # the whole point of this agent - nothing executes yet
        "toolCalls": [
            {
                "tool": proposed.get("action"),
                "parameters": proposed.get("parameters", {}),
            }
        ],
    }


def _parse_json_safely(raw: str) -> dict:
    """
    Same guard used in structuring_agent.py - LLMs sometimes wrap JSON in
    markdown fences or add stray text despite instructions, so this is
    defended against instead of letting json.loads() crash the request.
    """
    cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {
            "action": "unknown",
            "summary": "Model did not return valid JSON",
            "parameters": {},
            "_parse_error": True,
            "_raw_response": raw,
        }