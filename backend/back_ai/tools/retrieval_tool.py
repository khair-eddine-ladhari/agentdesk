import os
from pinecone import Pinecone

_pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
_index = _pc.Index(os.environ.get("PINECONE_INDEX_NAME", "workspace-docs"))

TOP_K = 5


def retrieve(query: str, namespace: str) -> list[dict]:
    """
    Searches only within this workspace's namespace (so one workspace can
    never see another workspace's documents), and returns the matched
    chunks with their source filename attached - this is what lets
    rag_agent.py's answers be traced back to a real document instead of
    being a black box.

    No separate embedding call is needed here - the index itself was
    created with an integrated embedding model, so Pinecone embeds the
    raw query text server-side and searches in the same step.
    """
    results = _index.search(
        namespace=namespace,
        query={
            "inputs": {"text": query},
            "top_k": TOP_K,
        },
        fields=["text", "source"],
    )

    hits = results.get("result", {}).get("hits", [])

    return [
        {
            "text": hit["fields"]["text"],
            "source": hit["fields"].get("source", "unknown"),
            "score": hit["_score"],
        }
        for hit in hits
        if hit.get("fields", {}).get("text")
    ]