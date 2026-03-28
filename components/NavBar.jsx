"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useWalletConnection } from "../lib/hooks/useWallet";
import { useAuth } from "../lib/hooks/useAuth";
import { truncateAddress } from "../lib/utils";
import MobileDrawer from "./MobileDrawer";

export default function NavBar({ variant } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const isLanding = variant === "landing";
  const { address, isConnected, connectWallet, disconnectWallet, isConnecting } = useWalletConnection();
  const { user, isAuthenticated, logout, login, isLoading: authLoading } = useAuth();
  const [walletError, setWalletError] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search || "");
    const shouldOpen = ["1", "true", "yes"].includes(String(params.get("login") || "").toLowerCase()) || ["1", "true", "yes"].includes(String(params.get("auth") || "").toLowerCase());
    if (!shouldOpen) return;

    const callbackUrl = getCallbackUrl();
    router.replace(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
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

  // modal UI moved to dedicated page: /auth/login

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

  

  return (
    <>
      <nav className={`nav${isLanding ? " nav-landing" : ""}`}>
        {!isLanding ? (
          <div className="nav-topbar">
            <div className="container nav-topbar-inner">
              <span>Can’t find what you’re looking for?</span>
              <a href="/contact" rel="noreferrer">Contact support</a>
            </div>
          </div>
        ) : null}
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
                {isLanding ? (
                  <>
                    <Link href="/market" className="nav-link">
                      Marketplace
                    </Link>
                    <Link href="/explore" className="nav-link">
                      Explore
                    </Link>
                    <Link href="/mint" className="nav-link">
                      Create
                    </Link>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </div>

            {!isLanding ? (
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
            ) : null}

            <div className="nav-right">
              {isLanding ? (
                <div className="nav-actions desktop-only">
                  <Link href="/market" className="btn nav-launch">
                    Launch App
                  </Link>
                </div>
              ) : null}

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
                    const cb = getCallbackUrl();
                    router.push(`/auth/login?callbackUrl=${encodeURIComponent(cb)}`);
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

        {/* Login UI moved to /auth/login page */}
      </nav>
      <MobileDrawer />
    </>
  );
}
