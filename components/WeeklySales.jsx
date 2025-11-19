export default function WeeklySales({ data }) {
  return (
    <div className="card weekly" style={{ padding: 16 }}>
      <div className="weekly-layout">
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "40px 1fr", gap: 10, alignItems: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: "#0f1626", display: "grid", placeItems: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3l3 7 7 2-7 2-3 7-3-7-7-2 7-2 3-7z" stroke="currentColor" strokeWidth="2"/></svg>
            </div>
            <div>
              <div className="name" style={{ fontWeight: 700 }}>{data.title}</div>
            </div>
          </div>
          <div className="sub">{data.stats.sales} • {data.stats.count} • {data.stats.change}</div>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{data.description}</div>
        </div>
        <div className="weekly-grid">
          {data.cards.map((c, i) => (
            <div key={i} className="card" style={{ padding: 10 }}>
              <img src={c.image} alt={c.title} style={{ width: "100%", borderRadius: 8, height: 140, objectFit: "cover" }} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <div style={{ fontWeight: 600 }}>{c.title}</div>
                <div className="sub">{c.price} {c.symbol}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
