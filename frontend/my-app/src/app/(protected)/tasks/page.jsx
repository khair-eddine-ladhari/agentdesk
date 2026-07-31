"use client";

import { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useGlobalContext } from "@/components/GlobalContext";
import { Loader2, Users, CalendarClock, History } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function initialsOf(nameOrEmail) {
  const namePart = nameOrEmail.split("@")[0];
  return namePart.slice(0, 2).toUpperCase();
}

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
              className="rounded-card border border-border bg-surface shadow-soft overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm font-medium text-ink">{meeting.title}</p>

                  {meeting.time && (
                    <span className="flex shrink-0 items-center gap-1.5 rounded-pill bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
                      <CalendarClock size={12} />
                      {meeting.time}
                    </span>
                  )}
                </div>

                {meeting.attendees?.length > 0 && (
                  <div className="mt-3 flex items-center gap-2">
                    <Users size={13} className="shrink-0 text-muted" />
                    <div className="flex flex-wrap items-center gap-1.5">
                      {meeting.attendees.map((person) => (
                        <span
                          key={person}
                          className="flex items-center gap-1.5 rounded-pill border border-border bg-bg px-2 py-0.5 text-xs text-ink"
                          title={person}
                        >
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-medium text-white">
                            {initialsOf(person)}
                          </span>
                          {person}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 border-t border-border bg-bg/50 px-4 py-2 text-[11px] text-muted">
                <History size={11} />
                Logged {new Date(meeting.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
      </div>
    </AppShell>
  );
}