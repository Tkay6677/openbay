"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar({ expanded, onToggle, onNavigate }) {
  const pathname = usePathname();

  const NavItem = ({ icon, label, href }) => {
    const active = href === "/" ? pathname === "/" : pathname?.startsWith?.(href);
    return (
      <Link
        href={href}
        className={`nav-item${active ? " active" : ""}`}
        onClick={() => {
          if (typeof onNavigate === "function") onNavigate();
        }}
      >
        {icon}
        {expanded && <span className="label">{label}</span>}
      </Link>
    );
  };
  const icons = {
    discover: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3l3 7 7 2-7 2-3 7-3-7-7-2 7-2 3-7z" stroke="currentColor" strokeWidth="2"/></svg>
    ),
    explore: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z" stroke="currentColor" strokeWidth="2"/><path d="M14.5 9.5 10 10l-1.5 4.5L13 14l1.5-4.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
    ),
    collections: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="7" height="7" stroke="currentColor" strokeWidth="2"/><rect x="14" y="4" width="7" height="7" stroke="currentColor" strokeWidth="2"/><rect x="3" y="15" width="7" height="7" stroke="currentColor" strokeWidth="2"/><rect x="14" y="15" width="7" height="7" stroke="currentColor" strokeWidth="2"/></svg>
    ),
    listings: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M8 6h13M8 12h13M8 18h13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
    ),
    auctions: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M7 7h10M9 7V5h6v2M10 11h4M9 21h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M8 7v6a4 4 0 0 0 8 0V7" stroke="currentColor" strokeWidth="2"/></svg>
    ),
    mint: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
    ),
    profile: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/><path d="M4 20c2.5-4 13.5-4 16 0" stroke="currentColor" strokeWidth="2"/></svg>
    ),
    wallet: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 7h18v12H3z" stroke="currentColor" strokeWidth="2"/><path d="M3 7l2-3h16" stroke="currentColor" strokeWidth="2"/><path d="M17 13h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
    ),
    admin: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2 20 6v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4Z" stroke="currentColor" strokeWidth="2"/><path d="M9 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
    ),
  };
  const primary = [
    { key: "discover", label: "Home", href: "/" },
    { key: "explore", label: "Explore", href: "/explore" },
    { key: "collections", label: "Collections", href: "/collections" },
    { key: "listings", label: "Listings", href: "/listings" },
    { key: "auctions", label: "Auctions", href: "/auctions" },
    { key: "mint", label: "Mint", href: "/mint" },
    { key: "wallet", label: "Wallet", href: "/wallet" },
    { key: "profile", label: "Profile", href: "/profile" },
    { key: "admin", label: "Admin", href: "/admin" },
  ];

  return (
    <aside className="sidebar">
      <div className="brand-row">
        <button className="logo-btn" onClick={onToggle} aria-label="Toggle sidebar" aria-expanded={expanded}>
          <span className="logo" />
        </button>
        {expanded && <span className="brand-text">Cosmos</span>}
      </div>
      <div className="group">
        {primary.map((item) => (
          <NavItem key={item.key} icon={icons[item.key]} label={item.label} href={item.href} />
        ))}
      </div>
    </aside>
  );
}
