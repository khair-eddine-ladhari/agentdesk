"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Users,
  FileText,
  CheckSquare,
  CalendarClock,
  MessageSquare,
  Loader2,
  Plus,
  ArrowRight,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { GlobalContext } from "@/components/GlobalContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// previewKey: which array in stats.previews this card should show.
// previewLabel(item): how to render one preview row as a short line of text.
const STAT_CONFIG = [
  { key: "userCount", label: "Users", icon: Users, href: "/settings/workspace" },
  {
    key: "documentCount",
    label: "Documents",
    icon: FileText,
    href: "/documents",
    previewKey: "documents",
    previewLabel: (doc) => doc.filename,
  },
  {
    key: "taskCount",
    label: "Tasks",
    icon: CheckSquare,
    href: "/structured-notes",
    previewKey: "tasks",
    previewLabel: (task) => task.title,
  },
  {
    key: "meetingCount",
    label: "Meetings",
    icon: CalendarClock,
    href: "/structured-notes",
    previewKey: "meetings",
    previewLabel: (meeting) => meeting.title,
  },
  {
    key: "messageCount",
    label: "Messages",
    icon: MessageSquare,
    href: "/chat",
    previewKey: "messages",
    previewLabel: (msg) => msg.content,
  },
];

export default function DashboardPage() {
  const { workspace } = useContext(GlobalContext);
  const router = useRouter();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Still resolving which workspace (if any) the user has - GlobalContext
    // hasn't settled yet. Keep showing the loading state, don't fetch yet.
    if (workspace === undefined) {
      setLoading(true);
      return;
    }

    // Context has resolved and there's genuinely no workspace - stop
    // loading immediately instead of hanging forever waiting for a
    // workspace._id that will never arrive.
    if (workspace === null) {
      setLoading(false);
      return;
    }

    async function fetchStats() {
      setLoading(true);
      setError("");

      const token = sessionStorage.getItem("adminToken");
      const headers = {
        Authorization: `Bearer ${token}`,
        "X-Workspace-ID": workspace._id,
      };

      try {
        const res = await axios.get(`${API_URL}/dashboard/stats`, { headers });
        setStats(res.data);
      } catch (err) {
        setError(
          err.response?.data?.message ||
          "Couldn't load your dashboard. Try refreshing."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [workspace]);

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

  // No workspace yet: show the same organized grid, but every box is
  // empty/disabled, plus one clear call-to-action instead of five dead
  // links pointing at pages the user can't use yet.
  if (!workspace) {
    return (
      <AppShell title="Dashboard">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 rounded-card border border-border bg-surface p-6 text-center shadow-soft">
            <h2 className="text-lg font-semibold text-ink">
              Create your first workspace
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted">
              Workspaces keep your tasks, documents, meetings, and chats
              organized in one place. You don't have one yet - create one to
              get started.
            </p>
            <button
              onClick={() => router.push("/Createworkspacepage ")}
              className="mt-4 inline-flex items-center gap-2 rounded-card bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              <Plus size={16} />
              Create workspace
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {STAT_CONFIG.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.key}
                  className="rounded-card border border-dashed border-border bg-surface p-5 opacity-60"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">{stat.label}</span>
                    <Icon size={16} className="text-muted" strokeWidth={2} />
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-muted">
                    —
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Dashboard">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-ink">
            {workspace?.name || "Workspace"}
          </h2>
          <p className="text-sm text-muted">Workspace ID: {workspace?._id}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {STAT_CONFIG.map((stat) => {
            const Icon = stat.icon;
            const previews = stat.previewKey
              ? (stats?.previews?.[stat.previewKey] ?? [])
              : [];

            return (
              <button
                key={stat.key}
                onClick={() => router.push(stat.href)}
                className="group flex flex-col rounded-card border border-border bg-surface p-5 text-left shadow-soft transition hover:border-accent/40 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">{stat.label}</span>
                  <Icon size={16} className="text-accent" strokeWidth={2} />
                </div>

                <div className="mt-2 text-2xl font-semibold text-ink">
                  {stats?.[stat.key] ?? 0}
                </div>

                {previews.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-border pt-3">
                    {previews.map((item, i) => (
                      <li
                        key={item._id || i}
                        className="truncate text-xs text-muted"
                      >
                        {stat.previewLabel(item)}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-accent opacity-0 transition group-hover:opacity-100">
                  View all
                  <ArrowRight size={12} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}