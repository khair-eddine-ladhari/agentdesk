import os
from langchain_groq import ChatGroq

from agents.rag_agent import run_rag_agent
from agents.structuring_agent import run_structuring_agent
from agents.action_agent import run_action_agent
from agents.research_agent import run_research_agent
from agents.chat_agent import run_chat_agent


CLASSIFY_PROMPT = """You are a router for a workspace assistant with five specialist agents.

FIRST, if the message is a greeting, thanks, small talk, or fewer than 4 words
with no clear topic (e.g. "hi", "hello", "hey", "thanks", "ok", "test",
"what's up"), respond with "chat" immediately.

Otherwise, classify into one of:

- "chat": the user is making casual conversation—a greeting, small talk,
  or a vague/general message that isn't a specific document question,
  messy notes to structure, an action request, or a complex research
  question.

- "rag": the user is asking a SIMPLE QUESTION answerable directly from
  documents already stored in their workspace (e.g. "what does our
  contract say about termination?", "summarize the onboarding doc").
  Single lookup, single source.

- "structuring": the user has pasted messy raw text (notes, transcript,
  brainstorm, etc.) and wants it organized into a structured summary,
  not answered as a question.

- "action": the user wants something DONE—a task created, an email sent,
  a meeting scheduled, etc.

- "research": the question is COMPLEX and requires combining workspace
  documents with outside web information, performing calculations,
  or chaining multiple reasoning steps. It must reference an actual topic;
  never use this for short or vague messages.

Respond with ONLY one word:
chat, rag, structuring, action, or research.
"""

VALID_AGENT_TYPES = {"chat", "rag", "structuring", "action", "research"}


def classify_intent(query: str) -> str:
    """
    Short-circuits obvious greetings and small talk without an LLM call.
    Groq's classification isn't perfectly deterministic, so trivial cases
    like "hi" should always route to the chat agent.

    Falls back to "chat" if the LLM returns anything unexpected.
    """
    stripped = query.strip().lower()

    GREETINGS = {
        "hi",
        "hello",
        "hey",
        "yo",
        "thanks",
        "thank you",
        "ok",
        "okay",
        "sup",
        "hiya",
    }

    if stripped in GREETINGS or len(stripped.split()) <= 2:
        return "chat"

    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        groq_api_key=os.environ.get("GROQ_API_KEY"),
        temperature=0,
    )

    response = llm.invoke(
        [
            ("system", CLASSIFY_PROMPT),
            ("user", query),
        ]
    )

    intent = response.content.strip().lower()
    return intent if intent in VALID_AGENT_TYPES else "chat"


def build_known_facts(structured_notes: list) -> str:
    """Flattens accumulated structured notes into one compact context block."""
    if not structured_notes:
        return ""

    lines = ["Known facts already extracted from workspace documents:"]

    for note in structured_notes:
        lines += [f"- {p}" for p in note.get("key_points", [])]
        lines += [f"- ACTION: {a}" for a in note.get("action_items", [])]
        lines += [f"- DATE: {d}" for d in note.get("mentioned_dates", [])]

    return "\n".join(lines)


def _last_assistant_turn(history: list) -> dict | None:
    for turn in reversed(history or []):
        if turn.get("role") == "assistant":
            return turn
    return None


def run_orchestrator(
    query: str,
    namespace: str = None,
    forced_type: str = None,
    history: list = None,
    structured_notes: list = None,
) -> dict:
    """
    Main entry point for the agent system.

    If `forced_type` is supplied, classification is skipped and the
    request is routed directly to that agent. Otherwise, the query is
    classified and dispatched to the appropriate specialist agent -
    UNLESS the previous assistant turn was the action agent asking a
    clarifying question (agentType "action", requiresApproval False),
    in which case we stay on "action" instead of re-classifying. A bare
    reply like an email address or "just what your hand" has no signal
    for the classifier to work with and will otherwise get misrouted to
    chat, orphaning the in-progress action.
    """
    history = history or []
    known_facts = build_known_facts(structured_notes or [])

    if forced_type in VALID_AGENT_TYPES:
        intent = forced_type
    else:
        last_turn = _last_assistant_turn(history)
        if (
            last_turn
            and last_turn.get("agentType") == "action"
            and last_turn.get("requiresApproval") is False
        ):
            intent = "action"
        else:
            intent = classify_intent(query)

    if intent == "chat":
        return run_chat_agent(
            query,
            history=history,
            known_facts=known_facts,
        )

    if intent == "rag":
        if not namespace:
            return {
                "agentType": "rag",
                "result": (
                    "This looks like a document question, "
                    "but no workspace was specified to search."
                ),
                "sources": [],
                "requiresApproval": False,
                "toolCalls": None,
            }

        return run_rag_agent(
            query,
            namespace,
            history=history,
            known_facts=known_facts,
        )

    if intent == "structuring":
        return run_structuring_agent(query)

    if intent == "research":
        return run_research_agent(
            query,
            namespace,
            history=history,
            known_facts=known_facts,
        )

    return run_action_agent(
        query,
        history=history,
        known_facts=known_facts,
    )