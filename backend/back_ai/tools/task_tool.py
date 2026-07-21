import os
from datetime import datetime
from pymongo import MongoClient

_client = MongoClient(os.environ.get("MONGO_URI"))
_db = _client[os.environ.get("MONGO_DB_NAME", "workspace_app")]
_tasks = _db["tasks"]


def create_task(parameters: dict, workspace_id: str, created_by: str) -> dict:
    """
    Actually creates a task document. Like send_email(), this only runs
    AFTER a human approves the proposal action_agent.py made - it never
    runs off the agent's output directly.

    `parameters` is toolCalls[0]["parameters"] from the agent's proposal
    (possibly edited in the approval UI first) - expected shape:
    {"title": "...", "assignee": "...", "dueDate": "..." (optional)}

    `workspace_id` and `created_by` are NOT taken from the LLM's output -
    same principle as req.userId in auth.controller.js: they come from
    the authenticated request context, not from anything user-suppliable
    inside `parameters`, so an agent can never assign a task into a
    workspace it doesn't belong to.
    """
    if not parameters.get("title"):
        return {"success": False, "error": "Missing required field: title"}

    task = {
        "title": parameters["title"],
        "assignee": parameters.get("assignee"),
        "dueDate": parameters.get("dueDate"),
        "workspace": workspace_id,
        "createdBy": created_by,
        "status": "open",
        "createdAt": datetime.utcnow(),
    }

    try:
        result = _tasks.insert_one(task)
        return {"success": True, "taskId": str(result.inserted_id)}
    except Exception as exc:
        return {"success": False, "error": str(exc)}