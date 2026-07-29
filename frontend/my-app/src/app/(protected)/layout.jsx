// app/(protected)/layout.jsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useGlobalContext } from "@/components/GlobalContext";

export default function ProtectedLayout({ children }) {
  const { user, loading } = useGlobalContext();
  const router = useRouter();

  useEffect(() => {
    // Wait until GlobalContext has actually finished checking the token -
    // redirecting before that finishes would kick out valid logged-in
    // users just because `user` briefly starts out null on load.
    if (loading) return;

    if (!user) {
      router.replace("/login"); // adjust to your real login route
    }
  }, [user, loading, router]);

  // Still checking auth, or about to redirect - don't flash protected
  // content (or an empty page) in either case.
  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 size={20} className="animate-spin text-muted" />
      </div>
    );
  }

  return children;
}