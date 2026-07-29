"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { Loader2, LogOut } from "lucide-react";
import { useGlobalContext } from "@/components/GlobalContext";

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
   
    await logout(); // clears sessionStorage + resets user/workspace in context
    router.push("/");
  }

  return (
    <AppShell title="Account Settings">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Profile */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-ink">Profile</h2>
          <div className="rounded-card border border-border bg-surface p-5 shadow-soft">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label htmlFor="name" className="mb-1.5 block text-xs text-muted">
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
                  className="w-full rounded-control border border-border bg-bg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>
              <div>
                <label htmlFor="email" className="mb-1.5 block text-xs text-muted">
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
                  className="w-full rounded-control border border-border bg-bg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="flex items-center gap-1.5 rounded-pill bg-accent px-4 py-2.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-60"
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
          <h2 className="mb-3 text-sm font-medium text-ink">Password</h2>
          <div className="rounded-card border border-border bg-surface p-5 shadow-soft">
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label htmlFor="current" className="mb-1.5 block text-xs text-muted">
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
                  className="w-full rounded-control border border-border bg-bg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="next" className="mb-1.5 block text-xs text-muted">
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
                    className="w-full rounded-control border border-border bg-bg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                </div>
                <div>
                  <label htmlFor="confirm" className="mb-1.5 block text-xs text-muted">
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
                    className="w-full rounded-control border border-border bg-bg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                </div>
              </div>

              {passwordError && (
                <p className="rounded-control bg-danger-soft px-3 py-2 text-sm text-danger">
                  {passwordError}
                </p>
              )}

              <button
                type="submit"
                disabled={passwordSaving}
                className="flex items-center gap-1.5 rounded-pill bg-accent px-4 py-2.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-60"
              >
                {passwordSaving && <Loader2 size={13} className="animate-spin" />}
                {passwordSaving ? "Updating..." : passwordSaved ? "Updated" : "Update password"}
              </button>
            </form>
          </div>
        </section>

        {/* Logout */}
        <section>
          <div className="flex items-center justify-between rounded-card border border-border bg-surface p-5 shadow-soft">
            <div>
              <p className="text-sm font-medium text-ink">Log out</p>
              <p className="text-xs text-muted">
                You'll need to log back in to access this workspace.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-1.5 rounded-pill border border-border px-4 py-2.5 text-xs font-medium text-ink hover:bg-bg disabled:opacity-60"
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