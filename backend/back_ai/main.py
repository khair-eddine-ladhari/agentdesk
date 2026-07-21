import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from orchestrator import run_orchestrator

app = FastAPI(title="Workspace Agents Service")

# The Node/Express backend (with its own JWT auth) is what actually faces
# the browser - this service is only ever called server-to-server from
# there, so CORS just needs to allow that one origin, not the public web.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("BACKEND_ORIGIN", "http://localhost:5000")],
    allow_methods=["POST"],
    allow_headers=["*"],
)


class AgentRequest(BaseModel):
    query: str
    namespace: str | None = None  # workspace id used to scope document retrieval


class AgentResponse(BaseModel):
    agentType: str
    result: str
    sources: list[str] | None = None
    requiresApproval: bool
    toolCalls: list[dict] | None = None


@app.post("/agents/run", response_model=AgentResponse)
def run_agent(payload: AgentRequest):
    """
    Single endpoint for the whole agent system. The Node backend has
    already verified the request's JWT and resolved which workspace the
    user belongs to before calling this - by the time a request lands
    here, `namespace` is trusted, not user-suppliable-and-unchecked.
    """
    if not payload.query or not payload.query.strip():
        raise HTTPException(status_code=400, detail="query must not be empty")

    try:
        return run_orchestrator(payload.query, payload.namespace)
    except Exception as exc:
        # Don't leak internals (stack traces, API key errors, etc.) to the
        # caller - log server-side, return a clean generic error instead.
        print(f"[agents.run] error: {exc}")
        raise HTTPException(status_code=500, detail="Agent run failed") from exc


@app.get("/health")
def health():
    return {"status": "ok"}