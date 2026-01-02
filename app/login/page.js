"use client";

import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../lib/hooks/useAuth";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const nextAuthError = useMemo(() => searchParams?.get?.("error") || null, [searchParams]);
  const callbackUrl = useMemo(() => searchParams?.get?.("callbackUrl") || "/", [searchParams]);
  const prefillEmail = useMemo(() => searchParams?.get?.("email") || "", [searchParams]);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace(callbackUrl);
    }
  }, [authLoading, isAuthenticated, router, callbackUrl]);

  useEffect(() => {
    if (nextAuthError) setError(nextAuthError);
  }, [nextAuthError]);

  useEffect(() => {
    if (prefillEmail) setEmail(prefillEmail);
  }, [prefillEmail]);

  const { login } = useAuth();

  // Email/Password login
  const onEmailPasswordSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setIsLoading(true);
    
    try {
      if (isSignUp) {
        const checkRes = await fetch("/api/auth/email-exists", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const checkData = await checkRes.json().catch(() => ({}));
        if (checkRes.ok && checkData?.exists) {
          if (checkData.provider && checkData.provider !== "email") {
            setError(`An account already exists for this email via ${checkData.provider}. Use that sign-in method.`);
          } else {
            setError("An account already exists for this email. Switch to Sign in.");
          }
          return;
        }
      }

      const result = await login("credentials", {
        email,
        password,
        name: isSignUp ? name : undefined,
      });

      if (result?.error) {
        if (result.error === "CredentialsSignin") {
          setError(isSignUp ? "Could not create account. Try a different email." : "Invalid email or password.");
        } else if (typeof result.error === "string" && result.error.includes("linked to a non-password login")) {
          setError(result.error);
        } else {
          setError(result.error);
        }
        return;
      }

      if (result?.ok) {
        router.replace(callbackUrl);
      }
    } catch (err) {
      setError(err.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth
  const onGoogle = async () => {
    setError(null);
    setInfo(null);
    setIsLoading(true);
    try {
      await login("google", {
        callbackUrl,
      });
    } catch (err) {
      setError(err.message || "Unable to sign in with Google");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <>
        <NavBar />
        <main
          style={{
            minHeight: "calc(100vh - 140px)",
            display: "grid",
            placeItems: "center",
            padding: "56px 16px",
          }}
        >
          <div style={{ textAlign: "center", color: "var(--muted)" }}>Loading...</div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <NavBar />
      <main
        style={{
          minHeight: "calc(100vh - 140px)",
          display: "grid",
          placeItems: "center",
          padding: "56px 16px",
          background:
            "radial-gradient(1200px 600px at 20% 10%, rgba(45,212,191,0.18), transparent 60%), radial-gradient(800px 500px at 80% 30%, rgba(147,51,234,0.14), transparent 55%)",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="card"
          style={{
            width: "100%",
            maxWidth: 520,
            padding: 22,
            backdropFilter: "blur(10px)",
            background: "rgba(10, 12, 18, 0.55)",
          }}
        >
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05, duration: 0.25 }}>
            <h1 style={{ margin: 0, marginBottom: 8, letterSpacing: -0.4 }}>
              {isSignUp ? "Create account" : "Welcome to Cosmos"}
            </h1>
            <p style={{ margin: 0, marginBottom: 18, color: "var(--muted)" }}>
              Sign in with email or Google. You’ll connect your wallet when you use wallet features.
            </p>
          </motion.div>

          {error ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
              style={{
                padding: 12,
                borderColor: "var(--red)",
                background: "rgba(239, 68, 68, 0.06)",
                color: "var(--red)",
                marginBottom: 14,
              }}
            >
              {error}
            </motion.div>
          ) : null}

          {info ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
              style={{
                padding: 12,
                borderColor: "rgba(45, 212, 191, 0.4)",
                background: "rgba(45, 212, 191, 0.08)",
                color: "rgba(45, 212, 191, 0.95)",
                marginBottom: 14,
              }}
            >
              {info}
            </motion.div>
          ) : null}

          <div style={{ display: "grid", gap: 12 }}>
            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Continue with Google</div>
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.99 }}
                className="btn primary"
                onClick={onGoogle}
                disabled={isLoading}
                style={{ width: "100%" }}
              >
                Continue with Google
              </motion.button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0" }}>
              <div style={{ height: 1, background: "var(--border)", flex: 1 }} />
              <div style={{ fontSize: 12, color: "var(--muted)" }}>OR</div>
              <div style={{ height: 1, background: "var(--border)", flex: 1 }} />
            </div>

            <div className="card" style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontWeight: 700 }}>{isSignUp ? "Create account" : "Email & Password"}</div>
                <button
                  className="btn"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                    setInfo(null);
                  }}
                  style={{ fontSize: 12, padding: "4px 8px" }}
                  type="button"
                >
                  {isSignUp ? "Sign in" : "Sign up"}
                </button>
              </div>
              <form onSubmit={onEmailPasswordSubmit} style={{ display: "grid", gap: 10 }}>
                {isSignUp && (
                  <input
                    className="btn"
                    style={{ width: "100%", cursor: "text" }}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name (optional)"
                    autoComplete="name"
                  />
                )}
                <input
                  className="btn"
                  style={{ width: "100%", cursor: "text" }}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                  autoComplete="email"
                />
                <input
                  className="btn"
                  style={{ width: "100%", cursor: "text" }}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                />
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.99 }}
                  className="btn primary"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
                </motion.button>
              </form>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 12 }}>
                <button
                  className="btn"
                  type="button"
                  onClick={() => setInfo("Password reset is not set up yet.")}
                  disabled={isLoading}
                  style={{ padding: "4px 8px" }}
                >
                  Forgot password?
                </button>
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    setIsSignUp(true);
                    setError(null);
                    setInfo(null);
                  }}
                  disabled={isLoading}
                  style={{ padding: "4px 8px" }}
                >
                  Sign Up
                </button>
              </div>
            </div>

            <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", marginTop: 4 }}>
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </div>
          </div>
        </motion.div>
      </main>
      <Footer />
    </>
  );
}
