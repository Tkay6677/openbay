import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import { getDb } from "../../lib/db";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  let collections = [];
  try {
    const db = await getDb();
    const featured = await db
      .collection("featuredCollections")
      .find({})
      .sort({ order: 1, updatedAt: -1 })
      .toArray();

    collections = featured.map((c) => ({
      name: c.name,
      floor: c.floor ?? 0,
      delta: c.delta ?? 0,
      image: c.image || null,
    }));
  } catch {}

  return (
    <>
      <NavBar />
      <main className="container">
        <div className="section">
          <h2>Top Collections</h2>
          {collections.length === 0 ? (
            <div style={{ color: "var(--muted)" }}>No collections yet</div>
          ) : (
            <div className="grid">
              {collections.map((c) => (
                <div key={c.name} className="card" style={{ overflow: "hidden" }}>
                  {c.image ? <img src={c.image} alt={c.name} loading="lazy" /> : <div style={{ height: 180, background: "var(--bg-elev)" }} />}
                  <div className="meta">
                    <div className="title">{c.name}</div>
                    <div className="sub">Floor</div>
                    <div className="price">
                      <span>{Number(c.floor || 0).toFixed(2)} ETH</span>
                      <span className={`delta ${Number(c.delta || 0) >= 0 ? "up" : "down"}`}>
                        {Number(c.delta || 0) >= 0 ? "+" : ""}
                        {Number(c.delta || 0).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
