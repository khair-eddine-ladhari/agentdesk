from langchain_core.tools import tool
from tools.retrieval_tool import retrieve


@tool
def query_workspace_docs(query: str, namespace: str) -> str:
    """
    Search the workspace's stored documents for information relevant to
    the query. Use this when the question might be answered by something
    already uploaded to this workspace (contracts, notes, filings, policies).
    Returns the most relevant chunks found, with their source, or a
    message if nothing matches.
    """
    if not namespace:
        return "No workspace namespace provided - cannot search workspace documents."

    try:
        results = retrieve(query, namespace)
        if not results:
            return "No relevant workspace documents found for this query."

        return "\n\n".join(
            f"[Source: {r['source']}] {r['text']}" for r in results
        )
    except Exception as exc:
        return f"Error searching workspace documents: {exc}"