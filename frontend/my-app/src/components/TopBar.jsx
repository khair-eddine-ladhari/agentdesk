"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Search, User, LogOut, Home } from "lucide-react";
import { useGlobalContext } from "@/components/GlobalContext";

const PURPLE = "#8A05FF";

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

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
    await logout();
    router.push("/");
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h1 className="font-mono text-[11px] uppercase tracking-wide text-gray-400">
        {title}
      </h1>


      <div className="flex items-center gap-1">
        
        {/* Search */}
        <button
          type="button"
          aria-label="Search"
          className="flex h-8 w-8 items-center justify-center text-gray-400 transition-colors hover:bg-gray-50 hover:text-black"
        >
          <Search size={16} strokeWidth={2} />
        </button>

        {/* Notifications */}
        <button
          type="button"
          aria-label="Notifications"
          className="flex h-8 w-8 items-center justify-center text-gray-400 transition-colors hover:bg-gray-50 hover:text-black"
        >
          <Bell size={16} strokeWidth={2} />
        </button>

        {/* Home button */}
        <button
          type="button"
          aria-label="Home"
          onClick={() => router.push("/")}
          className="flex h-8 w-8 items-center justify-center text-gray-400 transition-colors hover:bg-gray-50 hover:text-black"
        >
          <Home size={16} strokeWidth={2} />
        </button>


        {/* Account menu */}
        <div className="relative ml-2" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Account menu"
            aria-expanded={menuOpen}
            className="flex h-8 w-8 items-center justify-center text-xs font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: PURPLE }}
          >
            {initials}
          </button>

          

          {menuOpen && (
            <div className="absolute right-0 top-10 w-48 border border-gray-200 bg-white py-1.5 shadow-sm">
              <div className="border-b border-gray-100 px-3.5 py-2.5">
                <p className="truncate text-sm font-medium text-black">
                  {displayName}
                </p>
              </div>

              <Link
                href="/settings/account"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-black hover:bg-gray-50"
              >
                <User size={15} className="text-gray-400" />
                Account Settings
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-black hover:bg-gray-50"
              >
                <LogOut size={15} className="text-gray-400" />
                Log out
              </button>
            </div>
            
          )}
        </div>
        
      </div>
    </header>
  );
}