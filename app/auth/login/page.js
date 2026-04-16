"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/hooks/useAuth";
import { useWalletConnection } from "../../../lib/hooks/useWallet";

const errorMessages = {
  CredentialsSignin: {
    signin: "Invalid email or password.",
    signup: "Could not create account. Try a different email or password.",
  },
  OAuthSignin: "Google sign-in failed. Please try again.",
  OAuthCallback: "Sign-in callback failed. Please try again.",
  SessionRequired: "Please sign in to continue.",
};

export default function LoginPage() {
  const router = useRouter();
  const [callbackUrl, setCallbackUrl] = useState("/");
  const [providers, setProviders] = useState(null);
  const [providerError, setProviderError] = useState(null);

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
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isAuthActionLoading, setIsAuthActionLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authInfo, setAuthInfo] = useState(null);
  const passwordInputRef = useRef(null);

  const googleEnabled = Boolean(providers?.google);

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const res = await fetch("/api/auth/providers");
        if (!res.ok) throw new Error("Failed to load auth providers");
        const data = await res.json();
        setProviders(data || {});
      } catch (err) {
        setProviders({});
        setProviderError("Google login is not available right now.");
      }
    };

    loadProviders();
  }, []);

  const getErrorMessage = (error) => {
    if (!error) return "Unable to sign in. Please try again.";
    if (error === "CredentialsSignin") {
      return isSignUp ? errorMessages.CredentialsSignin.signup : errorMessages.CredentialsSignin.signin;
    }
    if (typeof error === "string" && Object.prototype.hasOwnProperty.call(errorMessages, error)) {
      return errorMessages[error];
    }
    if (typeof error === "string" && error.includes("linked to a non-password login")) {
      return error;
    }
    return error;
  };

  const submitEmailPassword = async () => {
    setAuthError(null);
    setAuthInfo(null);
    setIsAuthActionLoading(true);

    try {
      const trimmedEmail = String(email || "").trim();
      const trimmedPassword = String(password || "").trim();
      const trimmedName = String(name || "").trim();

      if (!trimmedEmail) {
        setAuthError("Please enter your email.");
        return;
      }

      if (!trimmedPassword) {
        setAuthError("Please enter your password.");
        return;
      }

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
            setAuthError("An account already exists for this email. Switch to sign in.");
          }
          return;
        }
      }

      const result = await login("credentials", {
        email: trimmedEmail,
        password: trimmedPassword,
        name: isSignUp ? trimmedName : undefined,
      });

      if (result?.error) {
        setAuthError(getErrorMessage(result.error));
        return;
      }

      if (result?.ok) {
        router.replace(callbackUrl);
      }
    } catch (err) {
      setAuthError(err?.message || "Failed to sign in.");
    } finally {
      setIsAuthActionLoading(false);
    }
  };

  const onGoogle = async () => {
    setAuthError(null);
    setAuthInfo(null);
    if (!googleEnabled) {
      setAuthError("Google sign-in is not configured. Please check your app settings.");
      return;
    }
    setIsAuthActionLoading(true);
    try {
      await login("google", { callbackUrl });
    } catch (err) {
      setAuthError(err?.message || "Unable to sign in with Google.");
    } finally {
      setIsAuthActionLoading(false);
    }
  };

  const onConnect = async () => {
    setAuthError(null);
    setAuthInfo(null);
    setIsAuthActionLoading(true);
    try {
      await connectWallet("metamask");
      router.replace(callbackUrl);
    } catch (e) {
      setAuthError(e?.message || "Failed to connect wallet.");
    } finally {
      setIsAuthActionLoading(false);
    }
  };

  return (
    <div className="login-page container">
      <div className="login-modal">
        <div className="login-modal-title">Welcome back</div>

        <div className="login-modal-logo" aria-hidden>
          <span className="login-modal-logo-text">C</span>
        </div>

        <div className="login-auth-card" style={{ padding: 18, gap: 10 }}>
          <div className="login-auth-card-title">Fast entry to Cosmos</div>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
            {googleEnabled
              ? "Use Google, email/password, or your wallet to access your assets and marketplace tools."
              : "Use email/password or your wallet to access your assets and marketplace tools."}
          </p>
        </div>

        {authError ? (
          <div className="login-auth-card login-auth-alert" role="alert" aria-live="assertive">
            {authError}
          </div>
        ) : null}

        {!authError && providerError ? (
          <div className="login-auth-card login-auth-note" role="status" aria-live="polite">
            {providerError}
          </div>
        ) : null}

        {authInfo ? (
          <div className="login-auth-card login-auth-note">
            {authInfo}
          </div>
        ) : null}

        {googleEnabled ? (
          <div className="login-auth-card login-options">
            <button
              className="login-option"
              type="button"
              onClick={onGoogle}
              disabled={isAuthActionLoading}
            >
              <div className="login-option-icon">G</div>
              <div>
                <div style={{ fontWeight: 700 }}>Continue with Google</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
                  Quick login with your Google account.
                </div>
              </div>
            </button>
          </div>
        ) : null}

        <div className="login-auth-or">
          <div className="login-auth-or-line" />
          <div className="login-auth-or-text">OR</div>
          <div className="login-auth-or-line" />
        </div>

        <div className="login-auth-card">
          <div className="login-auth-top">
            <div className="login-auth-card-title">{isSignUp ? "Create account" : "Sign in"}</div>
            <button
              className="login-auth-back"
              type="button"
              onClick={() => {
                setIsSignUp((current) => !current);
                setAuthError(null);
                setAuthInfo(null);
              }}
              disabled={isAuthActionLoading}
            >
              {isSignUp ? "Use existing account" : "New here?"}
            </button>
          </div>

          <form
            className="login-auth-form"
            onSubmit={async (e) => {
              e.preventDefault();
              await submitEmailPassword();
            }}
          >
            {isSignUp ? (
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
              autoComplete="email"
            />

            <input
              ref={passwordInputRef}
              className="login-auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
            />

            <button className="btn primary" type="submit" disabled={isAuthActionLoading}>
              {isAuthActionLoading ? "Processing..." : isSignUp ? "Create account" : "Sign in"}
            </button>
          </form>

          <div className="login-auth-small-actions">
            <button className="btn" type="button" onClick={() => setAuthInfo("Password reset is not set up yet.")} disabled={isAuthActionLoading}>
              Forgot password?
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setIsSignUp((current) => !current);
                setAuthError(null);
                setAuthInfo(null);
              }}
              disabled={isAuthActionLoading}
            >
              {isSignUp ? "Sign in instead" : "Create account"}
            </button>
          </div>
        </div>

        <div className="login-auth-card login-options">
          <button className="login-option" type="button" onClick={onConnect} disabled={isAuthActionLoading || isConnecting}>
            <div className="login-option-icon">W</div>
            <div>
              <div style={{ fontWeight: 700 }}>{isConnecting ? "Connecting wallet..." : "Connect Wallet (MetaMask)"}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>Sign in using your wallet address.</div>
            </div>
          </button>
        </div>

        <div className="login-legal">
          <span>By logging in, you agree to our </span>
          <a href="#" onClick={(e) => e.preventDefault()}>
            Terms
          </a>
          <span> & </span>
          <a href="#" onClick={(e) => e.preventDefault()}>
            Privacy Policy
          </a>
        </div>

        <div className="login-powered">
          <span>Protected by</span>
          <span className="login-powered-pill">privy</span>
        </div>
      </div>
    </div>
  );
}
