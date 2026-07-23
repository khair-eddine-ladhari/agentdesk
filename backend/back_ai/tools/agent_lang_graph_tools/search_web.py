import os
from langchain_core.tools import tool
from tavily import TavilyClient

_tavily = TavilyClient(api_key=os.environ.get("TAVILY_API_KEY"))


@tool
def search_web(query: str) -> str:
    """
    Search the web for current, external information not contained in the
    workspace's own documents - e.g. competitor info, market data, general
    facts. Use this when the question needs outside context.
    """
    try:
        results = _tavily.search(query=query, max_results=3)
        snippets = [r["content"] for r in results.get("results", [])]
        if not snippets:
            return "No web results found."
        return "\n\n".join(snippets)
    except Exception as exc:
        return f"Error searching the web: {exc}"