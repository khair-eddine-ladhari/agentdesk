"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import axios from "axios";
import AppShell from "@/components/AppShell";
import { Search, FileText, ListChecks, CalendarClock, AlertTriangle } from "lucide-react";
import { useGlobalContext } from "@/components/GlobalContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const PURPLE = "#8A05FF";

function authHeaders() {
  const token = sessionStorage.getItem("adminToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function StructuredNotesPage() {
  const { workspace } = useGlobalContext();
  const workspaceId = workspace?._id;

  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [query, setQuery] = useState("");

  const fetchNotes = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const res = await axios.get(`${API_URL}/workspaces/${workspaceId}/notes`, {
        headers: authHeaders(),
      });
      setNotes(res.data);
      setLoadError(null);
    } catch (err) {
      setLoadError(err.response?.data?.error || err.message);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((note) => {
      const haystack = [
        note.rawQuery,
        ...(note.key_points || []),
        ...(note.action_items || []),
        note.documentId?.filename,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [notes, query]);

  if (!workspaceId) {
    return (
      <AppShell title="Structured Notes">
        <div className="mx-auto max-w-4xl bg-white min-h-screen p-6">
          <p className="text-sm text-gray-400">Loading workspace…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Structured Notes">
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-4xl p-6 space-y-6">
          {/* Header */}
          <div className="flex items-end justify-between border-b border-gray-900 pb-4">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-wide text-gray-400 mb-1">
                Structured Notes
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-black">
                {isLoading
                  ? "Loading notes…"
                  : `${filteredNotes.length} note${filteredNotes.length === 1 ? "" : "s"}`}
              </h1>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search structured notes..."
              className="w-full border border-gray-300 py-2.5 pl-10 pr-4 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black"
            />
          </div>

          {loadError && (
            <p className="text-xs text-red-600">Couldn't load notes: {loadError}</p>
          )}

          {isLoading ? (
            <p className="text-sm text-gray-400">Loading notes…</p>
          ) : filteredNotes.length === 0 ? (
            <div className="border border-gray-200 p-12 text-center">
              <p className="text-sm font-medium text-black">No notes match</p>
              <p className="mt-1 text-sm text-gray-400">
                {notes.length === 0
                  ? "Structure a document from the Documents page to see it here."
                  : "Try a different search term."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotes.map((note) => (
                <div
                  key={note._id}
                  className="border border-gray-200 p-4 transition-colors hover:bg-gray-50"
                >
                  {note.parseError && (
                    <div className="mb-3 flex items-center gap-1.5 border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
                      <AlertTriangle size={12} />
                      Extraction had a parse error: {note.parseError}
                    </div>
                  )}

                  {note.key_points?.length > 0 && (
                    <div className="mb-3">
                      <p className="mb-1 text-xs font-medium text-black">Key points</p>
                      <ul className="list-disc space-y-0.5 pl-4 text-sm leading-relaxed text-gray-500">
                        {note.key_points.map((point, i) => (
                          <li key={i}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {note.action_items?.length > 0 && (
                    <div className="mb-3">
                      <p className="mb-1 flex items-center gap-1 text-xs font-medium text-black">
                        <ListChecks size={12} /> Action items
                      </p>
                      <ul className="list-disc space-y-0.5 pl-4 text-sm leading-relaxed text-gray-500">
                        {note.action_items.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {note.mentioned_dates?.length > 0 && (
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <CalendarClock size={12} className="text-gray-400" />
                      {note.mentioned_dates.map((date, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 text-xs font-medium text-white"
                          style={{ backgroundColor: PURPLE }}
                        >
                          {date}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-2.5">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <FileText size={12} />
                      {note.documentId?.filename || "Unknown source"}
                    </span>
                    <span className="text-xs text-gray-300">·</span>
                    <span className="text-xs text-gray-400">
                      {note.createdAt ? new Date(note.createdAt).toLocaleString() : ""}
                    </span>
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