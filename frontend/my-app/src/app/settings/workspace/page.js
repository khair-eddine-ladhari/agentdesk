"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import { Mail, Trash2, Shield, Loader2 } from "lucide-react";

// Placeholder data — swap for real fetches later
const INITIAL_MEMBERS = [
  { id: "u1", name: "Jordan Blake", email: "jordan@company.com", role: "Owner" },
  { id: "u2", name: "Sam Rivera", email: "sam@company.com", role: "Member" },
];

const AGENTS = [
  { id: "email", name: "Email Agent", description: "Drafts and sends follow-up emails", enabled: true },
  { id: "task", name: "Task Agent", description: "Creates and updates tasks in your tracker", enabled: true },
  { id: "crm", name: "CRM Agent", description: "Updates client records from conversations", enabled: false },
];

export default function WorkspaceSettingsPage() {
  const [workspaceName, setWorkspaceName] = useState("Acme Consulting");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [members, setMembers] = useState(INITIAL_MEMBERS);
  const [inviteEmail, setInviteEmail] = useState("");
  const [agents, setAgents] = useState(AGENTS);

  async function handleSaveName(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    // TODO: PATCH /api/workspace { name: workspaceName }
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    setSaved(true);
  }

  function handleInvite(e) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    // TODO: POST /api/workspace/invites { email: inviteEmail }
    setMembers((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: inviteEmail, email: inviteEmail, role: "Invited" },
    ]);
    setInviteEmail("");
  }

  function handleRemoveMember(id) {
    // TODO: DELETE /api/workspace/members/:id
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }

  function toggleAgent(id) {
    // TODO: PATCH /api/workspace/agents/:id { enabled }
    setAgents((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  }

  return (
    <AppShell title="Workspace Settings">
      <div className="mx-auto max-w-2xl space-y-8">
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
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Invite by email"
                className="flex-1 rounded-control border border-border bg-bg px-3.5 py-2 text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
              <button
                type="submit"
                className="rounded-pill bg-accent px-3.5 py-2 text-xs font-medium text-white hover:bg-accent-hover"
              >
                Invite
              </button>
            </form>
          </div>
        </section>

        {/* Agent toggles */}
        <section>
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-ink">
            <Shield size={14} className="text-accent" />
            Agents
          </h2>
          <div className="divide-y divide-border rounded-card border border-border bg-surface shadow-soft">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center justify-between px-4 py-3.5"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{agent.name}</p>
                  <p className="text-xs text-muted">{agent.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleAgent(agent.id)}
                  aria-pressed={agent.enabled}
                  className={`relative h-6 w-11 shrink-0 rounded-pill transition-colors ${
                    agent.enabled ? "bg-accent" : "bg-border"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-soft transition-transform ${
                      agent.enabled ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}