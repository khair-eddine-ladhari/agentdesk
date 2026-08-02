"use client";

import { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useGlobalContext } from "@/components/GlobalContext";
import { Loader2, Users, CalendarClock, History, User, Trash2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const PURPLE = "#8A05FF";

function initialsOf(nameOrEmail) {
  const namePart = nameOrEmail.split("@")[0];
  return namePart.slice(0, 2).toUpperCase();
}

export default function MeetingsPage() {
  const { workspace } = useGlobalContext();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    if (!workspace?._id) return;

    async function fetchMeetings() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/workspaces/${workspace._id}/tasks`, {
          headers: { Authorization: `Bearer ${sessionStorage.getItem("adminToken")}` },
        });
        if (!res.ok) throw new Error(`Failed to load tasks (${res.status})`);
        setMeetings(await res.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchMeetings();
  }, [workspace?._id]);

  async function handleDelete(taskId) {
    if (!workspace?._id) return;
    const confirmed = window.confirm("Delete this task? This can't be undone.");
    if (!confirmed) return;

    setDeletingId(taskId);
    setDeleteError(null);

    const previous = meetings;
    setMeetings((prev) => prev.filter((m) => m._id !== taskId)); // optimistic

    try {
      const res = await fetch(`${API_URL}/workspaces/${workspace._id}/tasks/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${sessionStorage.getItem("adminToken")}` },
      });
      if (!res.ok) throw new Error(`Failed to delete task (${res.status})`);
    } catch (err) {
      setMeetings(previous); // rollback on failure
      setDeleteError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AppShell title="Meetings">
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-3xl p-6">
          <div className="mb-6 flex items-end justify-between border-b border-gray-900 pb-4">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-wide text-gray-400 mb-1">
                TASKS
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-black">
                {meetings.length > 0 ? `${meetings.length} scheduled` : "TASKS"}
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

          {deleteError && (
            <div className="mb-3 border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Couldn't delete task: {deleteError}
            </div>
          )}

          {!loading && meetings.length === 0 && !error && (
            <div className="border border-gray-200 p-12 text-center">
              <p className="text-sm font-medium text-black">No tasks yet</p>
              <p className="mt-1 text-sm text-gray-400">
                tasks created by your agents will show up here.
              </p>
            </div>
          )}

          {!loading && meetings.length > 0 && (
            <div className="space-y-3">
              {meetings.map((meeting) => (
                <div key={meeting._id} className="border border-gray-200">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-black">{meeting.title}</p>
                        {meeting.assignee && (
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                            <User size={12} className="text-gray-400" />
                        
                            {meeting.assignee}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {meeting.time && (
                          <span
                            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-white"
                            style={{ backgroundColor: PURPLE }}
                          >
                            <CalendarClock size={12} />
                            {meeting.time}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDelete(meeting._id)}
                          disabled={deletingId === meeting._id}
                          aria-label="Delete task"
                          className="flex h-7 w-7 items-center justify-center text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          {deletingId === meeting._id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </div>

                    {meeting.attendees?.length > 0 && (
                      <div className="mt-3 flex items-start gap-2">
                        <Users size={13} className="mt-0.5 shrink-0 text-gray-400" />
                        <div className="flex flex-wrap items-center gap-1.5">
                          {meeting.attendees.map((person) => (
                            <span
                              key={person}
                              className="flex items-center gap-1.5 border border-gray-200 px-2 py-0.5 text-xs text-black"
                              title={person}
                            >
                              <span
                                className="flex h-4 w-4 items-center justify-center text-[9px] font-medium text-white"
                                style={{ backgroundColor: PURPLE }}
                              >
                                {initialsOf(person)}
                              </span>
                              {person}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 border-t border-gray-100 bg-gray-50 px-4 py-2 text-[11px] text-gray-400">
                    <History size={11} />
                    Logged {new Date(meeting.createdAt).toLocaleString()}
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