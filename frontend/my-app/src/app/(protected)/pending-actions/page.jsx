"use client";

import { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useGlobalContext } from "@/components/GlobalContext";
import { Clock, Bot, Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function PendingActionsPage() {
  const { workspace } = useGlobalContext();
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!workspace?._id) return;

    async function fetchActions() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/workspaces/${workspace._id}/actions`, {
          headers: { Authorization: `Bearer ${sessionStorage.getItem("adminToken")}` },
        });
        if (!res.ok) throw new Error(`Failed to load actions (${res.status})`);
        setActions(await res.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchActions();
  }, [workspace?._id]);

  async function handleDecision(id, decision) {
    const prev = actions;
    setActions((cur) => cur.filter((a) => a._id !== id));
    try {
      const res = await fetch(`${API_URL}/workspaces/${workspace._id}/actions/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("adminToken")}`,
        },
        body: JSON.stringify({ decision }),
      });
      if (!res.ok) throw new Error(`Failed to ${decision} action`);
    } catch (err) {
      setActions(prev);
      setError(err.message);
    }
  }

  return (
    <AppShell title="Pending Actions" pendingCount={actions.length}>
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="text-sm text-muted">
          {loading
            ? "Loading actions…"
            : actions.length === 0
            ? "Nothing waiting on you right now."
            : `${actions.length} action${actions.length === 1 ? "" : "s"} waiting on your review.`}
        </p>

        {error && (
          <div className="rounded-card border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-10 text-muted">
            <Loader2 size={18} className="animate-spin" />
          </div>
        )}

        {!loading && actions.length === 0 && !error && (
          <div className="rounded-card border border-border bg-surface p-10 text-center shadow-soft">
            <p className="text-sm font-medium text-ink">All caught up</p>
            <p className="mt-1 text-sm text-muted">
              New actions from your agents will show up here as they come in.
            </p>
          </div>
        )}

        {!loading &&
          actions.map((action) => {
            const isExpanded = expandedId === action._id;

            return (
              <div key={action._id} className="rounded-card border border-border bg-surface shadow-soft">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : action._id)}
                  className="flex w-full items-start justify-between gap-4 p-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{action.summary}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span className="flex items-center gap-1 rounded-pill bg-accent-soft px-2 py-0.5 text-accent">
                        <Bot size={12} />
                        {action.agentType}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(action.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border px-4 py-4">
                    <div className="space-y-1.5">
                      {action.toolCalls &&
                        Object.entries(action.toolCalls).map(([key, value]) => (
                          <div key={key} className="flex gap-2 text-xs">
                            <span className="w-24 shrink-0 text-muted">{key}</span>
                            <span className="font-mono text-ink break-all">
                              {typeof value === "object" ? JSON.stringify(value) : String(value)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleDecision(action._id, "rejected")}
                    className="rounded-pill border border-border px-3.5 py-1.5 text-xs font-medium text-muted hover:bg-bg"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecision(action._id, "approved")}
                    className="rounded-pill bg-accent px-3.5 py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
                  >
                    Approve
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </AppShell>
  );
}