"use client";

import { useState, useEffect, useContext } from "react";
import axios from "axios";
import AppShell from "@/components/AppShell";
import { GlobalContext } from "@/components/GlobalContext";
import { Mail, Trash2, Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function WorkspaceSettingsPage() {
  const { workspace, loading: contextLoading } = useContext(GlobalContext);

  const [workspaceName, setWorkspaceName] = useState("");
  const [members, setMembers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviting, setInviting] = useState(false);

  function authHeaders() {
    const token = sessionStorage.getItem("adminToken");
    return {
      Authorization: `Bearer ${token}`,
      "X-Workspace-ID": workspace._id,
    };
  }

  useEffect(() => {
    // GlobalContext hasn't finished checking for a workspace yet - keep
    // showing the spinner, don't fetch, don't give up yet.
    if (contextLoading) return;

    // Context is done and there's genuinely no workspace - stop the
    // spinner instead of hanging on it forever.
    if (!workspace?._id) {
      setLoading(false);
      return;
    }

    async function fetchSettings() {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get(
          `${API_URL}/workspaces/${workspace._id}/settings`,
          { headers: authHeaders() }
        );
        setWorkspaceName(res.data.name);
        setMembers(res.data.members);
      } catch (err) {
        setError(
          err.response?.data?.message ||
          "Couldn't load workspace settings. Try refreshing."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, [workspace?._id, contextLoading]);

  async function handleSaveName(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await axios.patch(
        `${API_URL}/workspaces/${workspace._id}`,
        { name: workspaceName },
        { headers: authHeaders() }
      );
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save the workspace name");
    } finally {
      setSaving(false);
    }
  }

  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setInviteError("");
    try {
      const res = await axios.post(
        `${API_URL}/workspaces/${workspace._id}/members`,
        { email: inviteEmail.trim() },
        { headers: authHeaders() }
      );
      setMembers((prev) => [...prev, res.data]);
      setInviteEmail("");
    } catch (err) {
      setInviteError(
        err.response?.data?.message || "Couldn't add that person"
      );
    } finally {
      setInviting(false);
    }
  }

  async function handleRemoveMember(id) {
    const previous = members;
    setMembers((prev) => prev.filter((m) => m.id !== id)); // optimistic
    try {
      await axios.delete(
        `${API_URL}/workspaces/${workspace._id}/members/${id}`,
        { headers: authHeaders() }
      );
    } catch (err) {
      setMembers(previous); // revert on failure
      setError(err.response?.data?.message || "Couldn't remove that member");
    }
  }

  if (loading) {
    return (
      <AppShell title="Workspace Settings">
        <div className="flex h-64 items-center justify-center">
          <Loader2 size={20} className="animate-spin text-muted" />
        </div>
      </AppShell>
    );
  }

  if (!workspace) {
    return (
      <AppShell title="Workspace Settings">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-card border border-border bg-surface p-6 text-center shadow-soft">
            <h2 className="text-lg font-semibold text-ink">No workspace yet</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted">
              Create a workspace first to manage its name and members.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Workspace Settings">
      <div className="mx-auto max-w-2xl space-y-8">
        {error && (
          <p className="rounded-card border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        {/* Workspace name */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-ink">Workspace name</h2>
          <div className="rounded-card border border-border bg-surface p-5 shadow-soft">
            <form onSubmit={handleSaveName} className="flex items-end gap-3">
              <div className="flex-1">
                <label htmlFor="workspaceName" className="mb-1.5 block text-xs text-muted">
                  This is what your team sees across the app
                </label>
                <input
                  id="workspaceName"
                  type="text"
                  value={workspaceName}
                  onChange={(e) => {
                    setWorkspaceName(e.target.value);
                    setSaved(false);
                  }}
                  className="w-full rounded-control border border-border bg-bg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 rounded-pill bg-accent px-4 py-2.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-60"
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                {saving ? "Saving..." : saved ? "Saved" : "Save"}
              </button>
            </form>
          </div>
        </section>

        {/* Team members */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-ink">Team members</h2>
          <div className="rounded-card border border-border bg-surface shadow-soft">
            <div className="divide-y divide-border">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{member.name}</p>
                    <p className="text-xs text-muted">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-pill bg-accent-soft px-2.5 py-1 text-xs text-accent">
                      {member.role}
                    </span>
                    {member.role !== "Owner" && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-muted hover:text-danger"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <form
              onSubmit={handleInvite}
              className="flex items-center gap-2 border-t border-border p-4"
            >
              <Mail size={15} className="shrink-0 text-muted" />
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value);
                  setInviteError("");
                }}
                placeholder="Invite by email"
                className="flex-1 rounded-control border border-border bg-bg px-3.5 py-2 text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
              <button
                type="submit"
                disabled={inviting}
                className="rounded-pill bg-accent px-3.5 py-2 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-60"
              >
                {inviting ? "Adding..." : "Invite"}
              </button>
            </form>
            {inviteError && (
              <p className="px-4 pb-3 text-xs text-danger">{inviteError}</p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}