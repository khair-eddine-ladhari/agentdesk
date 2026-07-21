import os
from langchain_groq import ChatGroq
from tools.retrieval_tool import retrieve

SYSTEM_PROMPT = """You are a document assistant for a business workspace.
Answer the user's question using ONLY the context provided below.
If the context doesn't contain enough information to answer, say so honestly -
do not make up details that aren't in the context.

Context:
{context}
"""


def run_rag_agent(query: str, namespace: str) -> dict:
    """
    1. Retrieve relevant chunks from this workspace's documents (scoped by namespace)
    2. Ask the LLM to answer using only that retrieved context
    3. Return the answer plus which documents it came from, so the response
       is traceable back to a real source instead of being a black box
    """
    chunks = retrieve(query, namespace)

    if not chunks:
        return {
            "agentType": "rag",
            "result": "I couldn't find anything relevant in your workspace's documents to answer that.",
            "sources": [],
            "requiresApproval": False,
            "toolCalls": None,
        }

    context = "\n\n".join(f"[{c['source']}]: {c['text']}" for c in chunks)

    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        groq_api_key=os.environ.get("GROQ_API_KEY"),
        temperature=0.2,  # low temperature - this agent should stay grounded, not creative
    )

    response = llm.invoke(
        [
            ("system", SYSTEM_PROMPT.format(context=context)),
            ("user", query),
        ]
    )

    sources = list({c["source"] for c in chunks})  # de-duplicated

    return {
        "agentType": "rag",
        "result": response.content,
        "sources": sources,
        "requiresApproval": False,  # read-only, nothing to approve
        "toolCalls": None,
    }