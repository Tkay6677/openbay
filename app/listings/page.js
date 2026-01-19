"use client";
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import { useWalletConnection } from "../../lib/hooks/useWallet";
import { handleTransactionError, truncateAddress, NFT_PLACEHOLDER_SRC } from "../../lib/utils";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function ListingsPage() {
  const { address, isConnected } = useWalletConnection();
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  
  const [editingListing, setEditingListing] = useState(null);
  const [newPrice, setNewPrice] = useState("");
  const [status, setStatus] = useState({ type: null, message: "" });

  const loadListings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/assets?listed=true&limit=50");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load listings");
      setListings(Array.isArray(data.assets) ? data.assets : []);
    } catch (e) {
      setListings([]);
      setStatus({ type: "error", message: e?.message || "Failed to load listings" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, []);

  const handleCancel = async (listingId) => {
    if (!confirm("Are you sure you want to cancel this listing?")) return;

    try {
      setOperationLoading(true);
      setStatus({ type: "loading", message: "Cancelling listing..." });
      const res = await fetch("/api/assets", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "unlist",
          contractAddress: listingId.contractAddress,
          tokenId: listingId.tokenId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to cancel listing");
      setStatus({ type: "success", message: `Listing cancelled (tx: ${data.txHash || "pending"})` });
      await loadListings();
    } catch (error) {
      const errorMessage = handleTransactionError(error);
      setStatus({ type: "error", message: errorMessage });
    } finally {
      setOperationLoading(false);
    }
  };

  const handleUpdatePrice = async (listingId) => {
    if (!newPrice || parseFloat(newPrice) <= 0) {
      setStatus({ type: "error", message: "Please enter a valid price" });
      return;
    }

    try {
      setOperationLoading(true);
      setStatus({ type: "loading", message: "Updating listing price..." });
      const res = await fetch("/api/assets", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "list",
          contractAddress: listingId.contractAddress,
          tokenId: listingId.tokenId,
          priceEth: Number(newPrice),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update listing price");
      setStatus({ type: "success", message: `Listing updated (tx: ${data.txHash || "pending"})` });
      setEditingListing(null);
      setNewPrice("");
      await loadListings();
    } catch (error) {
      const errorMessage = handleTransactionError(error);
      setStatus({ type: "error", message: errorMessage });
    } finally {
      setOperationLoading(false);
    }
  };

  const handleBuy = async (listingId) => {
    if (!isConnected || !address) {
      setStatus({ type: "error", message: "Please connect your wallet first" });
      return;
    }

    try {
      setOperationLoading(true);
      setStatus({ type: "loading", message: "Buying NFT..." });
      const res = await fetch("/api/assets", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "buy",
          contractAddress: listingId.contractAddress,
          tokenId: listingId.tokenId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to buy");
      setStatus({ type: "success", message: `Purchase successful (tx: ${data.txHash || "pending"})` });
      await loadListings();
    } catch (error) {
      const errorMessage = handleTransactionError(error);
      setStatus({ type: "error", message: errorMessage });
    } finally {
      setOperationLoading(false);
    }
  };

  return (
    <>
      <NavBar />
      <main className="container">
        <div className="section">
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <h1>Marketplace Listings</h1>
            <Link href="/auctions" className="btn">
              View Auctions
            </Link>
          </div>

          {!isConnected && (
            <div style={{
              padding: 16,
              borderRadius: 8,
              background: "rgba(239, 68, 68, 0.1)",
              color: "var(--red)",
              border: "1px solid var(--red)",
              marginBottom: 24,
            }}>
              Connect your wallet to buy items
            </div>
          )}

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

          {isLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
              Loading listings...
            </div>
          ) : listings.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
              No active listings
            </div>
          ) : (
            <div className="grid">
              {listings.map((listing) => {
                const isOwner = String(listing.owner || "").toLowerCase() === address?.toLowerCase();
                const tokenId = listing.tokenId?.toString?.() || String(listing.tokenId);
                const contractAddress = listing.contractAddress;
                const priceEth = Number(listing.priceEth || 0);
                const name = listing.name || `NFT #${tokenId}`;
                const collection = listing.collection || "Unknown Collection";

                return (
                  <div key={`${contractAddress}-${tokenId}`} className="card nft-card">
                    <Link href={`/asset/${contractAddress}/${tokenId}`} className="nft-card-link">
                      <img
                        src={listing.image || NFT_PLACEHOLDER_SRC}
                        alt={name}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = NFT_PLACEHOLDER_SRC;
                        }}
                      />
                      <div className="meta">
                        <div className="title">{name}</div>
                        <div className="sub">{collection}</div>
                        <div className="price">
                          <span>Price</span>
                          <span>{priceEth} ETH</span>
                        </div>
                        <div className="sub">Seller: {truncateAddress(listing.owner)}</div>
                      </div>
                    </Link>

                    <div className="nft-card-actions">
                      {isOwner ? (
                        editingListing === `${contractAddress}-${tokenId}` ? (
                          <>
                            <input
                              type="number"
                              step="0.001"
                              value={newPrice}
                              onChange={(e) => setNewPrice(e.target.value)}
                              placeholder="New price (ETH)"
                              inputMode="decimal"
                            />
                            <button
                              className="btn"
                              onClick={() => {
                                setEditingListing(null);
                                setNewPrice("");
                              }}
                              style={{ flex: 1 }}
                            >
                              Cancel
                            </button>
                            <button
                              className="btn primary"
                              onClick={() => handleUpdatePrice({ contractAddress, tokenId })}
                              disabled={operationLoading}
                              style={{ flex: 1 }}
                            >
                              {operationLoading ? "Updating..." : "Update"}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="btn"
                              onClick={() => {
                                setEditingListing(`${contractAddress}-${tokenId}`);
                                setNewPrice(String(priceEth));
                              }}
                              style={{ flex: 1 }}
                            >
                              Update Price
                            </button>
                            <button
                              className="btn"
                              onClick={() => handleCancel({ contractAddress, tokenId })}
                              disabled={operationLoading}
                              style={{
                                flex: 1,
                                background: "rgba(239, 68, 68, 0.1)",
                                color: "var(--red)",
                                borderColor: "var(--red)",
                              }}
                            >
                              Cancel Listing
                            </button>
                          </>
                        )
                      ) : (
                        <button
                          className="btn primary"
                          onClick={() => handleBuy({ contractAddress, tokenId })}
                          disabled={!isConnected || operationLoading}
                          style={{ width: "100%" }}
                        >
                          {operationLoading ? "Processing..." : "Buy"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
