import os
import json
from langchain_groq import ChatGroq

SYSTEM_PROMPT = """You are a note-structuring assistant for a business workspace.
The user will give you messy, free-text notes (e.g. a call transcript or meeting notes).
Turn them into a structured summary.

Respond with ONLY valid JSON in this exact shape, nothing else:
{
  "key_points": ["...", "..."],
  "action_items": ["...", "..."],
  "mentioned_dates": ["...", "..."]
}

If a category has nothing relevant, return an empty list for it - do not invent items.
"""


def run_structuring_agent(query: str) -> dict:
    """
    Takes raw text (the `query` here is the messy notes themselves, not a
    question) and asks the LLM to extract structure from it. No retrieval
    needed - this agent only looks at what's directly given to it.
    """
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        groq_api_key=os.environ.get("GROQ_API_KEY"),
        temperature=0.1,  # very low - this is extraction, not generation
    )

    response = llm.invoke(
        [
            ("system", SYSTEM_PROMPT),
            ("user", query),
        ]
    )

    structured = _parse_json_safely(response.content)

    return {
        "agentType": "structuring",
        "result": json.dumps(structured, indent=2),
        "sources": None,
        "requiresApproval": False,
        "toolCalls": None,
    }


def _parse_json_safely(raw: str) -> dict:
    """
    LLMs occasionally wrap JSON in markdown fences or add stray text
    despite instructions - same class of "malformed model output" problem
    hit repeatedly on the Financial Agent, so it's worth guarding against
    here too instead of letting json.loads() crash the request.
    """
    cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {
            "key_points": [],
            "action_items": [],
            "mentioned_dates": [],
            "_parse_error": "Model did not return valid JSON",
            "_raw_response": raw,
        }