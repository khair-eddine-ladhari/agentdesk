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
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { GlobalContext } from "@/components/GlobalContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const PURPLE = "#8A05FF";

const STAT_CONFIG = [
  { key: "userCount", label: "Users", icon: Users, href: "/settings/workspace" },
  { key: "documentCount", label: "Documents", icon: FileText, href: "/documents" },
  { key: "taskCount", label: "Tasks", icon: CheckSquare, href: "/structured-notes" },
  { key: "meetingCount", label: "Meetings", icon: CalendarClock, href: "/structured-notes" },
  { key: "messageCount", label: "Messages", icon: MessageSquare, href: "/chat" },
];

const TASK_STATUS = {
  pending: { label: "Pending", icon: Clock, className: "text-amber-600 bg-amber-50" },
  approved: { label: "Approved", icon: CheckCircle2, className: "text-emerald-700 bg-emerald-50" },
  rejected: { label: "Rejected", icon: XCircle, className: "text-red-600 bg-red-50" },
  failed: { label: "Failed", icon: AlertCircle, className: "text-red-600 bg-red-50" },
};

function StatusBadge({ status }) {
  const cfg = TASK_STATUS[status] || TASK_STATUS.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cfg.className}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatRelative(dateStr) {
  if (!dateStr) return "";
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function DashboardPage() {
  const { workspace } = useContext(GlobalContext);
  const router = useRouter();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);

  useEffect(() => {
    if (workspace === undefined) {
      setLoading(true);
      return;
    }
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

  // Team members aren't guaranteed to be in /dashboard/stats previews, so
  // fetch them the same way the Workspace Settings page does.
  useEffect(() => {
    if (!workspace?._id) {
      setMembersLoading(false);
      return;
    }

    async function fetchMembers() {
      setMembersLoading(true);
      const token = sessionStorage.getItem("adminToken");
      const headers = {
        Authorization: `Bearer ${token}`,
        "X-Workspace-ID": workspace._id,
      };
      try {
        const res = await axios.get(
          `${API_URL}/workspaces/${workspace._id}/settings`,
          { headers }
        );
        setMembers(res.data.members || []);
      } catch (err) {
        // Fail quietly here — the dashboard already surfaces a top-level
        // error for stats; the Team panel just falls back to its empty state.
        setMembers([]);
      } finally {
        setMembersLoading(false);
      }
    }

    fetchMembers();
  }, [workspace?._id]);

  if (loading) {
    return (
      <AppShell title="Dashboard">
        <div className="flex h-64 items-center justify-center bg-white">
          <Loader2 size={20} className="animate-spin" style={{ color: PURPLE }} />
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Dashboard">
        <div className="mx-auto max-w-6xl bg-white min-h-screen p-6">
          <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        </div>
      </AppShell>
    );
  }

  if (!workspace) {
    return (
      <AppShell title="Dashboard">
        <div className="mx-auto max-w-6xl bg-white min-h-screen p-6">
          <div className="mb-6 border border-gray-200 p-10 text-center">
            <h2 className="font-semibold text-black text-lg">
              Create your first workspace
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
              Workspaces keep your tasks, documents, meetings, and chats
              organized in one place. You don't have one yet — create one to
              get started.
            </p>
            <button
              onClick={() => router.push("/Createworkspacepage")}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
              style={{ backgroundColor: "#0a0a0a" }}
            >
              <Plus size={16} />
              Create workspace
            </button>
          </div>

          <div className="grid grid-cols-2 gap-0 border border-gray-200 lg:grid-cols-5">
            {STAT_CONFIG.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.key}
                  className={`p-5 opacity-50 ${i > 0 ? "border-l border-gray-200" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-wide text-gray-400">
                      {stat.label}
                    </span>
                    <Icon size={14} className="text-gray-400" strokeWidth={2} />
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-gray-300">—</div>
                </div>
              );
            })}
          </div>
        </div>
      </AppShell>
    );
  }

  const tasks = stats?.previews?.tasks ?? [];
  const meetings = stats?.previews?.meetings ?? [];
  const activity = stats?.previews?.activity ?? stats?.previews?.messages ?? [];

  return (
    <AppShell title="Dashboard">
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-6xl p-6">
          {/* Header */}
          <div className="mb-8 flex items-end justify-between border-b border-gray-900 pb-6">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-wide text-gray-400 mb-2">
                Workspace
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-black">
                {workspace?.name || "Workspace"}
              </h1>
              <p className="mt-1 font-mono text-xs text-gray-400">{workspace?._id}</p>
            </div>
          </div>

          {/* Stat strip — bordered grid like Render's feature grid */}
          <div className="mb-10 grid grid-cols-2 border border-gray-200 lg:grid-cols-5">
            {STAT_CONFIG.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <button
                  key={stat.key}
                  onClick={() => router.push(stat.href)}
                  className={`group p-5 text-left transition hover:bg-gray-50 ${
                    i > 0 ? "border-l border-gray-200" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-wide text-gray-400">
                      {stat.label}
                    </span>
                    <Icon
                      size={14}
                      className="text-gray-400 transition"
                      style={{ color: "inherit" }}
                      strokeWidth={2}
                    />
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-black">
                    {stats?.[stat.key] ?? 0}
                  </div>
                  <div
                    className="mt-2 flex items-center gap-1 text-xs font-medium opacity-0 transition group-hover:opacity-100"
                    style={{ color: PURPLE }}
                  >
                    View all <ArrowRight size={11} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Tasks + Meetings */}
          <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Tasks panel */}
            <div className="border border-gray-200">
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-5 w-5 items-center justify-center text-[10px] font-semibold text-white"
                    style={{ backgroundColor: PURPLE }}
                  >
                    <CheckSquare size={11} />
                  </div>
                  <h2 className="text-sm font-semibold text-black">Tasks</h2>
                </div>
                <button
                  onClick={() => router.push("/tasks")}
                  className="flex items-center gap-1 text-xs text-gray-400 transition hover:text-black"
                >
                  View all <ArrowRight size={11} />
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {tasks.length === 0 && (
                  <p className="px-5 py-8 text-center text-xs text-gray-400">
                    No tasks waiting on approval.
                  </p>
                )}
                {tasks.slice(0, 5).map((task, i) => (
                  <div
                    key={task._id || i}
                    className="flex items-center justify-between px-5 py-3.5 transition hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-black">{task.title}</p>
                      <p className="mt-0.5 truncate text-xs text-gray-400">
                        {task.agent || task.owner || "Agent"} · {formatRelative(task.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={task.status || "pending"} />
                  </div>
                ))}
              </div>
            </div>

            {/* Meetings panel */}
            <div className="border border-gray-200">
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-5 w-5 items-center justify-center text-[10px] font-semibold text-white"
                    style={{ backgroundColor: PURPLE }}
                  >
                    <CalendarClock size={11} />
                  </div>
                  <h2 className="text-sm font-semibold text-black">Upcoming meetings</h2>
                </div>
                <button
                  onClick={() => router.push("/structured-notes")}
                  className="flex items-center gap-1 text-xs text-gray-400 transition hover:text-black"
                >
                  View all <ArrowRight size={11} />
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {meetings.length === 0 && (
                  <p className="px-5 py-8 text-center text-xs text-gray-400">
                    Nothing scheduled.
                  </p>
                )}
                {meetings.slice(0, 5).map((meeting, i) => (
                  <div
                    key={meeting._id || i}
                    className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-black">{meeting.title}</p>
                      <p className="mt-0.5 truncate text-xs text-gray-400">
                        {meeting.participants?.length
                          ? `${meeting.participants.length} participants`
                          : meeting.owner || ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Activity + Team */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="border border-gray-200 lg:col-span-2">
              <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4">
                <div
                  className="flex h-5 w-5 items-center justify-center text-[10px] font-semibold text-white"
                  style={{ backgroundColor: PURPLE }}
                >
                  <MessageSquare size={11} />
                </div>
                <h2 className="text-sm font-semibold text-black">Recent activity</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {activity.length === 0 && (
                  <p className="px-5 py-8 text-center text-xs text-gray-400">
                    No recent activity yet.
                  </p>
                )}
                {activity.slice(0, 6).map((item, i) => (
                  <div key={item._id || i} className="flex items-start gap-3 px-5 py-3.5">
                    <div
                      className="mt-1.5 h-1.5 w-1.5 shrink-0"
                      style={{ backgroundColor: PURPLE }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm text-gray-700">
                        {item.content || item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {formatRelative(item.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Team panel — fetched independently via /workspaces/{id}/settings */}
            <div className="border border-gray-200">
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-5 w-5 items-center justify-center text-[10px] font-semibold text-white"
                    style={{ backgroundColor: PURPLE }}
                  >
                    <Users size={11} />
                  </div>
                  <h2 className="text-sm font-semibold text-black">Team</h2>
                </div>
                <button
                  onClick={() => router.push("/settings/workspace")}
                  className="flex items-center gap-1 text-xs text-gray-400 transition hover:text-black"
                >
                  Manage <ArrowRight size={11} />
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {membersLoading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={14} className="animate-spin" style={{ color: PURPLE }} />
                  </div>
                )}
                {!membersLoading && members.length === 0 && (
                  <p className="px-5 py-8 text-center text-xs text-gray-400">
                    Just you for now.
                  </p>
                )}
                {!membersLoading &&
                  members.slice(0, 5).map((u, i) => (
                    <div key={u.id || u._id || i} className="flex items-center gap-2.5 px-5 py-3">
                      <div
                        className="flex h-6 w-6 shrink-0 items-center justify-center text-[10px] font-semibold text-white"
                        style={{ backgroundColor: PURPLE }}
                      >
                        {(u.name || u.email || "?").charAt(0).toUpperCase()}
                      </div>
                      <p className="truncate text-xs text-gray-700">{u.name || u.email}</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}