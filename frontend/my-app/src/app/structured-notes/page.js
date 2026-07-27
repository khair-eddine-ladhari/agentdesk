"use client";

import { useState, useMemo } from "react";
import AppShell from "@/components/AppShell";
import { Search, FileText, Tag } from "lucide-react";

// Placeholder data — swap for real fetches later
const INITIAL_NOTES = [
  {
    id: "n1",
    title: "Q3 contract — revised payment terms",
    summary:
      "Net-30 from invoice date, with a 2% early-payment discount if paid within 10 days. Late fees apply after day 45.",
    source: "contract-notes.docx",
    tags: ["contracts", "billing"],
    updatedAt: "2 days ago",
  },
  {
    id: "n2",
    title: "Standup action items — Jul 25",
    summary:
      "Four open items: finalize onboarding flow, fix export bug, schedule Nova Inc. review, update roadmap doc.",
    source: "standup-2026-07-25.txt",
    tags: ["tasks", "team"],
    updatedAt: "1 hour ago",
  },
  {
    id: "n3",
    title: "Beta LLC billing address change",
    summary:
      "Client requested billing address update during chat, confirmed via follow-up email. Old address flagged for archival.",
    source: "chat conversation",
    tags: ["crm", "billing"],
    updatedAt: "3 hours ago",
  },
  {
    id: "n4",
    title: "Vendor agreement — key clauses",
    summary:
      "Draft still in review. Notable clauses: 60-day termination notice, auto-renewal, liability cap at 12 months' fees.",
    source: "vendor-agreement-draft.pdf",
    tags: ["contracts", "vendors"],
    updatedAt: "5 min ago",
  },
];

export default function StructuredNotesPage() {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState(null);

  const allTags = useMemo(() => {
    const set = new Set();
    INITIAL_NOTES.forEach((n) => n.tags.forEach((t) => set.add(t)));
    return Array.from(set);
  }, []);

  const filteredNotes = useMemo(() => {
    return INITIAL_NOTES.filter((note) => {
      const matchesQuery =
        query.trim() === "" ||
        note.title.toLowerCase().includes(query.toLowerCase()) ||
        note.summary.toLowerCase().includes(query.toLowerCase());
      const matchesTag = !activeTag || note.tags.includes(activeTag);
      return matchesQuery && matchesTag;
    });
  }, [query, activeTag]);

  return (
    <AppShell title="Structured Notes">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Search + tag filters */}
        <div className="space-y-3">
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

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              className={`rounded-pill px-3 py-1 text-xs font-medium transition-colors ${
                activeTag === null
                  ? "bg-accent text-white"
                  : "border border-border text-muted hover:bg-bg"
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                className={`rounded-pill px-3 py-1 text-xs font-medium transition-colors ${
                  activeTag === tag
                    ? "bg-accent text-white"
                    : "border border-border text-muted hover:bg-bg"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Notes list */}
        {filteredNotes.length === 0 ? (
          <div className="rounded-card border border-border bg-surface p-10 text-center shadow-soft">
            <p className="text-sm font-medium text-ink">No notes match</p>
            <p className="mt-1 text-sm text-muted">
              Try a different search term or clear the tag filter.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                className="rounded-card border border-border bg-surface p-4 shadow-soft transition-shadow hover:shadow-softHover"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{note.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      {note.summary}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1 text-xs text-muted">
                        <FileText size={12} />
                        {note.source}
                      </span>
                      <span className="text-xs text-muted">·</span>
                      <span className="text-xs text-muted">{note.updatedAt}</span>
                      {note.tags.map((tag) => (
                        <span
                          key={tag}
                          className="flex items-center gap-1 rounded-pill bg-accent-soft px-2 py-0.5 text-xs text-accent"
                        >
                          <Tag size={10} />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}