// These shapes must mirror the Pydantic models on the Python side
// (backend/agents/main.py). Keeping them in sync is what catches
// malformed agent responses at the Node<->Python boundary before
// they reach the frontend.

export type AgentType = "rag" | "structuring" | "action";

export interface AgentRequest {
  workspaceId: string;
  pineconeNamespace: string;
  agentType: AgentType;
  query: string;
}

export interface AgentResponse {
  agentType: AgentType;
  result: string;
  sources?: string[]; // document filenames the RAG agent pulled from
  requiresApproval: boolean; // true for anything the action agent wants to execute
  toolCalls?: Array<{ tool: string; input: Record<string, unknown> }>;
}