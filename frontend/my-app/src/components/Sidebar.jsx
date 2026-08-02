"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListTodo,
  CalendarClock,
  MessageSquare,
  FileText,
  BookOpen,
  Settings,
} from "lucide-react";
import { useGlobalContext } from "@/components/GlobalContext";

const PURPLE = "#8A05FF";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: ListTodo, badgeKey: "pending" },
  { href: "/meetings", label: "Meetings", icon: CalendarClock },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/structured-notes", label: "Structured Notes", icon: BookOpen },
];

export default function Sidebar({ pendingCount = 0 }) {
  const pathname = usePathname();
  const { workspace } = useGlobalContext();

  const workspaceName = workspace?.name || "Workspace";

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* Workspace switcher */}
      <div className="flex items-center gap-2.5 border-b border-gray-200 px-4 py-4">
        <div
          className="flex h-8 w-8 items-center justify-center text-sm font-semibold text-white"
          style={{ backgroundColor: PURPLE }}
        >
          {workspaceName.charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="truncate text-sm font-medium text-black">
            {workspaceName}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wide text-gray-400">
            Workspace
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-3">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between gap-2 px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-gray-50 font-medium text-black"
                  : "text-gray-500 hover:bg-gray-50 hover:text-black"
              }`}
              style={isActive ? { borderLeft: `2px solid ${PURPLE}`, paddingLeft: "10px" } : undefined}
            >
              <span className="flex items-center gap-2.5">
                <Icon size={17} strokeWidth={2} style={isActive ? { color: PURPLE } : undefined} />
                {item.label}
              </span>
              {item.badgeKey === "pending" && pendingCount > 0 && (
                <span
                  className="px-2 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: PURPLE }}
                >
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: settings */}
      <div className="border-t border-gray-200 px-3 py-3">
        <Link
          href="/settings/workspace"
          className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
            pathname.startsWith("/settings")
              ? "bg-gray-50 font-medium text-black"
              : "text-gray-500 hover:bg-gray-50 hover:text-black"
          }`}
          style={
            pathname.startsWith("/settings")
              ? { borderLeft: `2px solid ${PURPLE}`, paddingLeft: "10px" }
              : undefined
          }
        >
          <Settings
            size={17}
            strokeWidth={2}
            style={pathname.startsWith("/settings") ? { color: PURPLE } : undefined}
          />
          Settings
        </Link>
      </div>
    </aside>
  );
}