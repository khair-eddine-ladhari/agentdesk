

from dotenv import load_dotenv
load_dotenv()
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from orchestrator import run_orchestrator
from ingestion_tool import ingest_document




from tools.email_draft_tool import send_email
# from tools.create_task import create_task
# from tools.schedule_meeting import schedule_meeting





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


class IngestRequest(BaseModel):
    text: str
    namespace: str        # workspace's pineconeNamespace, from Node
    documentId: str        # Mongo _id of the Document record, from Node
    filename: str


class IngestResponse(BaseModel):
    chunkCount: int


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
        print(f"[agents.run] error: {exc}")
        raise HTTPException(status_code=500, detail="Agent run failed") from exc


@app.post("/ingest", response_model=IngestResponse)
def ingest(payload: IngestRequest):
    """
    Called by Node right after a file is saved to disk and its raw text
    extracted. This endpoint owns chunking + embedding + Pinecone upsert -
    Node no longer does any of that, it just forwards plain text here.
    Node updates the Document's status based on whether this call
    succeeds or fails.
    """
    if not payload.text or not payload.text.strip():
        raise HTTPException(status_code=400, detail="text must not be empty")

    try:
        chunk_count = ingest_document(
            text=payload.text,
            namespace=payload.namespace,
            document_id=payload.documentId,
            filename=payload.filename,
        )
        return {"chunkCount": chunk_count}
    except Exception as exc:
        print(f"[ingest] error: {exc}")
        raise HTTPException(status_code=500, detail="Ingestion failed") from exc
    










TOOL_MAP = {
    "send_email": send_email,
    # "create_task": create_task,
    # "schedule_meeting": schedule_meeting,
}

@app.post("/approve")
async def approve_action(payload: dict):
    tool_name = payload.get("tool")
    parameters = payload.get("parameters", {})

    tool_fn = TOOL_MAP.get(tool_name)
    if not tool_fn:
        return {"success": False, "error": f"Unknown tool: {tool_name}"}

    return tool_fn(parameters)






@app.get("/health")
def health():
    return {"status": "ok"}