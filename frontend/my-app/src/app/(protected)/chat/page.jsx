"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import AppShell from "@/components/AppShell";
import { Send, Bot, User, Check, X, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { useGlobalContext } from "@/components/GlobalContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const PURPLE = "#8A05FF";

function authHeaders() {
  try {
    const token = sessionStorage.getItem("adminToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

const INITIAL_MESSAGES = [
  {
    id: "m0",
    role: "assistant",
    text: "Hi — ask me anything about your documents, or tell me what you'd like an agent to do.",
  },
];

export default function ChatPage() {
  const { workspace } = useGlobalContext();
  const workspaceId = workspace?._id;

  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [approvingLogId, setApprovingLogId] = useState(null);
  const [decliningLogId, setDecliningLogId] = useState(null);
  const [historyState, setHistoryState] = useState("loading");
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const loadHistory = useCallback(async () => {
    if (!workspaceId) return;
    setHistoryState("loading");

    try {
      const res = await axios.get(`${API_URL}/workspaces/${workspaceId}/messages`, {
        headers: authHeaders(),
      });
      const data = res.data;

      const history = (data.messages || []).map((m) => ({
        id: m._id || crypto.randomUUID(),
        role: m.role,
        text: m.text,
        agentType: m.agentType,
        toolCalls: m.toolCalls || [],
        logId: m.logId,
        approvalStatus: m.decision || null,
      }));

      setMessages(history.length > 0 ? history : INITIAL_MESSAGES);
      setHistoryState("ready");
    } catch (err) {
      setMessages(INITIAL_MESSAGES);
      setHistoryState("error");
    }
  }, [workspaceId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isSending || !workspaceId) return;

    const userMessage = { id: crypto.randomUUID(), role: "user", text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      const res = await axios.post(
        `${API_URL}/workspaces/${workspaceId}/agent/run`,
        { query: text },
        { headers: authHeaders() }
      );
      const data = res.data;

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: data.result || "Sorry, I couldn't process that.",
          agentType: data.agentType,
          toolCalls: data.toolCalls || [],
          logId: data.logId,
          approvalStatus: data.requiresApproval ? "pending" : null,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text:
            err.response?.data?.error ||
            "Something went wrong reaching the server. Try again in a moment.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  async function handleApprove(messageId, logId, toolCall) {
    setApprovingLogId(logId);
    try {
      const res = await axios.post(
        `${API_URL}/workspaces/${workspaceId}/agent/approve`,
        { logId, tool: toolCall.tool, parameters: toolCall.parameters },
        { headers: authHeaders() }
      );
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, approvalStatus: res.data.success ? "approved" : "failed" }
            : m
        )
      );
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, approvalStatus: "failed" } : m))
      );
    } finally {
      setApprovingLogId(null);
    }
  }

  async function handleDecline(messageId, logId) {
    setDecliningLogId(logId);
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, approvalStatus: "declined" } : m))
    );
    try {
      await axios.post(
        `${API_URL}/workspaces/${workspaceId}/agent/decline`,
        { logId },
        { headers: authHeaders() }
      );
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, approvalStatus: "pending" } : m))
      );
    } finally {
      setDecliningLogId(null);
    }
  }

  if (!workspaceId) {
    return (
      <AppShell title="Chat">
        <div className="mx-auto max-w-3xl bg-white min-h-screen p-6">
          <p className="text-sm text-gray-400">Loading workspace…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Chat">
      <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col bg-white px-6">
        {historyState === "error" && (
          <div className="mb-3 mt-4 flex items-center justify-between gap-2 border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-700">
            <span className="flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              Couldn't load previous messages. Showing a fresh conversation — your history is
              safe, this page just couldn't reach it.
            </span>
            <button
              onClick={loadHistory}
              className="flex shrink-0 items-center gap-1.5 border border-gray-300 px-3 py-1 font-medium text-gray-500 hover:bg-gray-50"
            >
              <RefreshCw size={12} />
              Retry
            </button>
          </div>
        )}

        {/* Message thread */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto pt-4 pb-4">
          {historyState === "loading" ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
              <Loader2 size={14} className="animate-spin" style={{ color: PURPLE }} />
              Loading conversation…
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center"
                  style={
                    msg.role === "user"
                      ? { backgroundColor: "#0a0a0a", color: "#fff" }
                      : { backgroundColor: PURPLE, color: "#fff" }
                  }
                >
                  {msg.role === "user" ? <User size={15} /> : <Bot size={15} />}
                </div>

                <div className={`max-w-[75%] ${msg.role === "user" ? "items-end" : ""}`}>
                  <div
                    className={`px-4 py-2.5 text-sm ${
                      msg.role === "user"
                        ? "text-white"
                        : "border border-gray-200 bg-white text-black"
                    }`}
                    style={msg.role === "user" ? { backgroundColor: "#0a0a0a" } : undefined}
                  >
                    {msg.text}
                  </div>

                  {msg.toolCalls?.length > 0 && msg.approvalStatus && (
                    <div className="mt-2 space-y-2">
                      {msg.toolCalls.map((toolCall, i) => (
                        <div
                          key={i}
                          className="border border-amber-300 bg-amber-50 px-3.5 py-2.5"
                        >
                          <p className="text-xs font-medium text-black">
                            Proposed action: {toolCall.tool}
                          </p>
                          <pre className="mt-1 overflow-x-auto text-xs text-gray-500">
                            {JSON.stringify(toolCall.parameters, null, 2)}
                          </pre>

                          {msg.approvalStatus === "pending" && (
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleApprove(msg.id, msg.logId, toolCall)}
                                disabled={
                                  approvingLogId === msg.logId || decliningLogId === msg.logId
                                }
                                className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
                                style={{ backgroundColor: PURPLE }}
                              >
                                {approvingLogId === msg.logId ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <Check size={12} />
                                )}
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDecline(msg.id, msg.logId)}
                                disabled={
                                  approvingLogId === msg.logId || decliningLogId === msg.logId
                                }
                                className="flex items-center gap-1 border border-gray-300 px-3 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-60"
                              >
                                {decliningLogId === msg.logId ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <X size={12} />
                                )}
                                Decline
                              </button>
                            </div>
                          )}
                          {msg.approvalStatus === "approved" && (
                            <p className="mt-2 text-xs font-medium" style={{ color: PURPLE }}>
                              Approved and executed
                            </p>
                          )}
                          {msg.approvalStatus === "declined" && (
                            <p className="mt-2 text-xs text-gray-400">Declined</p>
                          )}
                          {msg.approvalStatus === "failed" && (
                            <p className="mt-2 text-xs text-red-600">
                              Approval failed — check the audit log
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {isSending && (
            <div className="flex gap-3">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center text-white"
                style={{ backgroundColor: PURPLE }}
              >
                <Bot size={15} />
              </div>
              <div className="flex items-center gap-1 border border-gray-200 bg-white px-4 py-3">
                <span className="h-1.5 w-1.5 animate-bounce bg-gray-300 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce bg-gray-300 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce bg-gray-300" />
              </div>
            </div>
          )}
        </div>

        {/* Input bar */}
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 border-t border-gray-200 bg-white pt-4 pb-6"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something, or tell an agent what to do..."
            className="flex-1 border border-gray-300 px-4 py-2.5 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black"
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className="flex h-10 w-10 shrink-0 items-center justify-center text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: PURPLE }}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </AppShell>
  );
}