"use client";

import { useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useContext } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { GlobalContext } from "../../components/GlobalContext";
const API_URL = process.env.NEXT_PUBLIC_API_URL;
export default function LoginPage() {
 const [form, setForm] = useState({ email: "", password: "" });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useContext(GlobalContext);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, form);

      sessionStorage.setItem("adminToken", res.data.token);
      // Fixed order: update auth context BEFORE navigating away —
      // window.location.href triggers a full page navigation, so any
      // code after it is unlikely to execute.
      login(res.data.user);
      window.location.href = "/dashboard";
    } catch (error) {
      setError(error.response?.data?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      <header className="max-w-6xl mx-auto w-full px-6 py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft size={16} />
          Back to AgentDesk
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="font-sans text-2xl font-semibold tracking-tight mb-2">
              Log in
            </h1>
            <p className="text-muted text-sm">
              Welcome back. Your pending actions are waiting.
            </p>
          </div>

          <div className="bg-surface rounded-card border border-border shadow-soft p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-1.5"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-control border border-border bg-bg text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                  placeholder="you@company.com"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium mb-1.5"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-control border border-border bg-bg text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p className="text-sm text-danger bg-danger-soft rounded-control px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-pill bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? "Logging in..." : "Log in"}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-muted mt-6">
            Don't have a workspace yet?{" "}
            <Link
              href="/register"
              className="text-accent font-medium hover:text-accent-hover transition-colors"
            >
              Create one
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}