"use client";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";

export default function MobileDrawer() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onClose = () => setOpen(false);
    window.addEventListener("open-drawer", onOpen);
    window.addEventListener("close-drawer", onClose);
    return () => {
      window.removeEventListener("open-drawer", onOpen);
      window.removeEventListener("close-drawer", onClose);
    };
  }, []);
  if (!open) return null;
  return (
    <div className="drawer-backdrop" onClick={() => setOpen(false)}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="logo-btn"><span className="logo" /></span>
            <span style={{ fontWeight: 700 }}>Cosmos</span>
          </div>
          <button className="icon-btn" aria-label="Close" onClick={() => setOpen(false)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <Sidebar expanded onToggle={() => setOpen(false)} onNavigate={() => setOpen(false)} />
      </div>
    </div>
  );
}
