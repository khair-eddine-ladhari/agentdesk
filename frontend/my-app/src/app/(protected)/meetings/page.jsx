"use client";

import { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useGlobalContext } from "@/components/GlobalContext";
import { Loader2, Users, Clock } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function MeetingsPage() {
  const { workspace } = useGlobalContext();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!workspace?._id) return;

    async function fetchMeetings() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/workspaces/${workspace._id}/meetings`, {
          headers: { Authorization: `Bearer ${sessionStorage.getItem("adminToken")}` },
        });
        if (!res.ok) throw new Error(`Failed to load meetings (${res.status})`);
        setMeetings(await res.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchMeetings();
  }, [workspace?._id]);

  return (
    <AppShell title="Meetings">
      <div className="mx-auto max-w-3xl space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-10 text-muted">
            <Loader2 size={18} className="animate-spin" />
          </div>
        )}

        {error && (
          <div className="rounded-card border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && meetings.length === 0 && !error && (
          <div className="rounded-card border border-border bg-surface p-10 text-center shadow-soft">
            <p className="text-sm font-medium text-ink">No meetings yet</p>
            <p className="mt-1 text-sm text-muted">
              Meetings created by your agents will show up here.
            </p>
          </div>
        )}

        {!loading &&
          meetings.map((meeting) => (
            <div
              key={meeting._id}
              className="rounded-card border border-border bg-surface p-4 shadow-soft"
            >
              <p className="text-sm font-medium text-ink">{meeting.title}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted">
                {meeting.time && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {meeting.time}
                  </span>
                )}
                {meeting.attendees?.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    {meeting.attendees.join(", ")}
                  </span>
                )}
              </div>
            </div>
          ))}
      </div>
    </AppShell>
  );
}