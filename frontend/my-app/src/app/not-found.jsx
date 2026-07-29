import Link from "next/link";
import { Compass, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-card bg-accent-soft text-accent">
        <Compass size={24} strokeWidth={2} />
      </div>

      <p className="mt-6 font-mono text-sm text-muted">404</p>
      <h1 className="mt-2 font-sans text-2xl font-semibold tracking-tight text-ink">
        This page doesn't exist
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        The page you're looking for was moved, renamed, or never existed.
        Check the link, or head back to your dashboard.
      </p>

      <div className="mt-8 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="rounded-pill bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Go to dashboard
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm font-medium text-ink/80 hover:text-ink"
        >
          <ArrowLeft size={14} />
          Back to home
        </Link>
      </div>
    </div>
  );
}