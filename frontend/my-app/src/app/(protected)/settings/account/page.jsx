"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { Loader2, LogOut } from "lucide-react";
import { useGlobalContext } from "@/components/GlobalContext";

const PURPLE = "#8A05FF";

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user, logout } = useGlobalContext();

  const [profile, setProfile] = useState({
    name: "Jordan Blake",
    email: "jordan@company.com",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [passwords, setPasswords] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const [loggingOut, setLoggingOut] = useState(false);

  async function handleSaveProfile(e) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSaved(false);
    // TODO: PATCH /api/account { name, email }
    await new Promise((r) => setTimeout(r, 500));
    setProfileSaving(false);
    setProfileSaved(true);
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSaved(false);

    if (passwords.next.length < 8) {
      setPasswordError("New password needs to be at least 8 characters.");
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setPasswordError("Those passwords don't match.");
      return;
    }

    setPasswordSaving(true);
    try {
      // TODO: POST /api/account/password { current, next }
      await new Promise((r) => setTimeout(r, 500));
      setPasswords({ current: "", next: "", confirm: "" });
      setPasswordSaved(true);
    } catch {
      setPasswordError("Couldn't update your password. Check your current password and try again.");
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout(); // clears sessionStorage + resets user/workspace in context
      router.push("/");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <AppShell title="Account Settings">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Header */}
        <div className="flex items-end justify-between border-b border-gray-900 pb-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wide text-gray-400 mb-1">
              Settings
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-black">
              Account
            </h1>
          </div>
        </div>

        {/* Profile */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-black">Profile</h2>
          <div className="border border-gray-200 p-5">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label htmlFor="name" className="mb-1.5 block text-xs text-gray-400">
                  Full name
                </label>
                <input
                  id="name"
                  type="text"
                  value={profile.name}
                  onChange={(e) => {
                    setProfile((p) => ({ ...p, name: e.target.value }));
                    setProfileSaved(false);
                  }}
                  className="w-full border border-gray-300 px-3.5 py-2.5 text-sm text-black focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label htmlFor="email" className="mb-1.5 block text-xs text-gray-400">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => {
                    setProfile((p) => ({ ...p, email: e.target.value }));
                    setProfileSaved(false);
                  }}
                  className="w-full border border-gray-300 px-3.5 py-2.5 text-sm text-black focus:outline-none focus:border-black"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: PURPLE }}
                >
                  {profileSaving && <Loader2 size={13} className="animate-spin" />}
                  {profileSaving ? "Saving..." : profileSaved ? "Saved" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Password */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-black">Password</h2>
          <div className="border border-gray-200 p-5">
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label htmlFor="current" className="mb-1.5 block text-xs text-gray-400">
                  Current password
                </label>
                <input
                  id="current"
                  type="password"
                  autoComplete="current-password"
                  value={passwords.current}
                  onChange={(e) =>
                    setPasswords((p) => ({ ...p, current: e.target.value }))
                  }
                  className="w-full border border-gray-300 px-3.5 py-2.5 text-sm text-black focus:outline-none focus:border-black"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="next" className="mb-1.5 block text-xs text-gray-400">
                    New password
                  </label>
                  <input
                    id="next"
                    type="password"
                    autoComplete="new-password"
                    value={passwords.next}
                    onChange={(e) =>
                      setPasswords((p) => ({ ...p, next: e.target.value }))
                    }
                    className="w-full border border-gray-300 px-3.5 py-2.5 text-sm text-black focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label htmlFor="confirm" className="mb-1.5 block text-xs text-gray-400">
                    Confirm new password
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    value={passwords.confirm}
                    onChange={(e) =>
                      setPasswords((p) => ({ ...p, confirm: e.target.value }))
                    }
                    className="w-full border border-gray-300 px-3.5 py-2.5 text-sm text-black focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              {passwordError && (
                <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {passwordError}
                </p>
              )}

              <button
                type="submit"
                disabled={passwordSaving}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: PURPLE }}
              >
                {passwordSaving && <Loader2 size={13} className="animate-spin" />}
                {passwordSaving ? "Updating..." : passwordSaved ? "Updated" : "Update password"}
              </button>
            </form>
          </div>
        </section>

        {/* Logout */}
        <section>
          <div className="flex items-center justify-between border border-gray-200 p-5">
            <div>
              <p className="text-sm font-medium text-black">Log out</p>
              <p className="text-xs text-gray-400">
                You'll need to log back in to access this workspace.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-1.5 border border-gray-300 px-4 py-2.5 text-xs font-medium text-black hover:bg-gray-50 disabled:opacity-60"
            >
              {loggingOut ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
              {loggingOut ? "Logging out..." : "Log out"}
            </button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}