from dotenv import load_dotenv
load_dotenv()
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from orchestrator import run_orchestrator
from ingestion_tool import ingest_document


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


class ChatTurn(BaseModel):
    role: str      # "user" or "assistant"
    content: str

class StructuredNoteSummary(BaseModel):
    key_points: list[str] = []
    action_items: list[str] = []
    mentioned_dates: list[str] = []

class AgentRequest(BaseModel):
    query: str
    namespace: str | None = None
    agentType: str | None = None
    history: list[ChatTurn] = []
    structuredNotes: list[StructuredNoteSummary] = []

    
@app.post("/agents/run", response_model=AgentResponse)
def run_agent(payload: AgentRequest):
    if not payload.query or not payload.query.strip():
        raise HTTPException(status_code=400, detail="query must not be empty")

    try:
        return run_orchestrator(
    payload.query,
    payload.namespace,
    forced_type=payload.agentType,
    history=[turn.dict() for turn in payload.history],
    structured_notes=[note.dict() for note in payload.structuredNotes],
)
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


@app.get("/health")
def health():
    return {"status": "ok"}