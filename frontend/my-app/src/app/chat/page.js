"use client";

import { useState, useRef, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { Send, Bot, User, FileText } from "lucide-react";

const INITIAL_MESSAGES = [
  {
    id: "m1",
    role: "assistant",
    text: "Hi — ask me anything about your documents, or tell me what you'd like an agent to do.",
    sources: [],
  },
  {
    id: "m2",
    role: "user",
    text: "What did the Q3 contract say about payment terms?",
    sources: [],
  },
  {
    id: "m3",
    role: "assistant",
    text: "Net-30 from invoice date, with a 2% early-payment discount if paid within 10 days. That's from the revised terms section.",
    sources: ["contract-notes.docx"],
  },
];

export default function ChatPage() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;

    const userMessage = { id: crypto.randomUUID(), role: "user", text, sources: [] };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      // TODO: replace with real call to POST /api/chat
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: data.reply || "Sorry, I couldn't process that.",
          sources: data.sources || [],
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: "Something went wrong reaching the server. Try again in a moment.",
          sources: [],
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <AppShell title="Chat">
      <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col">
        {/* Message thread */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto pb-4">
          {messages.map((msg) => (
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

                {msg.sources.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {msg.sources.map((src) => (
                      <span
                        key={src}
                        className="flex items-center gap-1 rounded-pill border border-border bg-surface px-2 py-0.5 text-xs text-muted"
                      >
                        <FileText size={11} />
                        {src}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

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