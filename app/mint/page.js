"use client";
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import { useMinting } from "../../lib/hooks/useMinting";
import { useWalletConnection } from "../../lib/hooks/useWallet";
import { handleTransactionError, validateImageFile } from "../../lib/utils";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function MintPage() {
  const { isConnected } = useWalletConnection();
  const { mintNFTWithImage, isLoading } = useMinting();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    rarity: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [status, setStatus] = useState({ type: null, message: "" });
  const [minted, setMinted] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        validateImageFile(file);
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
      } catch (err) {
        setImageFile(null);
        setImagePreview(null);
        setStatus({ type: "error", message: err?.message || "Invalid image" });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isConnected) {
      setStatus({ type: "error", message: "Please connect your wallet first" });
      return;
    }

    if (!imageFile) {
      setStatus({ type: "error", message: "Please select an image" });
      return;
    }

    if (!formData.name || !formData.description) {
      setStatus({ type: "error", message: "Please fill in all required fields" });
      return;
    }

    try {
      setMinted(null);
      setStatus({ type: "loading", message: "Check your wallet to sign the mint message..." });
      const result = await mintNFTWithImage(imageFile, formData);
      setStatus({ 
        type: "success", 
        message: `NFT minted successfully! Token ID: ${result.tokenId}` 
      });
      setMinted({
        tokenId: result?.tokenId ? String(result.tokenId) : null,
        contractAddress: result?.contractAddress || process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS || null,
      });
    } catch (error) {
      const errorMessage = handleTransactionError(error);
      setStatus({ type: "error", message: errorMessage });
    }
  };

  return (
    <>
      <NavBar />
      <main className="container">
        <div className="section" style={{ maxWidth: 600, margin: "0 auto" }}>
          <h1 style={{ marginBottom: 24 }}>Mint NFT</h1>

          {status.message && (
            <div style={{
              marginBottom: 24,
              padding: 12,
              borderRadius: 8,
              background: status.type === "error" ? "rgba(239, 68, 68, 0.1)" : status.type === "success" ? "rgba(34, 197, 94, 0.1)" : "rgba(45, 212, 191, 0.1)",
              color: status.type === "error" ? "var(--red)" : status.type === "success" ? "var(--green)" : "var(--primary)",
              border: `1px solid ${status.type === "error" ? "var(--red)" : status.type === "success" ? "var(--green)" : "var(--primary)"}`,
            }}>
              {status.message}
            </div>
          )}

          {!isConnected && (
            <div style={{
              marginBottom: 24,
              padding: 16,
              borderRadius: 8,
              background: "rgba(239, 68, 68, 0.1)",
              color: "var(--red)",
              border: "1px solid var(--red)",
            }}>
              Please connect your wallet to mint NFTs
            </div>
          )}

          {minted?.tokenId && minted?.contractAddress ? (
            <div style={{ marginBottom: 24, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href={`/asset/${minted.contractAddress}/${minted.tokenId}`} className="btn primary">
                View NFT
              </Link>
              <button
                type="button"
                className="btn"
                onClick={() => router.push("/wallet")}
              >
                Go to Wallet
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => router.push("/profile")}
              >
                Go to Profile
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setMinted(null);
                  setStatus({ type: null, message: "" });
                  setFormData({ name: "", description: "", category: "", rarity: "" });
                  setImageFile(null);
                  setImagePreview(null);
                }}
              >
                Mint Another
              </button>
            </div>
          ) : null}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                Image *
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--bg-elev)",
                  color: "var(--text)",
                }}
              />
              {imageFile ? (
                <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div style={{ color: "var(--muted)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {imageFile.name}
                  </div>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    style={{ padding: "6px 10px", fontSize: 12 }}
                  >
                    Remove
                  </button>
                </div>
              ) : null}
              {imagePreview && (
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  style={{ 
                    marginTop: 12, 
                    maxWidth: "100%", 
                    maxHeight: 300, 
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                  }} 
                />
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Awesome NFT"
                required
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--bg-elev)",
                  color: "var(--text)",
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your NFT..."
                required
                rows={4}
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--bg-elev)",
                  color: "var(--text)",
                  fontFamily: "inherit",
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Art, Collectibles, Gaming, etc."
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--bg-elev)",
                  color: "var(--text)",
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                Rarity
              </label>
              <input
                type="text"
                value={formData.rarity}
                onChange={(e) => setFormData({ ...formData, rarity: e.target.value })}
                placeholder="Common, Rare, Epic, Legendary"
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--bg-elev)",
                  color: "var(--text)",
                }}
              />
            </div>

            <button
              type="submit"
              className="btn primary"
              disabled={!isConnected || isLoading || !imageFile}
              style={{ width: "100%", padding: 12 }}
            >
              {isLoading ? "Minting..." : "Mint NFT"}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}

