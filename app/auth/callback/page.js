"use client";

import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackPageInner />
    </Suspense>
  );
}

function AuthCallbackPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [error, setError] = useState(null);

  const callbackUrl = searchParams?.get("callbackUrl") || "/";

  useEffect(() => {
    if (status === "authenticated" && session) {
      // User is authenticated, redirect to callback URL or home
      router.replace(callbackUrl);
    } else if (status === "unauthenticated") {
      // Check for error in URL
      const errorParam = searchParams?.get("error");
      if (errorParam) {
        setError(errorParam);
      } else {
        // No error but not authenticated, redirect to login
        setTimeout(() => {
          router.replace(`/?login=1&callbackUrl=${encodeURIComponent(callbackUrl)}`);
        }, 2000);
      }
    }
  }, [status, session, router, callbackUrl, searchParams]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background:
          "radial-gradient(1200px 600px at 20% 10%, rgba(45,212,191,0.18), transparent 60%), radial-gradient(800px 500px at 80% 30%, rgba(147,51,234,0.14), transparent 55%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="card"
        style={{ width: "100%", maxWidth: 520, padding: 22, background: "rgba(10, 12, 18, 0.55)" }}
      >
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>
          {status === "loading" ? "Finishing sign-in..." : status === "authenticated" ? "Sign-in successful!" : "Sign-in failed"}
        </div>
        <div style={{ color: "var(--muted)", marginBottom: 14 }}>
          {status === "loading"
            ? "You'll be redirected to the marketplace."
            : status === "authenticated"
              ? "Redirecting..."
              : error
                ? error
                : "Redirecting to sign-in..."}
        </div>

        {error ? (
          <div
            className="card"
            style={{
              padding: 12,
              borderColor: "var(--red)",
              background: "rgba(239, 68, 68, 0.06)",
              color: "var(--red)",
            }}
          >
            {error}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 1 }}
            transition={{ repeat: Infinity, repeatType: "reverse", duration: 0.7 }}
            style={{ height: 10, background: "rgba(45, 212, 191, 0.35)", borderRadius: 999 }}
          />
        )}
      </motion.div>
    </main>
  );
}
