"use client";

import { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useGlobalContext } from "@/components/GlobalContext";
import { Loader2, Users, Clock } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const PURPLE = "#8A05FF";

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
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-3xl p-6">
          {/* Header */}
          <div className="mb-6 flex items-end justify-between border-b border-gray-900 pb-4">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-wide text-gray-400 mb-1">
                Meetings
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-black">
                {meetings.length > 0 ? `${meetings.length} scheduled` : "Meetings"}
              </h1>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={18} className="animate-spin" style={{ color: PURPLE }} />
            </div>
          )}

          {error && (
            <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && meetings.length === 0 && !error && (
            <div className="border border-gray-200 p-12 text-center">
              <p className="text-sm font-medium text-black">No meetings yet</p>
              <p className="mt-1 text-sm text-gray-400">
                Meetings created by your agents will show up here.
              </p>
            </div>
          )}

          {!loading && meetings.length > 0 && (
            <div className="border border-gray-200">
              {meetings.map((meeting, i) => (
                <div
                  key={meeting._id}
                  className={`flex items-start gap-4 p-4 transition hover:bg-gray-50 ${
                    i > 0 ? "border-t border-gray-100" : ""
                  }`}
                >
                  <div className="flex w-16 shrink-0 flex-col items-center border border-gray-200 py-2">
                    <span className="font-mono text-xs font-semibold text-black">
                      {meeting.time || "—"}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-black">{meeting.title}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-400">
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}