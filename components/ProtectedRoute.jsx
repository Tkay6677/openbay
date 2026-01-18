"use client";
import { useAuth } from "../lib/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedRoute({ children, redirectTo = "/?login=1" }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const callbackUrl = `${window.location.pathname}${window.location.search || ""}`;
      const separator = redirectTo.includes("?") ? "&" : "?";
      router.push(`${redirectTo}${separator}callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
  }, [isAuthenticated, isLoading, router, redirectTo]);

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center", color: "var(--muted)" }}>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div className="card" style={{ padding: 40, textAlign: "center", maxWidth: 500 }}>
          <h2 style={{ marginBottom: 16 }}>Authentication Required</h2>
          <p style={{ color: "var(--muted)", marginBottom: 24 }}>
            Please sign in to access this page.
          </p>
          <button
            className="btn primary"
            type="button"
            onClick={() => {
              const callbackUrl = `${window.location.pathname}${window.location.search || ""}`;
              const separator = redirectTo.includes("?") ? "&" : "?";
              router.push(`${redirectTo}${separator}callbackUrl=${encodeURIComponent(callbackUrl)}`);
            }}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
