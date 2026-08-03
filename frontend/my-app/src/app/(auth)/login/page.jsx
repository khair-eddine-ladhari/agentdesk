"use client";

import { useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useContext } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { GlobalContext } from "../../../components/GlobalContext";
const API_URL = process.env.NEXT_PUBLIC_API_URL;

const PURPLE = "#8A05FF";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useContext(GlobalContext);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const validate = () => {
    const email = form.email.trim();
    const password = form.password;

    if (!email) return "Email is required.";
    if (!EMAIL_REGEX.test(email)) return "Enter a valid email address.";
    if (!password) return "Password is required.";
    if (password.length < 6) return "Password must be at least 6 characters.";

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/login`, {
        email: form.email.trim(),
        password: form.password,
      });

      sessionStorage.setItem("adminToken", res.data.token);
      login(res.data.user);
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err.response?.data?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

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
              Sign in
            </div>
            <h1 className="font-sans text-2xl font-semibold tracking-tight mb-2">
              Log in
            </h1>
            <p className="text-gray-500 text-sm">
              Welcome back. Your pending actions are waiting.
            </p>
          </div>

          <div className="border border-gray-200 p-6">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
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
                  autoComplete="current-password"
                  value={form.password}
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
                {loading ? "Logging in..." : "Log in"}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have a workspace yet?{" "}
            <Link
              href="/register"
              className="font-medium hover:opacity-80 transition-opacity"
              style={{ color: PURPLE }}
            >
              Create one
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}