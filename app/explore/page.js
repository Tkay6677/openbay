import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import AssetCard from "../../components/AssetCard";
import { assets } from "../../lib/sampleData";

export default function ExplorePage() {
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
          <div className="grid">
            {assets.map((a) => (
              <AssetCard key={`${a.contractAddress}-${a.tokenId}`} asset={a} />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}