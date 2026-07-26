import Link from "next/link";
import AppShell from "@/components/AppShell";
import {
  CheckCircle2,
  Clock,
  FileText,
  ArrowUpRight,
  MessageSquare,
} from "lucide-react";

// Placeholder data — swap for real fetches later
const STATS = [
  { label: "Pending approval", value: 3, icon: Clock },
  { label: "Approved this week", value: 12, icon: CheckCircle2 },
  { label: "Documents processed", value: 28, icon: FileText },
];

const PENDING_ACTIONS = [
  {
    id: "1",
    title: "Send follow-up email to Acme Corp re: Q3 contract",
    source: "From: contract-notes.docx",
    agent: "Email Agent",
    time: "12 min ago",
  },
  {
    id: "2",
    title: "Create 4 tasks in project tracker from meeting notes",
    source: "From: standup-2026-07-25.txt",
    agent: "Task Agent",
    time: "1 hour ago",
  },
  {
    id: "3",
    title: "Update client record with new billing address",
    source: "From: chat conversation",
    agent: "CRM Agent",
    time: "3 hours ago",
  },
];

const RECENT_ACTIVITY = [
  { id: "a1", text: "Approved: Schedule kickoff call with Beta LLC", time: "Yesterday, 4:12 PM" },
  { id: "a2", text: "Rejected: Delete stale lead from CRM", time: "Yesterday, 2:03 PM" },
  { id: "a3", text: "Approved: Draft proposal summary for Nova Inc.", time: "Yesterday, 11:45 AM" },
];

export default function DashboardPage() {
  return (
    <AppShell title="Dashboard" pendingCount={PENDING_ACTIONS.length}>
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Stats row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-card border border-border bg-surface p-5 shadow-soft"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">{stat.label}</span>
                  <Icon size={16} className="text-accent" strokeWidth={2} />
                </div>
                <div className="mt-2 text-2xl font-semibold text-ink">
                  {stat.value}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pending actions — the hero of this screen */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-ink">
              Needs your approval
            </h2>
            <Link
              href="/pending-actions"
              className="flex items-center gap-1 text-sm text-accent hover:text-accent-hover"
            >
              View all
              <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="space-y-3">
            {PENDING_ACTIONS.map((action) => (
              <div
                key={action.id}
                className="rounded-card border border-border bg-surface p-4 shadow-soft transition-shadow hover:shadow-softHover"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {action.title}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                      <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-accent">
                        {action.agent}
                      </span>
                      <span>{action.source}</span>
                      <span>·</span>
                      <span>{action.time}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      className="rounded-pill border border-border px-3 py-1.5 text-xs font-medium text-muted hover:bg-bg"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      className="rounded-pill bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent activity + quick chat access */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <h2 className="mb-3 text-sm font-medium text-ink">
              Recent activity
            </h2>
            <div className="rounded-card border border-border bg-surface shadow-soft">
              {RECENT_ACTIVITY.map((item, i) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between px-4 py-3 text-sm ${
                    i !== RECENT_ACTIVITY.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <span className="text-ink">{item.text}</span>
                  <span className="shrink-0 text-xs text-muted">
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-medium text-ink">Quick access</h2>
            <Link
              href="/chat"
              className="flex items-center gap-3 rounded-card border border-border bg-surface p-4 shadow-soft transition-shadow hover:shadow-softHover"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-control bg-accent-soft text-accent">
                <MessageSquare size={17} />
              </div>
              <div>
                <p className="text-sm font-medium text-ink">Ask something</p>
                <p className="text-xs text-muted">Open chat</p>
              </div>
            </Link>
          </section>
        </div>
      </div>
    </AppShell>
  );
}