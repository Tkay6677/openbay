"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useWalletConnection } from "../lib/hooks/useWallet";
import { useAuth } from "../lib/hooks/useAuth";
import { truncateAddress } from "../lib/utils";
import MobileDrawer from "./MobileDrawer";

export default function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { address, isConnected, connectWallet, disconnectWallet, isConnecting } = useWalletConnection();
  const { user, isAuthenticated, logout, login, isLoading: authLoading } = useAuth();
  const [walletError, setWalletError] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isAuthActionLoading, setIsAuthActionLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authInfo, setAuthInfo] = useState(null);
  const menuRef = useRef(null);
  const passwordInputRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search || "");
    const shouldOpen = ["1", "true", "yes"].includes(String(params.get("login") || "").toLowerCase()) || ["1", "true", "yes"].includes(String(params.get("auth") || "").toLowerCase());
    if (!shouldOpen) return;

    setEmail("");
    setPassword("");
    setShowPasswordField(false);
    setName("");
    setIsSignUp(false);
    setAuthError(null);
    setAuthInfo(null);
    setShowLoginModal(true);

    params.delete("login");
    params.delete("auth");
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash || ""}`;
    router.replace(nextUrl);
  }, [router]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUserMenu]);

  useEffect(() => {
    if (!showLoginModal) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setShowLoginModal(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [showLoginModal]);

  useEffect(() => {
    if (showLoginModal && !authLoading && isAuthenticated) {
      setShowLoginModal(false);
    }
  }, [authLoading, isAuthenticated, showLoginModal]);

  const onConnect = async () => {
    setWalletError(null);
    try {
      await connectWallet("metamask");
    } catch (e) {
      setWalletError(e?.message || "Failed to connect wallet");
    }
  };

  const onDisconnect = async () => {
    setWalletError(null);
    try {
      await disconnectWallet();
    } catch (e) {
      setWalletError(e?.message || "Failed to disconnect wallet");
    }
  };

  const getCallbackUrl = () => {
    if (typeof window === "undefined") return pathname || "/";

    const url = new URL(window.location.href);
    const callbackParam = url.searchParams.get("callbackUrl");
    if (callbackParam) {
      try {
        if (callbackParam.startsWith("/")) return callbackParam;
        const cb = new URL(callbackParam, window.location.origin);
        if (cb.origin === window.location.origin) return `${cb.pathname}${cb.search}${cb.hash}`;
      } catch {}
    }

    url.searchParams.delete("login");
    url.searchParams.delete("auth");
    url.searchParams.delete("callbackUrl");
    const search = url.searchParams.toString();
    return `${url.pathname}${search ? `?${search}` : ""}${url.hash || ""}` || "/";
  };

  const submitEmailPassword = async () => {
    setAuthError(null);
    setAuthInfo(null);
    setIsAuthActionLoading(true);

    try {
      const callbackUrl = getCallbackUrl();
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
        return;
      }

      if (result?.ok) {
        setShowLoginModal(false);
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
      const callbackUrl = getCallbackUrl();
      await login("google", { callbackUrl });
    } catch (err) {
      setAuthError(err?.message || "Unable to sign in with Google");
    } finally {
      setIsAuthActionLoading(false);
    }
  };

  return (
    <>
      <nav className="nav">
        <div className="nav-topbar">
          <div className="container nav-topbar-inner">
            <span>Can’t find what you’re looking for? Checkout our documentations.</span>
            <a href="https://docs.cosmos.com/" target="_blank" rel="noreferrer">
              Go to https://docs.cosmos.com/
            </a>
          </div>
        </div>
        <div className="nav-main">
          <div className="container nav-main-inner">
            <div className="nav-left">
              <button
                className="icon-btn mobile-only"
                aria-label="Menu"
                onClick={() => typeof window !== "undefined" && window.dispatchEvent(new Event("open-drawer"))}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              <Link href="/" aria-label="Cosmos home" className="nav-logo">
                <span className="logo" />
                <span className="nav-logo-text desktop-only">Cosmos</span>
              </Link>
              <div className="nav-links desktop-only" aria-label="Primary navigation">
                <Link href="/explore" className="nav-link">
                  Explore
                </Link>
                <Link href="/mint" className="nav-link">
                  Mint
                </Link>
                <Link href="/mint" className="nav-link">
                  Create
                </Link>
                <Link href="/wallet" className="nav-link">
                  Swap
                </Link>
              </div>
            </div>

          <div className="nav-center desktop-only" role="search">
            <div className="nav-search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              </svg>
              <input placeholder="Search collections" aria-label="Search collections" />
              <span className="nav-kbd">/</span>
            </div>
          </div>

          <div className="nav-right">
          
            <div className="nav-actions desktop-only">
              <Link href="/activity" className="nav-action-link">
                Earn Points
              </Link>
              <Link href="/wallet" className="nav-action-link">
                Get $CMS
              </Link>
            </div>

            {walletError ? <div className="nav-error desktop-only">{walletError}</div> : null}

            {isAuthenticated ? (
              <div ref={menuRef} style={{ position: "relative" }}>
                <button className="btn" onClick={() => setShowUserMenu(!showUserMenu)} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="desktop-only">{user?.name || user?.email?.split("@")[0] || "User"}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                    <path d="M4 20c2.5-4 13.5-4 16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
                {showUserMenu && (
                  <div
                    className="card"
                    style={{ position: "absolute", top: "100%", right: 0, marginTop: 8, width: "min(260px, 92vw)", padding: 8, zIndex: 1000 }}
                  >
                    <div style={{ padding: "8px 12px", fontSize: 14, color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>{user?.email}</div>
                    <Link href="/profile" onClick={() => setShowUserMenu(false)} style={{ display: "block", padding: "8px 12px", textDecoration: "none", color: "inherit" }}>
                      Profile
                    </Link>
                    <Link href="/wallet" onClick={() => setShowUserMenu(false)} style={{ display: "block", padding: "8px 12px", textDecoration: "none", color: "inherit" }}>
                      Wallet
                    </Link>
                    <button
                      className="btn"
                      onClick={async () => {
                        await logout();
                        setShowUserMenu(false);
                      }}
                      style={{ width: "100%", marginTop: 8, textAlign: "left", justifyContent: "flex-start" }}
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="btn nav-signin"
                onClick={() => {
                  setEmail("");
                  setPassword("");
                  setShowPasswordField(false);
                  setName("");
                  setIsSignUp(false);
                  setAuthError(null);
                  setAuthInfo(null);
                  setShowLoginModal(true);
                }}
              >
                Login
              </button>
            )}

            {isConnected ? (
              <button className="btn" onClick={onDisconnect} disabled={isConnecting}>
                {truncateAddress(address)}
              </button>
            ) : (
              <button className="btn" onClick={onConnect} disabled={isConnecting}>
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
            )}
          </div>
        </div>
      </div>

        {showLoginModal && !isAuthenticated ? (
          <div
            className="login-modal-backdrop"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setShowLoginModal(false);
            }}
          >
            <div className="login-modal" role="dialog" aria-modal="true" aria-label="Log in or sign up">
              <button type="button" className="login-modal-close" aria-label="Close" onClick={() => setShowLoginModal(false)}>
                <span aria-hidden>×</span>
              </button>

            <div className="login-modal-title">Log in or sign up</div>

            <div className="login-modal-logo" aria-hidden>
              <span className="login-modal-logo-text">C</span>
            </div>

            {authError ? (
              <div
                className="login-auth-card"
                style={{
                  borderColor: "rgba(239, 68, 68, 0.55)",
                  background: "rgba(239, 68, 68, 0.06)",
                  color: "rgba(239, 68, 68, 0.95)",
                  marginBottom: 14,
                }}
              >
                {authError}
              </div>
            ) : null}

            {authInfo ? (
              <div
                className="login-auth-card"
                style={{
                  borderColor: "rgba(45, 212, 191, 0.45)",
                  background: "rgba(45, 212, 191, 0.08)",
                  color: "rgba(45, 212, 191, 0.95)",
                  marginBottom: 14,
                }}
              >
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

            {/* <div className="login-options">
              <button
                type="button"
                className="login-option"
                onClick={() => setAuthInfo("This option is not set up yet.")}
                disabled={isAuthActionLoading}
              >
                <span className="login-option-icon" aria-hidden>
                  <span className="login-option-badge">V</span>
                </span>
                <span>VeeFriends Wallet</span>
              </button>

              <button
                type="button"
                className="login-option"
                onClick={async () => {
                  await onConnect();
                  setShowLoginModal(false);
                }}
                disabled={isConnecting}
              >
                <span className="login-option-icon" aria-hidden>
                  <span className="login-option-badge mm">M</span>
                </span>
                <span>MetaMask</span>
              </button>

              <button
                type="button"
                className="login-option"
                onClick={() => setAuthInfo("This option is not set up yet.")}
                disabled={isAuthActionLoading}
              >
                <span className="login-option-icon" aria-hidden>
                  <span className="login-option-badge okx">O</span>
                </span>
                <span>OKX Wallet</span>
              </button>

              <button
                type="button"
                className="login-option"
                onClick={() => setAuthInfo("This option is not set up yet.")}
                disabled={isAuthActionLoading}
              >
                <span className="login-option-icon" aria-hidden>
                  <span className="login-option-badge">+</span>
                </span>
                <span>More options</span>
              </button>
            </div> */}

            <button
              type="button"
              className="login-passkey"
              onClick={() => setAuthInfo("Passkey login is not set up yet.")}
              disabled={isAuthActionLoading}
            >
              I have a passkey
            </button>

            <div className="login-legal">
              <span>By logging in I agree to the </span>
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
        ) : null}
      </nav>
      <MobileDrawer />
    </>
  );
}
