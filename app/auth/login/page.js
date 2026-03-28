"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/hooks/useAuth";
import { useWalletConnection } from "../../../lib/hooks/useWallet";

export default function LoginPage() {
  const router = useRouter();
  const [callbackUrl, setCallbackUrl] = useState("/");

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setCallbackUrl(params.get("callbackUrl") || "/");
    } catch (e) {
      setCallbackUrl("/");
    }
  }, []);
  const { login } = useAuth();
  const { connectWallet, isConnecting } = useWalletConnection();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isAuthActionLoading, setIsAuthActionLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authInfo, setAuthInfo] = useState(null);
  const passwordInputRef = useRef(null);

  const submitEmailPassword = async () => {
    setAuthError(null);
    setAuthInfo(null);
    setIsAuthActionLoading(true);

    try {
      const trimmedEmail = String(email || "").trim();

      if (isSignUp) {
        const checkRes = await fetch("/api/auth/email-exists", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: trimmedEmail }),
        });
        const checkData = await checkRes.json().catch(() => ({}));
        if (checkRes.ok && checkData?.exists) {
          if (checkData.provider && checkData.provider !== "email") {
            setAuthError(`An account already exists for this email via ${checkData.provider}. Use that sign-in method.`);
          } else {
            setAuthError("An account already exists for this email. Switch to Sign in.");
          }
          setIsAuthActionLoading(false);
          return;
        }
      }

      const result = await login("credentials", {
        email: trimmedEmail,
        password,
        name: isSignUp ? name : undefined,
      });

      if (result?.error) {
        if (result.error === "CredentialsSignin") {
          setAuthError(isSignUp ? "Could not create account. Try a different email." : "Invalid email or password.");
        } else if (typeof result.error === "string" && result.error.includes("linked to a non-password login")) {
          setAuthError(result.error);
        } else {
          setAuthError(result.error);
        }
        setIsAuthActionLoading(false);
        return;
      }

      if (result?.ok) {
        router.replace(callbackUrl);
      }
    } catch (err) {
      setAuthError(err?.message || "Failed to sign in");
    } finally {
      setIsAuthActionLoading(false);
    }
  };

  const onGoogle = async () => {
    setAuthError(null);
    setAuthInfo(null);
    setIsAuthActionLoading(true);
    try {
      await login("google", { callbackUrl });
    } catch (err) {
      setAuthError(err?.message || "Unable to sign in with Google");
    } finally {
      setIsAuthActionLoading(false);
    }
  };

  const onConnect = async () => {
    try {
      await connectWallet("metamask");
      router.replace(callbackUrl);
    } catch (e) {
      setAuthError(e?.message || "Failed to connect wallet");
    }
  };

  return (
    <div className="login-page container" style={{ padding: "24px 16px" }}>
      <div className="login-modal" style={{ maxWidth: 520, margin: "32px auto" }}>
        <div className="login-modal-title">Log in or sign up</div>

        <div className="login-modal-logo" aria-hidden>
          <span className="login-modal-logo-text">C</span>
        </div>

        {authError ? (
          <div className="login-auth-card" style={{ borderColor: "rgba(239,68,68,0.55)", background: "rgba(239,68,68,0.06)", color: "rgba(239,68,68,0.95)", marginBottom: 14 }}>
            {authError}
          </div>
        ) : null}

        {authInfo ? (
          <div className="login-auth-card" style={{ borderColor: "rgba(45,212,191,0.45)", background: "rgba(45,212,191,0.08)", color: "rgba(45,212,191,0.95)", marginBottom: 14 }}>
            {authInfo}
          </div>
        ) : null}

        <div className="login-auth-card">
          <div className="login-auth-card-title">Continue with Google</div>
          <button className="btn primary" type="button" onClick={onGoogle} disabled={isAuthActionLoading} style={{ width: "100%" }}>
            Continue with Google
          </button>
        </div>

        <div className="login-auth-or">
          <div className="login-auth-or-line" />
          <div className="login-auth-or-text">OR</div>
          <div className="login-auth-or-line" />
        </div>

        <div className="login-auth-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div className="login-auth-card-title" style={{ marginBottom: 0 }}>
              Email & Password
            </div>
            <button
              className="btn"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setAuthError(null);
                setAuthInfo(null);
                setShowPasswordField(true);
                setTimeout(() => passwordInputRef.current?.focus?.(), 0);
              }}
              type="button"
              disabled={isAuthActionLoading}
              style={{ padding: "4px 8px", fontSize: 12 }}
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </div>

          <form
            className="login-auth-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const trimmedEmail = String(email || "").trim();
              if (!trimmedEmail) return;

              if (!showPasswordField) {
                setAuthError(null);
                setAuthInfo(null);
                setShowPasswordField(true);
                setTimeout(() => passwordInputRef.current?.focus?.(), 0);
                return;
              }

              if (!String(password || "").trim()) return;
              await submitEmailPassword();
            }}
          >
            {isSignUp && showPasswordField ? (
              <input
                className="login-auth-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name (optional)"
                autoComplete="name"
              />
            ) : null}

            <input
              className="login-auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              autoComplete="email"
            />

            {showPasswordField ? (
              <input
                ref={passwordInputRef}
                className="login-auth-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                autoComplete={isSignUp ? "new-password" : "current-password"}
              />
            ) : null}

            <button className="btn primary" type="submit" disabled={isAuthActionLoading} style={{ width: "100%" }}>
              {isAuthActionLoading ? "Processing..." : showPasswordField ? (isSignUp ? "Sign Up" : "Sign In") : "Submit"}
            </button>
          </form>

          {showPasswordField ? (
            <div className="login-auth-small-actions">
              <button className="btn" type="button" onClick={() => setAuthInfo("Password reset is not set up yet.")} disabled={isAuthActionLoading}>
                Forgot password?
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setAuthError(null);
                  setAuthInfo(null);
                }}
                disabled={isAuthActionLoading}
              >
                Sign Up
              </button>
            </div>
          ) : null}
        </div>

        <div style={{ marginTop: 12 }}>
          <button className="btn" onClick={onConnect} disabled={isConnecting}>
            {isConnecting ? "Connecting..." : "Connect Wallet (MetaMask)"}
          </button>
        </div>

        <div className="login-legal" style={{ marginTop: 12 }}>
          <span>By logging in I agree to the </span>
          <a href="#" onClick={(e) => e.preventDefault()}>
            Terms
          </a>
          <span> & </span>
          <a href="#" onClick={(e) => e.preventDefault()}>
            Privacy Policy
          </a>
        </div>

        <div className="login-powered" style={{ marginTop: 12 }}>
          <span>Protected by</span>
          <span className="login-powered-pill">privy</span>
        </div>
      </div>
    </div>
  );
}
