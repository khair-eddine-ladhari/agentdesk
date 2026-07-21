import os
from langchain_groq import ChatGroq

from agents.rag_agent import run_rag_agent
from agents.structuring_agent import run_structuring_agent
from agents.action_agent import run_action_agent

CLASSIFY_PROMPT = """You are a router for a workspace assistant with three specialist agents:

- "rag": the user is asking a QUESTION that should be answered using documents
  already stored in their workspace (e.g. "what does our contract say about
  termination?", "summarize the onboarding doc").
- "structuring": the user has pasted in messy raw text (notes, a transcript,
  a brain dump) and wants it turned into a structured summary, NOT answered
  as a question.
- "action": the user wants something DONE - a task created, an email sent,
  a meeting scheduled, etc.

Respond with ONLY one word: rag, structuring, or action. Nothing else.
"""

VALID_AGENT_TYPES = {"rag", "structuring", "action"}


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
        temperature=0,  # deterministic - this is a classification, not generation
    )

    response = llm.invoke(
        [
            ("system", CLASSIFY_PROMPT),
            ("user", query),
        ]
    )

    intent = response.content.strip().lower()
    return intent if intent in VALID_AGENT_TYPES else "rag"


def run_orchestrator(query: str, namespace: str = None) -> dict:
    """
    Single entry point for the whole agent system. Classifies the query,
    then dispatches to whichever agent matches - each agent already
    returns the same shape (agentType, result, sources, requiresApproval,
    toolCalls), so the orchestrator doesn't need to reshape anything,
    just pick who answers.
    """
    intent = classify_intent(query)

    if intent == "rag":
        if not namespace:
            return {
                "agentType": "rag",
                "result": "This looks like a document question, but no workspace was specified to search.",
                "sources": [],
                "requiresApproval": False,
                "toolCalls": None,
            }
        return run_rag_agent(query, namespace)

    if intent == "structuring":
        return run_structuring_agent(query)

    return run_action_agent(query)