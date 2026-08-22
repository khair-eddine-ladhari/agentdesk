"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import AppShell from "@/components/AppShell";
import { Send, Bot, User, ExternalLink, Check, X } from "lucide-react";
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

function storageKey(workspaceId) {
  return `shopping:${workspaceId}`;
}

function loadPersistedState(workspaceId) {
  try {
    const raw = localStorage.getItem(storageKey(workspaceId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.messages?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

function savePersistedState(workspaceId, { messages, sessionId, sessionState }) {
  try {
    localStorage.setItem(
      storageKey(workspaceId),
      JSON.stringify({ messages, sessionId, sessionState })
    );
  } catch {
    // localStorage unavailable (SSR, privacy mode, quota) — degrade to
    // in-memory only, same as authHeaders()'s fallback above.
  }
}

// ---------------------------------------------------------------------------
// Markdown rendering for assistant replies
// ---------------------------------------------------------------------------
// The backend (crew.py) returns plain markdown: a "| Store | Product | ... |"
// GFM-style table, an internal "Relevant data found: yes/no" marker line, and
// a short recommendation paragraph. Rendered as raw whitespace-pre-wrap text
// that shows up as a wall of pipes and full Amazon/Walmart query-string URLs.
// This section turns that same text into an actual table with a shortened
// "View listing" link per row and turns the marker into a small badge,
// without adding a markdown-parsing dependency for what is a narrow, known
// output shape.

const RELEVANCE_LINE_RE = /^Relevant data found:\s*(yes|no)\s*$/im;

function splitIntoBlocks(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let buffer = [];
  let bufferType = null; // "table" | "text"

  const flush = () => {
    if (buffer.length) {
      blocks.push({ type: bufferType, lines: buffer });
      buffer = [];
      bufferType = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const isTableRow = /^\|.*\|$/.test(line);

    if (!line) {
      flush();
      continue;
    }
    if (isTableRow) {
      if (bufferType && bufferType !== "table") flush();
      bufferType = "table";
      buffer.push(line);
    } else {
      if (bufferType && bufferType !== "text") flush();
      bufferType = "text";
      buffer.push(line);
    }
  }
  flush();
  return blocks;
}

function parseTable(lines) {
  // Drop the markdown separator row, e.g. "| :--- | :--- |"
  const rows = lines.filter((l) => !/^\|[\s:|-]+\|$/.test(l));
  const cells = rows.map((row) =>
    row
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim())
  );
  const [header, ...body] = cells;
  return { header, body };
}

function renderInline(text) {
  // Minimal **bold** support — the only inline markdown the backend emits.
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function ResultsTable({ header, body }) {
  const linkColIdx = header.findIndex((h) => /^link$/i.test(h));
  const priceColIdx = header.findIndex((h) => /^price$/i.test(h));
  const displayHeader = header.filter((_, i) => i !== linkColIdx);

  return (
    <div className="my-2 overflow-x-auto border border-gray-200">
      <table className="w-full min-w-[560px] border-collapse text-left text-xs">
        <thead>
          <tr style={{ backgroundColor: PURPLE }}>
            {displayHeader.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-3 py-2 font-medium text-white">
                {h}
              </th>
            ))}
            {linkColIdx !== -1 && <th className="px-3 py-2 font-medium text-white" />}
          </tr>
        </thead>
        <tbody>
          {body.map((row, rIdx) => {
            const link = linkColIdx !== -1 ? row[linkColIdx] : null;
            const cellsWithoutLink = row.filter((_, i) => i !== linkColIdx);
            return (
              <tr key={rIdx} className="border-t border-gray-200 align-top">
                {cellsWithoutLink.map((cell, cIdx) => (
                  <td
                    key={cIdx}
                    className={`px-3 py-2 text-black ${
                      cIdx === priceColIdx || (linkColIdx !== -1 && cIdx === priceColIdx)
                        ? "font-medium whitespace-nowrap"
                        : "max-w-[220px]"
                    }`}
                    title={cell}
                  >
                    {cell === "N/A" || /^no data/i.test(cell) ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
                {linkColIdx !== -1 && (
                  <td className="whitespace-nowrap px-3 py-2">
                    {link && link !== "N/A" ? (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium hover:underline"
                        style={{ color: PURPLE }}
                      >
                        View <ExternalLink size={11} />
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RelevanceBadge({ found }) {
  return (
    <div
      className="mb-1.5 inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide"
      style={
        found
          ? { backgroundColor: "#EFE5FF", color: PURPLE }
          : { backgroundColor: "#F3F4F6", color: "#6B7280" }
      }
    >
      {found ? <Check size={11} /> : <X size={11} />}
      {found ? "Match found" : "No exact match"}
    </div>
  );
}

function AssistantMessage({ text }) {
  const blocks = splitIntoBlocks(text);
  if (blocks.length === 1 && blocks[0].type === "text" && !RELEVANCE_LINE_RE.test(text)) {
    // Plain chat/meta/explain reply — no table, no marker. Render as-is.
    return <div className="whitespace-pre-wrap">{renderInline(text)}</div>;
  }

  return (
    <div className="space-y-1">
      {blocks.map((block, i) => {
        if (block.type === "table") {
          const { header, body } = parseTable(block.lines);
          return <ResultsTable key={i} header={header} body={body} />;
        }
        // text block — may contain the relevance marker line plus prose
        const joined = block.lines.join(" ");
        const match = joined.match(RELEVANCE_LINE_RE);
        if (match) {
          const rest = joined.replace(RELEVANCE_LINE_RE, "").trim();
          return (
            <div key={i}>
              <RelevanceBadge found={match[1].toLowerCase() === "yes"} />
              {rest && <p className="leading-relaxed">{renderInline(rest)}</p>}
            </div>
          );
        }
        return (
          <p key={i} className="leading-relaxed">
            {renderInline(joined)}
          </p>
        );
      })}
    </div>
  );
}

export default function ShoppingPage() {
  const { workspace } = useGlobalContext();
  const workspaceId = workspace?._id;

  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef(null);

  // Session state lives in localStorage, scoped per workspace — survives
  // a refresh and a closed tab (no server-side persistence, so it's still
  // scoped to this one browser and doesn't sync across devices).
  const sessionIdRef = useRef(null);
  const sessionStateRef = useRef({ turns: [] });
  const hydratedForRef = useRef(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Rehydrate once per workspace, on first render where workspaceId is known.
  useEffect(() => {
    if (!workspaceId || hydratedForRef.current === workspaceId) return;
    hydratedForRef.current = workspaceId;

    const persisted = loadPersistedState(workspaceId);
    if (persisted) {
      setMessages(persisted.messages);
      sessionIdRef.current = persisted.sessionId ?? null;
      sessionStateRef.current = persisted.sessionState ?? { turns: [] };
    }
    setIsHydrated(true);
  }, [workspaceId]);

  // Persist after every change, but only once hydration has already run —
  // otherwise the first render's default INITIAL_MESSAGES would briefly
  // overwrite whatever was already saved for this workspace.
  useEffect(() => {
    if (!workspaceId || !isHydrated) return;
    savePersistedState(workspaceId, {
      messages,
      sessionId: sessionIdRef.current,
      sessionState: sessionStateRef.current,
    });
  }, [workspaceId, isHydrated, messages]);

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
                className={`text-sm ${
                  msg.role === "user"
                    ? "max-w-[75%] whitespace-pre-wrap px-4 py-2.5 text-white"
                    : "max-w-[85%] border border-gray-200 bg-white px-4 py-2.5 text-black"
                }`}
                style={msg.role === "user" ? { backgroundColor: "#0a0a0a" } : undefined}
              >
                {msg.role === "assistant" ? <AssistantMessage text={msg.text} /> : msg.text}
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