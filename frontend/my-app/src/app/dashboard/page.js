"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import {
  Users,
  FileText,
  CheckSquare,
  CalendarClock,
  ArrowUpRight,
  MessageSquare,
  Loader2,
} from "lucide-react";
import AppShell from "@/components/AppShell";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const STAT_CONFIG = [
  { key: "userCount", label: "Users", icon: Users },
  { key: "documentCount", label: "Documents", icon: FileText },
  { key: "taskCount", label: "Tasks", icon: CheckSquare },
  { key: "meetingCount", label: "Meetings", icon: CalendarClock },
];

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [pendingActions, setPendingActions] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchDashboard() {
      setLoading(true);
      setError("");
      const token = sessionStorage.getItem("adminToken");
      const headers = { Authorization: `Bearer ${token}` };

      try {
        const [statsRes, actionsRes, activityRes] = await Promise.all([
          axios.get(`${API_URL}/dashboard/stats`, { headers }),
          axios.get(`${API_URL}/actions/pending?limit=3`, { headers }),
          axios.get(`${API_URL}/audit-log/recent?limit=3`, { headers }),
        ]);

        setStats(statsRes.data);
        setPendingActions(actionsRes.data);
        setRecentActivity(activityRes.data);
      } catch (err) {
        setError(
          err.response?.data?.message || "Couldn't load your dashboard. Try refreshing."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <AppShell title="Dashboard">
        <div className="flex h-64 items-center justify-center">
          <Loader2 size={20} className="animate-spin text-muted" />
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Dashboard">
        <div className="mx-auto max-w-5xl">
          <p className="rounded-card border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Dashboard" pendingCount={pendingActions.length}>
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STAT_CONFIG.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.key}
                className="rounded-card border border-border bg-surface p-5 shadow-soft"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">{stat.label}</span>
                  <Icon size={16} className="text-accent" strokeWidth={2} />
                </div>
                <div className="mt-2 text-2xl font-semibold text-ink">
                  {stats?.[stat.key] ?? 0}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pending actions */}
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

          {pendingActions.length === 0 ? (
            <div className="rounded-card border border-border bg-surface p-8 text-center shadow-soft">
              <p className="text-sm text-muted">
                Nothing waiting on you right now.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingActions.map((action) => (
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
          )}
        </section>

        {/* Recent activity + quick chat access */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <h2 className="mb-3 text-sm font-medium text-ink">
              Recent activity
            </h2>
            {recentActivity.length === 0 ? (
              <div className="rounded-card border border-border bg-surface p-8 text-center shadow-soft">
                <p className="text-sm text-muted">Nothing logged yet.</p>
              </div>
            ) : (
              <div className="rounded-card border border-border bg-surface shadow-soft">
                {recentActivity.map((item, i) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between px-4 py-3 text-sm ${
                      i !== recentActivity.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <span className="text-ink">{item.text}</span>
                    <span className="shrink-0 text-xs text-muted">
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>
            )}
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