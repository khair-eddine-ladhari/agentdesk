import os
from langchain_groq import ChatGroq

SYSTEM_PROMPT = """You are a helpful assistant for a business workspace.
The user is just talking casually - greeting you, chatting, or asking
something general that isn't a specific document question, a request to
structure notes, an action to perform, or a complex research question.

Respond naturally and briefly. If it becomes clear the user actually wants
something more specific (looking something up, getting something done,
structuring notes), let them know you can help with that and what to ask
for - but don't force it into that shape unprompted.
You cannot send emails, schedule meetings, create tasks, or perform any
action directly - you can only discuss and draft things. Never say or imply
that you have sent something, scheduled something, or completed a task.
If the user wants something actually done, tell them to phrase it as a
request (e.g. "send an email to...") so it can go through the proper
action-proposal flow with approval.
"""


def run_chat_agent(query: str, history: list = None, known_facts: str = "") -> dict:
    """
    Handles general conversation that doesn't fit the other four
    task-specific agents - greetings, small talk, vague follow-ups.
    Exists so those don't get misrouted into e.g. rag's "nothing found
    in your documents" dead-end response.
    """
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        groq_api_key=os.environ.get("GROQ_API_KEY"),
        temperature=0.4,  # a bit more natural/conversational than the task agents
    )

    system_content = SYSTEM_PROMPT
    if known_facts:
        system_content += f"\n\n{known_facts}"

    messages = [("system", system_content)]
    for turn in (history or []):
        messages.append((turn["role"], turn["content"]))
    messages.append(("user", query))

    response = llm.invoke(messages)

    return {
        "agentType": "chat",
        "result": response.content,
        "sources": None,
        "requiresApproval": False,
        "toolCalls": None,
    }