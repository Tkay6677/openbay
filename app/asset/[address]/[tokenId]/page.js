import NavBar from "../../../../components/NavBar";
import Footer from "../../../../components/Footer";
import { assets } from "../../../../lib/sampleData";

export default function AssetDetail({ params }) {
  const { address, tokenId } = params;
  const asset = assets.find((a) => a.contractAddress === address && a.tokenId === tokenId);

  return (
    <>
      <NavBar />
      <main className="container">
        {!asset ? (
          <div className="section">
            <h2>Item not found</h2>
            <p style={{ color: "var(--muted)" }}>The item you are looking for does not exist in mock data.</p>
          </div>
        ) : (
          <div className="section" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div>
              <img src={asset.image} alt={asset.name} style={{ width: "100%", borderRadius: 16, border: "1px solid var(--border)" }} />
            </div>
            <div>
              <div className="sub">{asset.collection}</div>
              <h2 style={{ marginTop: 6 }}>{asset.name}</h2>
              <div style={{ marginTop: 10, color: "var(--muted)" }}>Owned by {asset.owner}</div>
              <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>Current price</div>
                    <div style={{ fontWeight: 700 }}>{asset.priceEth} ETH</div>
                  </div>
                  <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                    <button className="btn primary">Buy now</button>
                    <button className="btn">Make offer</button>
                  </div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Description</div>
                  <div style={{ color: "var(--muted)" }}>{asset.description}</div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Traits</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {asset.traits.map((t, i) => (
                      <div key={i} className="chip">{t.type}: {t.value}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}