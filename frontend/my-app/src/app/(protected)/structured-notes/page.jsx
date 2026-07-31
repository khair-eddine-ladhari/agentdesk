"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import axios from "axios";
import AppShell from "@/components/AppShell";
import { Search, FileText, ListChecks, CalendarClock, AlertTriangle } from "lucide-react";
import { useGlobalContext } from "@/components/GlobalContext"; // adjust path to match your project

const API_URL = process.env.NEXT_PUBLIC_API_URL;

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

  // No title/summary/tags on this schema — search matches against the
  // raw source text plus whatever key points and action items say.
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
        <div className="mx-auto max-w-4xl">
          <p className="text-sm text-muted">Loading workspace…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Structured Notes">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search structured notes..."
            className="w-full rounded-pill border border-border bg-surface py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
        </div>

        {loadError && (
          <p className="text-xs text-danger">Couldn't load notes: {loadError}</p>
        )}

        {isLoading ? (
          <p className="text-sm text-muted">Loading notes…</p>
        ) : filteredNotes.length === 0 ? (
          <div className="rounded-card border border-border bg-surface p-10 text-center shadow-soft">
            <p className="text-sm font-medium text-ink">No notes match</p>
            <p className="mt-1 text-sm text-muted">
              {notes.length === 0
                ? 'Structure a document from the Documents page to see it here.'
                : 'Try a different search term.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotes.map((note) => (
              <div
                key={note._id}
                className="rounded-card border border-border bg-surface p-4 shadow-soft transition-shadow hover:shadow-softHover"
              >
                {note.parseError && (
                  <div className="mb-3 flex items-center gap-1.5 rounded-control bg-danger-soft px-2.5 py-1.5 text-xs text-danger">
                    <AlertTriangle size={12} />
                    Extraction had a parse error: {note.parseError}
                  </div>
                )}

                {note.key_points?.length > 0 && (
                  <div className="mb-3">
                    <p className="mb-1 text-xs font-medium text-ink">Key points</p>
                    <ul className="list-disc space-y-0.5 pl-4 text-sm leading-relaxed text-muted">
                      {note.key_points.map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {note.action_items?.length > 0 && (
                  <div className="mb-3">
                    <p className="mb-1 flex items-center gap-1 text-xs font-medium text-ink">
                      <ListChecks size={12} /> Action items
                    </p>
                    <ul className="list-disc space-y-0.5 pl-4 text-sm leading-relaxed text-muted">
                      {note.action_items.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {note.mentioned_dates?.length > 0 && (
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <CalendarClock size={12} className="text-muted" />
                    {note.mentioned_dates.map((date, i) => (
                      <span
                        key={i}
                        className="rounded-pill bg-accent-soft px-2 py-0.5 text-xs text-accent"
                      >
                        {date}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2.5">
                  <span className="flex items-center gap-1 text-xs text-muted">
                    <FileText size={12} />
                    {note.documentId?.filename || "Unknown source"}
                  </span>
                  <span className="text-xs text-muted">·</span>
                  <span className="text-xs text-muted">
                    {note.createdAt ? new Date(note.createdAt).toLocaleString() : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}