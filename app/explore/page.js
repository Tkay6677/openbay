import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import AssetCard from "../../components/AssetCard";
import { getDb } from "../../lib/db";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  let assets = [];
  try {
    const db = await getDb();
    const featured = await db
      .collection("featuredAssets")
      .find({})
      .sort({ order: 1, updatedAt: -1 })
      .toArray();

    assets = featured.map((a) => ({
      tokenId: a.tokenId,
      contractAddress: a.contractAddress,
      name: a.name,
      collection: a.collection || "Unknown Collection",
      image: a.image || "/placeholder-nft.png",
      priceEth: a.priceEth ?? 0,
      owner: a.owner || null,
      description: a.description || null,
      traits: a.traits || [],
    }));
  } catch {}

  return (
    <>
      <NavBar />
      <main className="container">
        <div className="section">
          <h2>Explore</h2>
          <div className="filters">
            <button className="chip active">All</button>
            <button className="chip">Art</button>
            <button className="chip">Collectibles</button>
            <button className="chip">Gaming</button>
            <button className="chip">Music</button>
          </div>
          {assets.length === 0 ? (
            <div style={{ color: "var(--muted)" }}>No items yet</div>
          ) : (
            <div className="grid">
              {assets.map((a) => (
                <AssetCard key={`${a.contractAddress}-${a.tokenId}`} asset={a} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
