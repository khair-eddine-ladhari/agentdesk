import os
from langchain_groq import ChatGroq

from agents.rag_agent import run_rag_agent
from agents.structuring_agent import run_structuring_agent
from agents.action_agent import run_action_agent
from agents.research_agent import run_research_agent

CLASSIFY_PROMPT = """You are a router for a workspace assistant with four specialist agents:

- "rag": the user is asking a SIMPLE QUESTION answerable directly from documents
  already stored in their workspace (e.g. "what does our contract say about
  termination?", "summarize the onboarding doc"). Single lookup, single source.

- "structuring": the user has pasted in messy raw text (notes, a transcript,
  a brain dump) and wants it turned into a structured summary, NOT answered
  as a question.

- "action": the user wants something DONE - a task created, an email sent,
  a meeting scheduled, etc.

- "research": the question is COMPLEX or MIXED - it needs combining workspace
  documents with outside web information, doing a calculation, chaining a
  lookup into a proposed action, or the question is broad/ambiguous enough
  that it's unclear which single source answers it (e.g. "is our pricing
  competitive?", "check upgrade terms and draft a follow-up if it makes
  sense", "what's changed with [competitor] and do our docs address it?").

Respond with ONLY one word: rag, structuring, action, or research. Nothing else.
"""

VALID_AGENT_TYPES = {"rag", "structuring", "action", "research"}


def classify_intent(query: str) -> str:
    """
    Asks the LLM which agent should handle this query. Falls back to "rag"
    if the model returns anything unexpected - answering a question badly
    is a safer default than silently doing nothing, and far safer than
    guessing "action" and proposing something nobody asked for.
    """
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
    return intent if intent in VALID_AGENT_TYPES else "rag"


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

def run_orchestrator(query, namespace=None, forced_type=None, history=None, structured_notes=None):
    intent = forced_type if forced_type in VALID_AGENT_TYPES else classify_intent(query)
    history = history or []
    known_facts = build_known_facts(structured_notes or [])

    if intent == "rag":
        if not namespace:
            return {
                "agentType": "rag",
                "result": "This looks like a document question, but no workspace was specified to search.",
                "sources": [],
                "requiresApproval": False,
                "toolCalls": None,
            }
        return run_rag_agent(query, namespace, history=history, known_facts=known_facts)

    if intent == "structuring":
        return run_structuring_agent(query)  # still excluded — this IS how notes get created, not consume them

    if intent == "research":
        return run_research_agent(query, namespace, history=history, known_facts=known_facts)

    return run_action_agent(query, history=history, known_facts=known_facts)