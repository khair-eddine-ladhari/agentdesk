from langchain_core.tools import tool
from agents.action_agent import run_action_agent


@tool
def propose_action(request: str) -> str:
    """
    Propose a concrete action (create a task, send an email, schedule a
    meeting) based on a natural-language description. This does NOT
    execute anything - it only drafts a proposal for human approval.
    Use this when the research conclusion implies something should be done.
    """
    result = run_action_agent(request)
    return result.get("result", "Could not generate a proposed action.")