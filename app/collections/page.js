import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import AssetCard from "../../components/AssetCard";
import { assets } from "../../lib/sampleData";

export default function CollectionsPage() {
  return (
    <>
      <NavBar />
      <main className="container">
        <div className="section">
          <h2>Top Collections</h2>
          <div className="grid">
            {assets.map((a) => (
              <AssetCard key={`c-${a.contractAddress}-${a.tokenId}`} asset={a} />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}