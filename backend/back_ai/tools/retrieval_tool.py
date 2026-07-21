import os
from pinecone import Pinecone

_pc = None
_index = None


def _get_index():
    """
    Lazy-init the Pinecone client and index. Doing this at import time
    instead would crash the whole service on startup if the API key is
    missing - better to fail only when a request actually needs it.
    """
    global _pc, _index
    if _index is None:
        api_key = os.environ.get("PINECONE_API_KEY")
        if not api_key:
            raise ValueError("PINECONE_API_KEY is not set")
        _pc = Pinecone(api_key=api_key)
        _index = _pc.Index(os.environ.get("PINECONE_INDEX", "agentdesk-docs"))
    return _index


def retrieve(query: str, namespace: str, top_k: int = 4) -> list[dict]:
    """
    Searches only within one workspace's namespace - this is the actual
    enforcement point for multi-tenant data isolation on the RAG side.
    A bug here (e.g. forgetting to pass `namespace`) would leak one
    workspace's documents into another's answers, so this is the one
    function in the whole agent service worth double-checking carefully.

    Returns a list of {"text": ..., "source": ..., "score": ...} dicts,
    most relevant first.
    """
    index = _get_index()

    results = index.query(
        vector=_embed(query),
        top_k=top_k,
        namespace=namespace,
        include_metadata=True,
    )

    return [
        {
            "text": match["metadata"].get("text", ""),
            "source": match["metadata"].get("source", "unknown"),
            "score": match["score"],
        }
        for match in results.get("matches", [])
    ]


def _embed(text: str) -> list[float]:
    """
    Placeholder - real embedding model call goes here. Left unimplemented
    until document ingestion is built.
    """
    raise NotImplementedError("Embedding model not wired up yet")