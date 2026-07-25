import os
from langchain_groq import ChatGroq

from agents.rag_agent import run_rag_agent
from agents.structuring_agent import run_structuring_agent
from agents.action_agent import run_action_agent
from agents.research_agent import run_research_agent
from agents.chat_agent import run_chat_agent

CLASSIFY_PROMPT = """You are a router for a workspace assistant with five specialist agents.

FIRST, check this rule: if the message is a greeting, thanks, small talk, or
fewer than 4 words with no clear topic (e.g. "hi", "hello", "hey", "thanks",
"ok", "test", "what's up"), respond with "chat" immediately. Do not consider
the other categories for messages like this.

Otherwise, classify into one of:

- "rag": the user is asking a SIMPLE QUESTION answerable directly from documents
  already stored in their workspace (e.g. "what does our contract say about
  termination?", "summarize the onboarding doc"). Single lookup, single source.

- "structuring": the user has pasted in messy raw text (notes, a transcript,
  a brain dump) and wants it turned into a structured summary, NOT answered
  as a question.

- "action": the user wants something DONE - a task created, an email sent,
  a meeting scheduled, etc.

- "research": the question is COMPLEX and requires combining workspace
  documents with outside web information, doing a calculation, or chaining
  a lookup into a proposed action. Must reference an actual topic - never
  use this for short or vague messages, those are "chat".

- "chat": anything else that's casual conversation or doesn't clearly fit
  the categories above.

Respond with ONLY one word: chat, rag, structuring, action, or research. Nothing else.
"""

VALID_AGENT_TYPES = {"chat", "rag", "structuring", "action", "research"}


def classify_intent(query: str) -> str:
    """
    Short-circuits obvious small talk / greetings without an LLM call -
    Groq's classification isn't fully deterministic even at temperature=0,
    so trivial cases like "hi" shouldn't depend on model judgment at all.
    Falls back to "chat" for anything the LLM returns unexpectedly too.
    """
    stripped = query.strip().lower()
    GREETINGS = {"hi", "hello", "hey", "yo", "thanks", "thank you", "ok", "okay", "sup", "hiya"}

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


def run_orchestrator(
    query: str,
    namespace: str = None,
    forced_type: str = None,
    history: list = None,
    structured_notes: list = None,
) -> dict:
    """
    Single entry point for the whole agent system. Classifies the query,
    then dispatches to whichever agent matches - each agent already
    returns the same shape (agentType, result, sources, requiresApproval,
    toolCalls), so the orchestrator doesn't need to reshape anything,
    just pick who answers.

    If `forced_type` is provided, classification is skipped entirely and
    the query is routed straight to that agent.
    """
    intent = forced_type if forced_type in VALID_AGENT_TYPES else classify_intent(query)
    history = history or []
    known_facts = build_known_facts(structured_notes or [])

    if intent == "chat":
        return run_chat_agent(query, history=history, known_facts=known_facts)

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
        return run_structuring_agent(query)

    if intent == "research":
        return run_research_agent(query, namespace, history=history, known_facts=known_facts)

    return run_action_agent(query, history=history, known_facts=known_facts)