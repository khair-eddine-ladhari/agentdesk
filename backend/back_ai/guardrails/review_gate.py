"""
review_gate.py

The single checkpoint between "the agent wants to do X" and "X actually happens".

action_agent.py only ever *proposes* an action - it returns something like:

    {
        "requiresApproval": True,
        "toolCalls": [
            {
                "tool": "send_email" | "create_task",
                "summary": "human-readable description shown in the approval UI",
                "parameters": { ... whatever the LLM produced ... }
            }
        ]
    }

Nothing has actually happened at that point. This file is what turns an
approved proposal into a real side effect - and it's the ONLY place allowed
to call the real tool functions (send_email / create_task). Nothing else in
the codebase should import email_tool.py or task_tool.py directly.

Responsibilities, in order:
    1. validate_tool_call   - is the proposal well-formed and permitted at all?
    2. format_for_review    - turn it into something a human can read/approve/edit
    3. apply_decision        - the actual gate: nothing runs without human approval
    4. execute_approved_call - re-attach TRUSTED context (workspace_id, created_by)
                               from the authenticated request, never from the LLM's
                               output, then call the real tool

Same principle as req.userId in your auth middleware: identity/ownership fields
are supplied by the server's authenticated session, never trusted from anywhere
the model or the client could have influenced.
"""

from dataclasses import dataclass, field
from typing import Any, Callable, Optional
import time

from backend.agents.tools.email_tool import send_email
from backend.agents.tools.task_tool import create_task


# ---------------------------------------------------------------------------
# What each tool is allowed to touch, and how to actually invoke it once
# approved. Adding a new actionable tool means adding one line here - nothing
# else in this file should need to change per-tool.
# ---------------------------------------------------------------------------

_ALLOWED_TOOLS: dict[str, dict[str, Any]] = {
    "send_email": {
        "required_fields": ("to", "subject", "body"),
        # send_email() doesn't need workspace/identity context today, but the
        # signature is kept uniform so every executor can be called the same way.
        "executor": lambda parameters, workspace_id, created_by: send_email(parameters),
    },
    "create_task": {
        "required_fields": ("title",),
        "executor": lambda parameters, workspace_id, created_by: create_task(
            parameters, workspace_id, created_by
        ),
    },
}


class ReviewGateError(Exception):
    """Raised when a proposal can't even be shown for review (malformed / not permitted)."""


@dataclass
class PendingReview:
    """
    A validated, not-yet-decided proposal. This is what gets persisted
    (DB, cache, in-memory store - whatever /agents/approve reads from)
    between "agent proposed this" and "human clicked approve/reject".
    """
    review_id: str
    tool: str
    summary: str
    parameters: dict[str, Any]
    workspace_id: str
    requested_by: str
    created_at: float = field(default_factory=time.time)
    status: str = "pending"  # "pending" | "approved" | "rejected"


# ---------------------------------------------------------------------------
# 1. Validate
# ---------------------------------------------------------------------------

def validate_tool_call(tool_call: dict[str, Any]) -> None:
    """
    Checks a single toolCalls[i] entry from action_agent.py's proposal
    BEFORE it's ever shown to a human. Raises ReviewGateError if the
    proposal shouldn't even reach the approval UI.
    """
    tool = tool_call.get("tool")
    if tool not in _ALLOWED_TOOLS:
        raise ReviewGateError(f"Unknown or disallowed tool: {tool!r}")

    parameters = tool_call.get("parameters")
    if not isinstance(parameters, dict):
        raise ReviewGateError("toolCalls[].parameters must be an object")

    required = _ALLOWED_TOOLS[tool]["required_fields"]
    missing = [f for f in required if not parameters.get(f)]
    if missing:
        raise ReviewGateError(
            f"Proposal for {tool!r} is missing required field(s): {', '.join(missing)}"
        )


# ---------------------------------------------------------------------------
# 2. Format for the approval UI
# ---------------------------------------------------------------------------

def format_for_review(
    tool_call: dict[str, Any],
    workspace_id: str,
    requested_by: str,
    review_id: str,
) -> PendingReview:
    """
    Validates, then packages a proposed toolCall into a PendingReview the
    frontend can render (summary text + editable parameter fields) and that
    /agents/approve can later look up by review_id.
    """
    validate_tool_call(tool_call)

    return PendingReview(
        review_id=review_id,
        tool=tool_call["tool"],
        summary=tool_call.get("summary", f"Run {tool_call['tool']}"),
        parameters=dict(tool_call["parameters"]),  # copy - never hold a shared ref
        workspace_id=workspace_id,
        requested_by=requested_by,
    )


# ---------------------------------------------------------------------------
# 3 & 4. The actual gate: apply the human's decision, then execute
# ---------------------------------------------------------------------------

def apply_decision(
    pending: PendingReview,
    decision: str,
    edited_parameters: Optional[dict[str, Any]] = None,
    *,
    workspace_id: str,
    created_by: str,
) -> dict[str, Any]:
    """
    The gate itself. Call this from your /agents/approve endpoint.

    `pending`            - the PendingReview that was shown to the user
                            (fetched from wherever you stored it, by review_id)
    `decision`           - "approve" or "reject", from the request body
    `edited_parameters`  - if the user edited fields in the approval UI before
                            approving, the edited values; otherwise None and
                            pending.parameters is used as-is
    `workspace_id`       - from the AUTHENTICATED request context (e.g. the
                            logged-in user's session/JWT), never from the
                            request body or the LLM's output
    `created_by`         - same: from the authenticated request context

    Returns a result dict. Never raises for a normal reject - rejection is
    a valid, expected outcome, not an error.
    """
    if pending.status != "pending":
        raise ReviewGateError(
            f"Review {pending.review_id} was already {pending.status}; refusing to act on it again."
        )

    if decision not in ("approve", "reject"):
        raise ReviewGateError(f"Invalid decision: {decision!r}")

    if decision == "reject":
        pending.status = "rejected"
        return {"success": True, "status": "rejected", "review_id": pending.review_id}

    # decision == "approve"
    pending.status = "approved"

    final_parameters = edited_parameters if edited_parameters is not None else pending.parameters
    # Re-validate after edits - a human editing the fields shouldn't be able
    # to bypass the same required-field checks the original proposal had to pass.
    validate_tool_call({"tool": pending.tool, "parameters": final_parameters})

    return execute_approved_call(
        tool=pending.tool,
        parameters=final_parameters,
        workspace_id=workspace_id,
        created_by=created_by,
    )


def execute_approved_call(
    tool: str,
    parameters: dict[str, Any],
    *,
    workspace_id: str,
    created_by: str,
) -> dict[str, Any]:
    """
    The only function in the codebase that should call the real tool
    functions (send_email / create_task). Only reachable via apply_decision()
    with an "approve" decision - never called directly from an agent.

    workspace_id / created_by are deliberately keyword-only and always come
    from the caller's authenticated request context, mirroring req.userId in
    auth.controller.js: the LLM's `parameters` can never smuggle in a
    different workspace or a different author.
    """
    if tool not in _ALLOWED_TOOLS:
        # Should be unreachable if validate_tool_call ran first, but never
        # trust a single layer of defense for something that sends emails
        # or writes to the DB.
        raise ReviewGateError(f"Unknown or disallowed tool: {tool!r}")

    executor: Callable[[dict, str, str], dict] = _ALLOWED_TOOLS[tool]["executor"]

    try:
        result = executor(parameters, workspace_id, created_by)
    except Exception as exc:
        return {"success": False, "error": f"Execution failed: {exc}"}

    result = dict(result)
    result["tool"] = tool
    return result