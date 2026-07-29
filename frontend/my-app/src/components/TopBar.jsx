"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Search, User, LogOut } from "lucide-react";
import { useGlobalContext } from "@/components/GlobalContext";

export default function TopBar({ title }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const router = useRouter();
  const { user, logout } = useGlobalContext();

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Derive initials from the real user's name, since GlobalContext doesn't
  // store them separately.
  const displayName = user?.name || "Account";
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  async function handleLogout() {
    setMenuOpen(false);
    await logout(); // clears sessionStorage + resets user/workspace in context
    router.push("/");
  }

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

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Account menu"
            aria-expanded={menuOpen}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-medium text-white"
          >
            {initials}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-10 w-48 rounded-card border border-border bg-surface py-1.5 shadow-softHover">
              <div className="border-b border-border px-3.5 py-2.5">
                <p className="truncate text-sm font-medium text-ink">{displayName}</p>
              </div>

              <Link
                href="/settings/account"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-ink hover:bg-bg"
              >
                <User size={15} className="text-muted" />
                Account Settings
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-ink hover:bg-bg"
              >
                <LogOut size={15} className="text-muted" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}