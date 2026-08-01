"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import AppShell from "@/components/AppShell";
import { Send, Bot, User, Check, X, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { useGlobalContext } from "@/components/GlobalContext"; // adjust path to match your project

const API_URL = process.env.NEXT_PUBLIC_API_URL;

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
  const [historyState, setHistoryState] = useState("loading"); // loading | ready | error
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
        // Persisted decision is the source of truth now - requiresApproval
        // flips to false once an action is resolved, so it can't be used
        // to decide whether to show the card anymore.
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
        { query: text }, // agentType omitted — let the agent service route it
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
    // Optimistic update, with rollback on failure below.
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
        <div className="mx-auto max-w-3xl">
          <p className="text-sm text-muted">Loading workspace…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Chat">
      <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col">
        {historyState === "error" && (
          <div className="mb-3 flex items-center justify-between gap-2 rounded-card border border-danger/30 bg-danger/5 px-3.5 py-2 text-xs text-danger">
            <span className="flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              Couldn't load previous messages. Showing a fresh conversation — your history is
              safe, this page just couldn't reach it.
            </span>
            <button
              onClick={loadHistory}
              className="flex shrink-0 items-center gap-1.5 rounded-pill border border-border px-3 py-1 font-medium text-muted hover:bg-bg"
            >
              <RefreshCw size={12} />
              Retry
            </button>
          </div>
        )}

        {/* Message thread */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto pb-4">
          {historyState === "loading" ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
              <Loader2 size={14} className="animate-spin" />
              Loading conversation…
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-control ${
                    msg.role === "user" ? "bg-ink/5 text-ink" : "bg-accent-soft text-accent"
                  }`}
                >
                  {msg.role === "user" ? <User size={15} /> : <Bot size={15} />}
                </div>

                <div className={`max-w-[75%] ${msg.role === "user" ? "items-end" : ""}`}>
                  <div
                    className={`rounded-card px-4 py-2.5 text-sm shadow-soft ${
                      msg.role === "user"
                        ? "bg-accent text-white"
                        : "border border-border bg-surface text-ink"
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Approval card: renders whenever tool calls exist, regardless
                      of requiresApproval - that flag flips to false once resolved,
                      so it can no longer gate visibility. Status comes from the
                      persisted `decision` field instead. */}
                  {msg.toolCalls?.length > 0 && msg.approvalStatus && (
                    <div className="mt-2 space-y-2">
                      {msg.toolCalls.map((toolCall, i) => (
                        <div
                          key={i}
                          className="rounded-card border border-warn/40 bg-warn-soft px-3.5 py-2.5"
                        >
                          <p className="text-xs font-medium text-ink">
                            Proposed action: {toolCall.tool}
                          </p>
                          <pre className="mt-1 overflow-x-auto text-xs text-muted">
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
                                className="flex items-center gap-1 rounded-pill bg-accent px-3 py-1 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-60"
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
                                className="flex items-center gap-1 rounded-pill border border-border px-3 py-1 text-xs font-medium text-muted hover:bg-bg disabled:opacity-60"
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
                            <p className="mt-2 text-xs font-medium text-accent">
                              Approved and executed
                            </p>
                          )}
                          {msg.approvalStatus === "declined" && (
                            <p className="mt-2 text-xs text-muted">Declined</p>
                          )}
                          {msg.approvalStatus === "failed" && (
                            <p className="mt-2 text-xs text-danger">
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
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">
                <Bot size={15} />
              </div>
              <div className="flex items-center gap-1 rounded-card border border-border bg-surface px-4 py-3 shadow-soft">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
              </div>
            </div>
          )}
        </div>

        {/* Input bar */}
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 border-t border-border bg-bg pt-4"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something, or tell an agent what to do..."
            className="flex-1 rounded-pill border border-border bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-accent text-white hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </AppShell>
  );
}