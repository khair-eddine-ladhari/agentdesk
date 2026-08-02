"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  FileText,
  CheckCircle2,
  ShieldCheck,
  Users,
  CalendarClock,
  MessageSquare,
  BookOpen,
  Lock,
  History,
  Zap,
} from "lucide-react";
import { useGlobalContext } from "@/components/GlobalContext";

const PURPLE = "#8A05FF";

const FEATURES = [
  {
    icon: MessageSquare,
    title: "Chat with your agents",
    body: "Ask questions or hand off tasks in plain language. Every response and proposed action is logged.",
  },
  {
    icon: FileText,
    title: "Documents, structured",
    body: "Upload notes, contracts, or transcripts. Agents extract key points, action items, and dates automatically.",
  },
  {
    icon: CalendarClock,
    title: "Meetings tracked",
    body: "Agent-scheduled meetings and their attendees show up in one place, no digging through email.",
  },
  {
    icon: CheckCircle2,
    title: "Approve before it runs",
    body: "No agent action executes without a human sign-off. Approve, decline, or review the full parameters first.",
  },
  {
    icon: Users,
    title: "Built for teams",
    body: "Invite your team, assign roles, and keep a shared record of what's pending and what's done.",
  },
  {
    icon: History,
    title: "Full audit trail",
    body: "Every approval, decline, and execution is timestamped and traceable back to its source document or message.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Capture",
    body: "Drop in documents, chat with an agent, or let meetings get logged automatically.",
  },
  {
    n: "02",
    title: "Structure",
    body: "Agents turn raw notes and conversation into clear, reviewable action items.",
  },
  {
    n: "03",
    title: "Approve",
    body: "Nothing executes until a human signs off. Every decision is logged with a timestamp.",
  },
];

export default function HomePage() {
  const { user, loading } = useGlobalContext();

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
        <span className="font-sans text-lg font-semibold tracking-tight">
          AgentDesk
        </span>
        <nav className="flex items-center gap-3">
          {loading ? null : user ? (
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: PURPLE }}
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-black transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: PURPLE }}
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-6">
        {/* Hero */}
        <section className="pt-16 pb-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span
              className="inline-block px-3 py-1 text-xs font-medium mb-6"
              style={{ backgroundColor: "#f4f0ff", color: PURPLE }}
            >
              Built for teams who need a paper trail
            </span>
            <h1 className="font-sans text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1] mb-6">
              Messy notes in.
              <br />
              Structured actions out.
              <br />
              <span style={{ color: PURPLE }}>Nothing executes without you.</span>
            </h1>
            <p className="text-gray-500 text-lg leading-relaxed mb-8 max-w-md">
              AgentDesk turns documents and conversations into clear,
              approvable action items — every one logged, every one signed
              off by a human before it runs.
            </p>
            <div className="flex items-center gap-4">
              {loading ? null : user ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-5 py-3 text-white text-sm font-medium transition-opacity hover:opacity-90"
                  style={{ backgroundColor: PURPLE }}
                >
                  Go to dashboard
                  <ArrowUpRight size={16} />
                </Link>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 px-5 py-3 text-white text-sm font-medium transition-opacity hover:opacity-90"
                    style={{ backgroundColor: PURPLE }}
                  >
                    Create your workspace
                    <ArrowUpRight size={16} />
                  </Link>
                  <Link
                    href="/login"
                    className="text-sm font-medium text-gray-600 hover:text-black transition-colors"
                  >
                    I already have an account
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Signature element: the 3-step pipeline card */}
          <div className="border border-gray-200 p-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200">
                <FileText size={18} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Meeting notes.docx</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Uploaded 2 minutes ago
                  </p>
                </div>
              </div>

              <div className="flex justify-center text-gray-400 text-xs font-mono">
                ↓ structured into 3 actions
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200">
                <div
                  className="w-1.5 h-1.5 mt-2"
                  style={{ backgroundColor: PURPLE }}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    Send follow-up to client re: contract terms
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">
                    awaiting approval
                  </p>
                </div>
              </div>

              <div
                className="flex items-start gap-3 p-4 border"
                style={{ backgroundColor: "#f4f0ff", borderColor: "#e7dbff" }}
              >
                <CheckCircle2 size={18} className="mt-0.5" style={{ color: PURPLE }} />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    Update project status to "In Review"
                  </p>
                  <p className="text-xs mt-0.5 font-mono" style={{ color: PURPLE }}>
                    approved · logged 09:41:12
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-gray-200 py-16">
          <div className="mb-10">
            <div className="font-mono text-[11px] uppercase tracking-wide text-gray-400 mb-2">
              How it works
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Click, click, approved.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div key={step.n}>
                <div
                  className="inline-flex h-8 w-8 items-center justify-center text-xs font-semibold text-white mb-4"
                  style={{ backgroundColor: PURPLE }}
                >
                  {step.n}
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features grid */}
        <section className="border-t border-gray-200 py-16">
          <div className="mb-10">
            <div className="font-mono text-[11px] uppercase tracking-wide text-gray-400 mb-2">
              Features
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Everything the workspace needs, nothing it doesn't.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 border border-gray-200">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className={`p-6 ${i % 3 !== 0 ? "border-l border-gray-200" : ""} ${
                    i >= 3 ? "border-t border-gray-200" : ""
                  }`}
                >
                  <Icon size={18} style={{ color: PURPLE }} className="mb-3" />
                  <h3 className="text-sm font-semibold mb-1.5">{feature.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{feature.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Security / trust */}
        <section className="border-t border-gray-200 py-16">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex items-start gap-3 border border-gray-200 p-5">
              <Lock size={18} style={{ color: PURPLE }} className="mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold mb-1">Nothing runs unattended</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Every proposed action stays pending until someone on your team explicitly
                  approves it. No silent automation.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 border border-gray-200 p-5">
              <History size={18} style={{ color: PURPLE }} className="mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold mb-1">A record of every decision</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Approvals, declines, and executions are timestamped and traceable back to the
                  document or conversation that triggered them.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Trust strip */}
        <section className="border-t border-gray-200 py-10 flex flex-wrap gap-x-10 gap-y-4 items-center justify-between">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <ShieldCheck size={16} style={{ color: PURPLE }} />
            Every action is logged, timestamped, and traceable back to its source
          </div>
          <div className="flex gap-8 text-sm text-gray-500 font-mono">
            <span>01 — capture</span>
            <span>02 — structure</span>
            <span>03 — approve</span>
          </div>
        </section>

        {/* CTA band */}
        <section className="border-t border-gray-200 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-3">
            Start building a paper trail your team can trust.
          </h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            Free to get started. No credit card required.
          </p>
          {loading ? null : user ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-3 text-white text-sm font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: PURPLE }}
            >
              Go to dashboard
              <ArrowUpRight size={16} />
            </Link>
          ) : (
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-5 py-3 text-white text-sm font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: PURPLE }}
            >
              Create your workspace
              <ArrowUpRight size={16} />
            </Link>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
            <div className="lg:col-span-2">
              <span className="font-sans text-lg font-semibold tracking-tight">
                AgentDesk
              </span>
              <p className="text-sm text-gray-500 mt-3 max-w-xs leading-relaxed">
                Structured actions from messy notes and conversations — every one logged,
                every one approved by a human.
              </p>
            </div>

            <div>
              <div className="font-mono text-[11px] uppercase tracking-wide text-gray-400 mb-3">
                Product
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="/chat" className="hover:text-black">Chat</Link></li>
                <li><Link href="/documents" className="hover:text-black">Documents</Link></li>
                <li><Link href="/tasks" className="hover:text-black">Tasks</Link></li>
                <li><Link href="/meetings" className="hover:text-black">Meetings</Link></li>
                <li><Link href="/structured-notes" className="hover:text-black">Structured Notes</Link></li>
              </ul>
            </div>

            <div>
              <div className="font-mono text-[11px] uppercase tracking-wide text-gray-400 mb-3">
                Company
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="/about" className="hover:text-black">About</Link></li>
                <li><Link href="/security" className="hover:text-black">Security</Link></li>
                <li><Link href="/contact" className="hover:text-black">Contact</Link></li>
              </ul>
            </div>

            <div>
              <div className="font-mono text-[11px] uppercase tracking-wide text-gray-400 mb-3">
                Legal
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="/privacy" className="hover:text-black">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-black">Terms of Use</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} AgentDesk. Built for teams that need a
              record of every decision.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Zap size={12} style={{ color: PURPLE }} />
              All systems operational
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}