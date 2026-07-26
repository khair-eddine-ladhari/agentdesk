"use client";

import { Bell, Search } from "lucide-react";

export default function TopBar({ title, user = { name: "Khaireddine Ladhari", initials: "KL" } }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-6">
      <h1 className="text-sm font-medium text-ink">{title}</h1>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Search"
          className="flex h-8 w-8 items-center justify-center rounded-control text-muted transition-colors hover:bg-bg hover:text-ink"
        >
          <Search size={16} strokeWidth={2} />
        </button>

        <button
          type="button"
          aria-label="Notifications"
          className="flex h-8 w-8 items-center justify-center rounded-control text-muted transition-colors hover:bg-bg hover:text-ink"
        >
          <Bell size={16} strokeWidth={2} />
        </button>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-medium text-white">
          {user.initials}
        </div>
      </div>
    </header>
  );
}