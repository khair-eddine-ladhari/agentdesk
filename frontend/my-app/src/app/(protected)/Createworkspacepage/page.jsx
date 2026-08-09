"use client";

import { useState, useContext } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Loader2 } from "lucide-react";

import { GlobalContext } from "@/components/GlobalContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const PURPLE = "#8A05FF";
const PURPLE_HOVER = "#7A00E6";
const PURPLE_RING = "rgba(138, 5, 255, 0.3)";

export default function CreateWorkspacePage() {
  const { setWorkspace } = useContext(GlobalContext);
  const router = useRouter();

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    setError("");

    const token = sessionStorage.getItem("adminToken");

    try {
      const res = await axios.post(
        `${API_URL}/workspaces`,
        { name: name.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Put the new workspace straight into context so the rest of the
      // app (dashboard, settings, etc.) picks it up immediately - no
      // need to refetch the workspace list right after creating one.
      setWorkspace(res.data);

      router.push("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.error ||
        "Couldn't create the workspace. Try again."
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm border border-border bg-surface p-6 shadow-soft">
        <h1 className="text-lg font-semibold text-ink">Create your workspace</h1>
        <p className="mt-1 text-sm text-muted">
          This is where your team's tasks, documents, and chats will live.
        </p>

        <form onSubmit={handleCreate} className="mt-5 space-y-4">
          <div>
            <label htmlFor="workspaceName" className="mb-1.5 block text-xs text-muted">
              Workspace name
            </label>
            <input
              id="workspaceName"
              type="text"
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="Acme Consulting"
              className="w-full border border-border bg-bg px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": PURPLE_RING }}
              onFocus={(e) => (e.target.style.borderColor = PURPLE)}
              onBlur={(e) => (e.target.style.borderColor = "")}
            />
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="flex w-full items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: PURPLE }}
            onMouseEnter={(e) => {
              if (!creating && name.trim()) e.target.style.backgroundColor = PURPLE_HOVER;
            }}
            onMouseLeave={(e) => (e.target.style.backgroundColor = PURPLE)}
          >
            {creating && <Loader2 size={14} className="animate-spin" />}
            {creating ? "Creating..." : "Create workspace"}
          </button>
        </form>
      </div>
    </div>
  );
}