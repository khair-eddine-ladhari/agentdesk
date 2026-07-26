"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  MessageSquare,
  FileText,
  BookOpen,
  History,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pending-actions", label: "Pending Actions", icon: CheckSquare, badgeKey: "pending" },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/structured-notes", label: "Structured Notes", icon: BookOpen },
  { href: "/audit-log", label: "Audit Log", icon: History },
];

export default function Sidebar({ pendingCount = 0, workspaceName = "Acme Inc." }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-surface">
      {/* Workspace switcher */}
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-control bg-accent-soft text-sm font-semibold text-accent">
          {workspaceName.charAt(0)}
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="truncate text-sm font-medium text-ink">
            {workspaceName}
          </span>
          <span className="text-xs text-muted">Workspace</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between gap-2 rounded-control px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-accent-soft font-medium text-accent"
                  : "text-muted hover:bg-bg hover:text-ink"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon size={17} strokeWidth={2} />
                {item.label}
              </span>
              {item.badgeKey === "pending" && pendingCount > 0 && (
                <span className="rounded-pill bg-accent px-2 py-0.5 text-xs font-medium text-white">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: settings */}
      <div className="border-t border-border px-3 py-3">
        <Link
          href="/settings"
          className={`flex items-center gap-2.5 rounded-control px-3 py-2 text-sm transition-colors ${
            pathname === "/settings"
              ? "bg-accent-soft font-medium text-accent"
              : "text-muted hover:bg-bg hover:text-ink"
          }`}
        >
          <Settings size={17} strokeWidth={2} />
          Settings
        </Link>
      </div>
    </aside>
  );
}