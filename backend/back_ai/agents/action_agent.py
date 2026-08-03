import os
import re
import json
from langchain_groq import ChatGroq

SYSTEM_PROMPT = """You are an action-planning assistant for a business workspace.
The user will describe something they want done (e.g. "create a task for Sarah to
review the contract by Friday", "schedule a meeting with the design team").

Your job is NOT to perform the action - you only PROPOSE it. A human will review
and approve or reject your proposal before anything actually happens.

IMPORTANT: Always generate a NEW proposal based ONLY on the user's most recent
message. If a previous proposal in this conversation was for a different action
(e.g. send_email), and the user's latest message asks for something else (e.g.
a meeting), completely ignore the previous action's type and parameters - do
not reuse or blend them. Only revise a previous proposal if the user is clearly
asking to modify that SAME action (e.g. "change the time", "also cc Sarah").

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
invent details (names, dates, emails) that weren't given to you. You may use
conversation history and known workspace facts below to fill in details the
user referenced but didn't repeat (e.g. "the demo we discussed" -> look up the
date in known facts), but never invent anything not present in either.

For send_email specifically: the "to" field MUST be a real email address
(e.g. "baha@company.com"), never a first name, nickname, or username. If the
user only gives you a name and no email address is available in conversation
history or known workspace facts, treat the email address as missing required
info - use "action": "unknown" and ask the user for the recipient's email
address in "summary". Do not guess or construct an email address from a name.
"""

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def run_action_agent(query: str, history: list = None, known_facts: str = "") -> dict:
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

    system_content = SYSTEM_PROMPT
    if known_facts:
        system_content += f"\n\n{known_facts}"

    messages = [("system", system_content)]
    for turn in (history or []):
        messages.append((turn["role"], turn["content"]))
    messages.append(("user", query))

    proposed = _invoke_with_retry(llm, messages)
    proposed = _validate_proposal(proposed)

    if proposed.get("action") == "unknown" or "_parse_error" in proposed:
        return {
            "agentType": "action",
            "result": proposed.get(
                "summary",
                "I couldn't determine a clear action from that request - could you rephrase it?",
            ),
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


def _invoke_with_retry(llm, messages, max_attempts=3):
    """
    Retries on malformed JSON output, same rationale as the research
    agent's tool-call retry: occasional generation glitches, not a real
    logic error, and usually clear up on a fresh attempt.
    """
    last_result = None
    for attempt in range(max_attempts):
        response = llm.invoke(messages)
        parsed = _parse_json_safely(response.content)
        if "_parse_error" not in parsed:
            return parsed
        last_result = parsed
        print(f"[action_agent] attempt {attempt + 1}/{max_attempts} - invalid JSON")  # TEMP DEBUG

    # All attempts failed - friendlier message instead of exposing the raw parse error
    last_result["summary"] = (
        "I had trouble structuring that request just now - could you try rephrasing it?"
    )
    return last_result


def _validate_proposal(proposed: dict) -> dict:
    """
    Backstop against the LLM ignoring the 'to' must be an email instruction.
    Downgrades an otherwise-valid proposal to 'unknown' rather than letting
    a doomed approval (e.g. to="Baha") reach the UI.
    """
    if proposed.get("action") != "send_email":
        return proposed

    to = proposed.get("parameters", {}).get("to", "")
    if not EMAIL_RE.match(to):
        return {
            "action": "unknown",
            "summary": (
                f"I don't have a valid email address for \"{to}\" — "
                "could you give me their email so I can send it?"
            ),
            "parameters": {},
        }

    return proposed


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