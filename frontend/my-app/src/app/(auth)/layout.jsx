// app/(auth)/layout.jsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGlobalContext } from "@/components/GlobalContext";

export default function AuthLayout({ children }) {
  const { user, loading } = useGlobalContext();
  const router = useRouter();

  useEffect(() => {
    // Wait for GlobalContext to finish checking the token before deciding
    // whether to redirect - same reasoning as ProtectedLayout.
    if (loading) return;

    if (user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  // Don't flash the login/landing page to someone who's already logged in
  // while the redirect is in flight.
  if (loading || user) {
    return null;
  }

  return children;
}