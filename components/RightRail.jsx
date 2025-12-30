"use client";
import { useEffect, useState } from "react";

export default function RightRail() {
  const [collections, setCollections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/collections");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        const list = Array.isArray(data.collections) ? data.collections : [];
        if (!cancelled) setCollections(list);
      } catch {
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <aside className="rail">
      <div className="section-rail">
        <div className="rail-header">Collection</div>
        <div>
          {isLoading ? (
            <div style={{ padding: 12, color: "var(--muted)" }}>Loading...</div>
          ) : collections.length === 0 ? (
            <div style={{ padding: 12, color: "var(--muted)" }}>No collections</div>
          ) : (
            collections.slice(0, 10).map((c, i) => (
              <div className="collection-row" key={`${c.name || "collection"}-${i}`}>
                {c.image ? <img src={c.image} alt={c.name} /> : <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--bg-elev)" }} />}
                <div>
                  <div className="name">{c.name}</div>
                  <div className="sub">Floor</div>
                </div>
                <div className="price">
                  <div>{Number(c.floor || 0).toFixed(2)} ETH</div>
                  <div className={`delta ${Number(c.delta || 0) >= 0 ? "up" : "down"}`}>
                    {Number(c.delta || 0) >= 0 ? "+" : ""}
                    {Number(c.delta || 0).toFixed(2)}%
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
