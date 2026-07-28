"use client";

import { useState, useEffect, useContext } from "react";
import axios from "axios";
import {
  Users,
  FileText,
  CheckSquare,
  CalendarClock,
  MessageSquare,
  Loader2,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { GlobalContext } from "@/components/GlobalContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const STAT_CONFIG = [
  { key: "userCount", label: "Users", icon: Users },
  { key: "documentCount", label: "Documents", icon: FileText },
  { key: "taskCount", label: "Tasks", icon: CheckSquare },
  { key: "meetingCount", label: "Meetings", icon: CalendarClock },
  { key: "messageCount", label: "Messages", icon: MessageSquare },
];


export default function DashboardPage() {
  const { workspace } = useContext(GlobalContext);

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  useEffect(() => {
    async function fetchStats() {

      // Wait until workspace is loaded
      if (!workspace?._id) return;

      setLoading(true);
      setError("");

      const token = sessionStorage.getItem("adminToken");

      const headers = {
        Authorization: `Bearer ${token}`,
        "X-Workspace-ID": workspace._id,
      };


      try {
        const res = await axios.get(
          `${API_URL}/dashboard/stats`,
          { headers }
        );

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


  return (
    <AppShell title="Dashboard">
      <div className="mx-auto max-w-5xl">

        <div className="mb-4">
          <h2 className="text-lg font-semibold text-ink">
            {workspace?.name || "Workspace"}
          </h2>

          <p className="text-sm text-muted">
            Workspace ID: {workspace?._id}
          </p>
        </div>


        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">

          {STAT_CONFIG.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.key}
                className="rounded-card border border-border bg-surface p-5 shadow-soft"
              >

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">
                    {stat.label}
                  </span>

                  <Icon
                    size={16}
                    className="text-accent"
                    strokeWidth={2}
                  />
                </div>


                <div className="mt-2 text-2xl font-semibold text-ink">
                  {stats?.[stat.key] ?? 0}
                </div>

              </div>
            );
          })}

        </div>

      </div>
    </AppShell>
  );
}