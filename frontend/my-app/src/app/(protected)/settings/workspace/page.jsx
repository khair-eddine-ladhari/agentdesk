"use client";

import { useState, useEffect, useContext } from "react";
import axios from "axios";
import AppShell from "@/components/AppShell";
import { GlobalContext } from "@/components/GlobalContext";
import { Mail, Trash2, Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const PURPLE = "#8A05FF";

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
    if (contextLoading) return;

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
    setMembers((prev) => prev.filter((m) => m.id !== id));
    try {
      await axios.delete(
        `${API_URL}/workspaces/${workspace._id}/members/${id}`,
        { headers: authHeaders() }
      );
    } catch (err) {
      setMembers(previous);
      setError(err.response?.data?.message || "Couldn't remove that member");
    }
  }

  if (loading) {
    return (
      <AppShell title="Workspace Settings">
        <div className="flex h-64 items-center justify-center bg-white">
          <Loader2 size={20} className="animate-spin" style={{ color: PURPLE }} />
        </div>
      </AppShell>
    );
  }

  if (!workspace) {
    return (
      <AppShell title="Workspace Settings">
        <div className="mx-auto max-w-2xl bg-white min-h-screen">
          <div className="border border-gray-200 p-8 text-center">
            <h2 className="text-lg font-semibold text-black">No workspace yet</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-gray-400">
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
        {/* Header */}
        <div className="flex items-end justify-between border-b border-gray-900 pb-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wide text-gray-400 mb-1">
              Settings
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-black">
              Workspace
            </h1>
          </div>
        </div>

        {error && (
          <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {/* Workspace name */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-black">Workspace name</h2>
          <div className="border border-gray-200 p-5">
            <form onSubmit={handleSaveName} className="flex items-end gap-3">
              <div className="flex-1">
                <label htmlFor="workspaceName" className="mb-1.5 block text-xs text-gray-400">
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
                  className="w-full border border-gray-300 px-3.5 py-2.5 text-sm text-black focus:outline-none focus:border-black"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: PURPLE }}
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                {saving ? "Saving..." : saved ? "Saved" : "Save"}
              </button>
            </form>
          </div>
        </section>

        {/* Team members */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-black">Team members</h2>
          <div className="border border-gray-200">
            <div className="divide-y divide-gray-100">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-medium text-black">{member.name}</p>
                    <p className="text-xs text-gray-400">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="border border-gray-200 px-2.5 py-1 text-xs text-gray-600">
                      {member.role}
                    </span>
                    {member.role !== "Owner" && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-gray-400 hover:text-red-600"
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
              className="flex items-center gap-2 border-t border-gray-200 p-4"
            >
              <Mail size={15} className="shrink-0 text-gray-400" />
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value);
                  setInviteError("");
                }}
                placeholder="Invite by email"
                className="flex-1 border border-gray-300 px-3.5 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black"
              />
              <button
                type="submit"
                disabled={inviting}
                className="px-3.5 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: PURPLE }}
              >
                {inviting ? "Adding..." : "Invite"}
              </button>
            </form>
            {inviteError && (
              <p className="px-4 pb-3 text-xs text-red-600">{inviteError}</p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}