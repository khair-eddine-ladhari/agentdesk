"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import AppShell from "@/components/AppShell";
import { Send, Bot, User, Loader2 } from "lucide-react";
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
    text: "Ask me to find and compare products — e.g. \"best budget laptops under $500\".",
  },
];

export default function ShoppingPage() {
  const { workspace } = useGlobalContext();
  const workspaceId = workspace?._id;

  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef(null);

  // Session state lives only in the browser tab — no server-side
  // persistence, matches the "no backend history plumbing" decision.
  const sessionIdRef = useRef(null);
  const sessionStateRef = useRef({ turns: [] });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isSending || !workspaceId) return;

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text }]);
    setInput("");
    setIsSending(true);

    try {
      const res = await axios.post(
        `${API_URL}/workspaces/${workspaceId}/shopping/run`,
        {
          query: text,
          sessionId: sessionIdRef.current,
          sessionState: sessionStateRef.current,
        },
        { headers: authHeaders() }
      );
      const data = res.data;
      sessionIdRef.current = data.sessionId;
      sessionStateRef.current = data.sessionState;

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", text: data.answer },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: err.response?.data?.error || "Search failed. Try again in a moment.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  if (!workspaceId) {
    return (
      <AppShell title="Shopping">
        <div className="mx-auto max-w-3xl bg-white min-h-screen p-6">
          <p className="text-sm text-gray-400">Loading workspace…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Shopping">
      <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col bg-white px-6">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto pt-4 pb-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
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
              <div
                className={`max-w-[75%] whitespace-pre-wrap px-4 py-2.5 text-sm ${
                  msg.role === "user" ? "text-white" : "border border-gray-200 bg-white text-black"
                }`}
                style={msg.role === "user" ? { backgroundColor: "#0a0a0a" } : undefined}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center text-white" style={{ backgroundColor: PURPLE }}>
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

        <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-gray-200 bg-white pt-4 pb-6">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search for products to compare..."
            className="flex-1 border border-gray-300 px-4 py-2.5 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black"
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className="flex h-10 w-10 shrink-0 items-center justify-center text-white hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: PURPLE }}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </AppShell>
  );
}