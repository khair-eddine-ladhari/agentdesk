import os
from pinecone import Pinecone

_pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
_index = _pc.Index(os.environ.get("PINECONE_INDEX_NAME", "workspace-docs"))

CHUNK_SIZE = 500
CHUNK_OVERLAP = 50


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """
    Fixed-size chunking with overlap. Simple to start with - can be
    swapped for LangChain's RecursiveCharacterTextSplitter later without
    changing anything upstream (Node) or downstream (retrieval_tool.py),
    since chunking strategy lives entirely here now.
    """
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start = end - overlap
    return chunks


def ingest_document(text: str, namespace: str, document_id: str, filename: str) -> int:
    """
    Chunks raw text and upserts it into Pinecone under the given
    namespace. Uses upsert_records (plain text in) since the index was
    created with an integrated embedding model - Pinecone embeds
    server-side, same as retrieval_tool.py's query side. Returns the
    number of chunks written, so the caller (main.py) can report it back.
    """
    if not text or not text.strip():
        raise ValueError("Text is empty - nothing to ingest")

    chunks = chunk_text(text)

    records = [
        {
            "_id": f"{document_id}-chunk-{i}",
            "text": chunk,
            "source": filename,
        }
        for i, chunk in enumerate(chunks)
    ]

    _index.upsert_records(namespace=namespace, records=records)

    return len(chunks)