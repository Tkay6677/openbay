"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useWalletConnection } from "../lib/hooks/useWallet";
import { useAuth } from "../lib/hooks/useAuth";
import { truncateAddress } from "../lib/utils";

export default function NavBar() {
  const { address, isConnected, connectWallet, disconnectWallet, isConnecting } = useWalletConnection();
  const { user, isAuthenticated, logout } = useAuth();
  const [walletError, setWalletError] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);

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

  return (
    <nav className="nav">
      <div className="container nav-inner">
        <div className="brand">
          <button className="icon-btn mobile-only" aria-label="Menu" onClick={() => typeof window !== "undefined" && window.dispatchEvent(new Event("open-drawer"))}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <Link href="/" aria-label="Cosmos home" className="logo-btn">
            <span className="logo" />
          </Link>
          <span className="brand-text desktop-only" style={{ marginLeft: 10, fontWeight: 700 }}>Cosmos</span>
        </div>
        <div className="search desktop-only" role="search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          </svg>
          <input placeholder="Search Cosmos" aria-label="Search" />
          <span className="kbd">/</span>
        </div>
        <div className="search mobile-only" role="search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          </svg>
          <input placeholder="Search" aria-label="Search" />
        </div>
        <div className="right" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {walletError ? (
            <div className="desktop-only" style={{ color: "var(--red)", fontSize: 12, marginRight: 10 }}>
              {walletError}
            </div>
          ) : null}

          {isAuthenticated ? (
            <div ref={menuRef} style={{ position: "relative" }}>
              <button
                className="btn"
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <span className="desktop-only">{user?.name || user?.email?.split("@")[0] || "User"}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                  <path d="M4 20c2.5-4 13.5-4 16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              {showUserMenu && (
                <div
                  className="card"
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: 8,
                    minWidth: 200,
                    padding: 8,
                    zIndex: 1000,
                  }}
                >
                  <div style={{ padding: "8px 12px", fontSize: 14, color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                    {user?.email}
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setShowUserMenu(false)}
                    style={{ display: "block", padding: "8px 12px", textDecoration: "none", color: "inherit" }}
                  >
                    Profile
                  </Link>
                  <Link
                    href="/wallet"
                    onClick={() => setShowUserMenu(false)}
                    style={{ display: "block", padding: "8px 12px", textDecoration: "none", color: "inherit" }}
                  >
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
            <Link href="/login" className="btn primary">
              Sign In
            </Link>
          )}

          {isConnected ? (
            <button className="btn" onClick={onDisconnect} disabled={isConnecting} style={{ fontSize: 12 }}>
              {truncateAddress(address)}
            </button>
          ) : (
            <button className="btn" onClick={onConnect} disabled={isConnecting} style={{ fontSize: 12 }}>
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}

          <Link href="/wallet" className="icon-btn desktop-only" aria-label="Wallet" style={{ marginRight: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="6" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M2 10h20M8 14h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </Link>
          <Link href="/profile" className="icon-btn desktop-only" aria-label="Profile">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
              <path d="M4 20c2.5-4 13.5-4 16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </Link>
        </div>
      </div>
    </nav>
  );
}
