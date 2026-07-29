"use client";

import Link from "next/link";
import { ArrowUpRight, FileText, CheckCircle2, ShieldCheck } from "lucide-react";
import { useGlobalContext } from "@/components/GlobalContext";

export default function HomePage() {
  const { user, loading } = useGlobalContext();

  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* Header */}
      <header className="max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
        <span className="font-sans text-lg font-semibold tracking-tight">
          AgentDesk
        </span>
        <nav className="flex items-center gap-3">
          {loading ? null : user ? (
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium rounded-pill bg-accent text-white hover:bg-accent-hover transition-colors"
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-ink/80 hover:text-ink transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-sm font-medium rounded-pill bg-accent text-white hover:bg-accent-hover transition-colors"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-6">
        <section className="pt-16 pb-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block px-3 py-1 rounded-pill bg-accent-soft text-accent text-xs font-medium mb-6">
              Built for teams who need a paper trail
            </span>
            <h1 className="font-sans text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1] mb-6">
              Messy notes in.
              <br />
              Structured actions out.
              <br />
              <span className="text-accent">Nothing executes without you.</span>
            </h1>
            <p className="text-muted text-lg leading-relaxed mb-8 max-w-md">
              AgentDesk turns documents and conversations into clear,
              approvable action items — every one logged, every one signed
              off by a human before it runs.
            </p>
            <div className="flex items-center gap-4">
              {loading ? null : user ? (
                <Link
                  href="/homepage"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-pill bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors"
                >
                  Go to dashboard
                  <ArrowUpRight size={16} />
                </Link>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-pill bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors"
                  >
                    Create your workspace
                    <ArrowUpRight size={16} />
                  </Link>
                  <Link
                    href="/login"
                    className="text-sm font-medium text-ink/80 hover:text-ink transition-colors"
                  >
                    I already have an account
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Signature element: the 3-step pipeline card */}
          <div className="bg-surface rounded-card border border-border shadow-soft p-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 rounded-control bg-bg border border-border">
                <FileText size={18} className="text-muted mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Meeting notes.docx</p>
                  <p className="text-xs text-muted mt-0.5">
                    Uploaded 2 minutes ago
                  </p>
                </div>
              </div>

              <div className="flex justify-center text-muted text-xs font-mono">
                ↓ structured into 3 actions
              </div>

              <div className="flex items-start gap-3 p-4 rounded-control bg-bg border border-border">
                <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    Send follow-up to client re: contract terms
                  </p>
                  <p className="text-xs text-muted mt-0.5 font-mono">
                    awaiting approval
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-control bg-accent-soft border border-accent/20">
                <CheckCircle2 size={18} className="text-accent mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    Update project status to "In Review"
                  </p>
                  <p className="text-xs text-accent mt-0.5 font-mono">
                    approved · logged 09:41:12
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust strip */}
        <section className="border-t border-border py-10 flex flex-wrap gap-x-10 gap-y-4 items-center justify-between">
          <div className="flex items-center gap-2 text-muted text-sm">
            <ShieldCheck size={16} className="text-accent" />
            Every action is logged, timestamped, and traceable back to its source
          </div>
          <div className="flex gap-8 text-sm text-muted font-mono">
            <span>01 — capture</span>
            <span>02 — structure</span>
            <span>03 — approve</span>
          </div>
        </section>
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-10 border-t border-border">
        <p className="text-xs text-muted">
          © {new Date().getFullYear()} AgentDesk. Built for teams that need a
          record of every decision.
        </p>
      </footer>
    </div>
  );
}