"use client";

import { useState, useContext } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { GlobalContext } from "../../../components/GlobalContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const PURPLE = "#8A05FF";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useContext(GlobalContext);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Those passwords don't match.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password needs to be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Couldn't create your account. Try again.");
      }

      sessionStorage.setItem("adminToken", data.token);
      login(data.user);

      window.location.href = "/dashboard";
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      <header className="max-w-6xl mx-auto w-full px-6 py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-black transition-colors"
        >
          <ArrowLeft size={16} />
          Back to AgentDesk
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="font-mono text-[11px] uppercase tracking-wide text-gray-400 mb-2">
              Create account
            </div>
            <h1 className="font-sans text-2xl font-semibold tracking-tight mb-2">
              Create your workspace
            </h1>
            <p className="text-gray-500 text-sm">
              Every action your agents take will be logged here, waiting on your say-so.
            </p>
          </div>

          <div className="border border-gray-200 p-6">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1.5">
                  Full name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-gray-300 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors"
                  placeholder="Jordan Blake"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1.5">
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
                  className="w-full px-3.5 py-2.5 border border-gray-300 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors"
                  placeholder="you@company.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-gray-300 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors"
                  placeholder="At least 8 characters"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1.5">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-gray-300 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: PURPLE }}
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium hover:opacity-80 transition-opacity"
              style={{ color: PURPLE }}
            >
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}