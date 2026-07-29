"use client";

import { useState, useMemo } from "react";
import AppShell from "@/components/AppShell";
import { CheckCircle2, XCircle, Clock, Bot } from "lucide-react";

// Placeholder data — swap for real fetches later
const INITIAL_LOG = [
  {
    id: "l1",
    action: "Send follow-up email to Acme Corp re: Q3 contract",
    agent: "Email Agent",
    status: "approved",
    approvedBy: "Jordan Blake",
    timestamp: "2026-07-27 09:41:12",
  },
  {
    id: "l2",
    action: "Delete stale lead from CRM",
    agent: "CRM Agent",
    status: "rejected",
    approvedBy: "Jordan Blake",
    timestamp: "2026-07-26 16:03:47",
  },
  {
    id: "l3",
    action: "Draft proposal summary for Nova Inc.",
    agent: "Document Agent",
    status: "approved",
    approvedBy: "Sam Rivera",
    timestamp: "2026-07-26 11:45:02",
  },
  {
    id: "l4",
    action: "Create 4 tasks in project tracker from meeting notes",
    agent: "Task Agent",
    status: "pending",
    approvedBy: null,
    timestamp: "2026-07-27 10:52:31",
  },
  {
    id: "l5",
    action: "Schedule kickoff call with Beta LLC",
    agent: "Calendar Agent",
    status: "approved",
    approvedBy: "Jordan Blake",
    timestamp: "2026-07-25 16:12:09",
  },
];

const STATUS_CONFIG = {
  approved: { label: "Approved", icon: CheckCircle2, className: "text-accent bg-accent-soft" },
  rejected: { label: "Rejected", icon: XCircle, className: "text-danger bg-danger-soft" },
  pending: { label: "Pending", icon: Clock, className: "text-warn bg-warn-soft" },
};

const FILTERS = ["all", "approved", "rejected", "pending"];

export default function AuditLogPage() {
  const [filter, setFilter] = useState("all");

  const filteredLog = useMemo(() => {
    if (filter === "all") return INITIAL_LOG;
    return INITIAL_LOG.filter((entry) => entry.status === filter);
  }, [filter]);

  return (
    <AppShell title="Audit Log">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-pill px-3.5 py-1.5 text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? "bg-accent text-white"
                  : "border border-border text-muted hover:bg-bg"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Log table */}
        <div className="overflow-hidden rounded-card border border-border bg-surface shadow-soft">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-bg">
                <th className="px-4 py-2.5 text-xs font-medium text-muted">Action</th>
                <th className="px-4 py-2.5 text-xs font-medium text-muted">Agent</th>
                <th className="px-4 py-2.5 text-xs font-medium text-muted">Status</th>
                <th className="px-4 py-2.5 text-xs font-medium text-muted">By</th>
                <th className="px-4 py-2.5 text-xs font-medium text-muted">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLog.map((entry) => {
                const status = STATUS_CONFIG[entry.status];
                const StatusIcon = status.icon;

                return (
                  <tr key={entry.id}>
                    <td className="max-w-xs truncate px-4 py-3 text-ink">
                      {entry.action}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      <span className="flex items-center gap-1.5">
                        <Bot size={13} className="text-muted" />
                        {entry.agent}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`flex w-fit items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-medium ${status.className}`}
                      >
                        <StatusIcon size={12} />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {entry.approvedBy || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {entry.timestamp}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredLog.length === 0 && (
            <div className="p-10 text-center">
              <p className="text-sm font-medium text-ink">No entries</p>
              <p className="mt-1 text-sm text-muted">
                Nothing matches this filter yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}