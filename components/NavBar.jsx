"use client";
import Link from "next/link";

export default function NavBar() {
  return (
    <nav className="nav">
      <div className="container nav-inner">
        <div className="brand">
          <button className="icon-btn mobile-only" aria-label="Menu" onClick={() => typeof window !== "undefined" && window.dispatchEvent(new Event("open-drawer"))}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <Link href="/" aria-label="OpenBay home" className="logo-btn">
            <span className="logo" />
          </Link>
          <span className="brand-text desktop-only" style={{ marginLeft: 10, fontWeight: 700 }}>OpenBay</span>
        </div>
        <div className="search desktop-only" role="search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          </svg>
          <input placeholder="Search OpenBay" aria-label="Search" />
          <span className="kbd">/</span>
        </div>
        <div className="search mobile-only" role="search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          </svg>
          <input placeholder="Search" aria-label="Search" />
        </div>
        <div className="right">
          <button className="btn primary desktop-only">Connect Wallet</button>
          <button className="btn primary mobile-only">Wallet</button>
          <button className="icon-btn desktop-only" aria-label="Profile">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
              <path d="M4 20c2.5-4 13.5-4 16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}