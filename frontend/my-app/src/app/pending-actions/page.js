"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import { Clock, FileText, MessageSquare, Bot } from "lucide-react";

// Placeholder data — swap for real fetches later
const INITIAL_ACTIONS = [
  {
    id: "1",
    title: "Send follow-up email to Acme Corp re: Q3 contract",
    detail:
      "Drafted reply confirming the revised payment terms discussed on the call, and attaching the updated contract PDF.",
    source: "contract-notes.docx",
    sourceType: "document",
    agent: "Email Agent",
    time: "12 min ago",
    params: [
      { label: "To", value: "procurement@acmecorp.com" },
      { label: "Subject", value: "Re: Q3 Contract — Revised Terms" },
    ],
  },
  {
    id: "2",
    title: "Create 4 tasks in project tracker from meeting notes",
    detail:
      "Extracted four action items from yesterday's standup and mapped them to the Nova Inc. project board.",
    source: "standup-2026-07-25.txt",
    sourceType: "document",
    agent: "Task Agent",
    time: "1 hour ago",
    params: [
      { label: "Project", value: "Nova Inc." },
      { label: "Tasks", value: "4 items" },
    ],
  },
  {
    id: "3",
    title: "Update client record with new billing address",
    detail:
      "Client mentioned a new billing address during chat. Proposing to update their CRM record accordingly.",
    source: "chat conversation",
    sourceType: "chat",
    agent: "CRM Agent",
    time: "3 hours ago",
    params: [
      { label: "Client", value: "Beta LLC" },
      { label: "Field", value: "Billing address" },
    ],
  },
];

export default function PendingActionsPage() {
  const [actions, setActions] = useState(INITIAL_ACTIONS);
  const [expandedId, setExpandedId] = useState(null);

  function handleDecision(id, decision) {
    // TODO: call PATCH /api/actions/:id with { decision }
    setActions((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <AppShell title="Pending Actions" pendingCount={actions.length}>
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="text-sm text-muted">
          {actions.length === 0
            ? "Nothing waiting on you right now."
            : `${actions.length} action${actions.length === 1 ? "" : "s"} waiting on your review.`}
        </p>

        {actions.length === 0 && (
          <div className="rounded-card border border-border bg-surface p-10 text-center shadow-soft">
            <p className="text-sm font-medium text-ink">All caught up</p>
            <p className="mt-1 text-sm text-muted">
              New actions from your agents will show up here as they come in.
            </p>
          </div>
        )}

        {actions.map((action) => {
          const isExpanded = expandedId === action.id;
          const SourceIcon = action.sourceType === "chat" ? MessageSquare : FileText;

          return (
            <div
              key={action.id}
              className="rounded-card border border-border bg-surface shadow-soft"
            >
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : action.id)}
                className="flex w-full items-start justify-between gap-4 p-4 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{action.title}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className="flex items-center gap-1 rounded-pill bg-accent-soft px-2 py-0.5 text-accent">
                      <Bot size={12} />
                      {action.agent}
                    </span>
                    <span className="flex items-center gap-1">
                      <SourceIcon size={12} />
                      {action.source}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {action.time}
                    </span>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-border px-4 py-4">
                  <p className="text-sm text-ink/90 leading-relaxed">
                    {action.detail}
                  </p>
                  <div className="mt-3 space-y-1.5">
                    {action.params.map((p) => (
                      <div key={p.label} className="flex gap-2 text-xs">
                        <span className="w-20 shrink-0 text-muted">{p.label}</span>
                        <span className="font-mono text-ink">{p.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
                <button
                  type="button"
                  onClick={() => handleDecision(action.id, "rejected")}
                  className="rounded-pill border border-border px-3.5 py-1.5 text-xs font-medium text-muted hover:bg-bg"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => handleDecision(action.id, "approved")}
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