import os
from pinecone import Pinecone

_pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
_index = _pc.Index(os.environ.get("PINECONE_INDEX_NAME", "workspace-docs"))

EMBEDDING_MODEL = "llama-text-embed-v2"
TOP_K = 5


def retrieve(query: str, namespace: str) -> list[dict]:
    query_vector = _embed(query)

    results = _index.query(
        vector=query_vector,
        namespace=namespace,
        top_k=TOP_K,
        include_metadata=True,
    )

    return [
        {
            "text": match["metadata"]["text"],
            "source": match["metadata"].get("source", "unknown"),
            "score": match["score"],
        }
        for match in results.get("matches", [])
        if match.get("metadata", {}).get("text")
    ]


def _embed(text: str) -> list[float]:
    """
    Turns text into a vector using Pinecone's own hosted embedding model,
    instead of OpenAI's. Same role as before - both indexing (Node.js
    upload side) and querying (here) need to use this same model so
    vectors land in the same embedding space.
    """
    response = _pc.inference.embed(
        model=EMBEDDING_MODEL,
        inputs=[text],
        parameters={"input_type": "query"},
    )
    return response[0]["values"]