"use client";
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import { useWalletConnection } from "../../lib/hooks/useWallet";
import { handleTransactionError, getTimeRemaining } from "../../lib/utils";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function AuctionsPage() {
  const { address, isConnected } = useWalletConnection();
  
  const [auctions, setAuctions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [bidAmounts, setBidAmounts] = useState({});
  const [status, setStatus] = useState({ type: null, message: "" });

  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        const res = await fetch("/api/assets?auctioned=true&limit=50");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to load auctions");
        setAuctions(Array.isArray(data.assets) ? data.assets : []);
      } catch (error) {
        setAuctions([]);
        setStatus({ type: "error", message: error?.message || "Failed to load auctions" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuctions();
    const interval = setInterval(fetchAuctions, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handlePlaceBid = async (auctionKey, contractAddress, tokenId, minBid) => {
    if (!isConnected) {
      setStatus({ type: "error", message: "Please connect your wallet first" });
      return;
    }

    const bidAmount = bidAmounts[auctionKey];
    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      setStatus({ type: "error", message: "Please enter a valid bid amount" });
      return;
    }
    if (parseFloat(bidAmount) <= Number(minBid || 0)) {
      setStatus({ type: "error", message: `Bid must be greater than ${minBid} ETH` });
      return;
    }

    try {
      setOperationLoading(true);
      setStatus({ type: "loading", message: "Placing bid..." });
      const res = await fetch("/api/assets", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "bid",
          contractAddress,
          tokenId,
          amountEth: Number(bidAmount),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to place bid");
      setStatus({ type: "success", message: `Bid placed (tx: ${data.txHash || "pending"})` });
      setBidAmounts((s) => ({ ...s, [auctionKey]: "" }));
      const refresh = await fetch("/api/assets?auctioned=true&limit=50");
      const refreshData = await refresh.json().catch(() => ({}));
      if (refresh.ok) setAuctions(Array.isArray(refreshData.assets) ? refreshData.assets : []);
    } catch (error) {
      const errorMessage = handleTransactionError(error);
      setStatus({ type: "error", message: errorMessage });
    } finally {
      setOperationLoading(false);
    }
  };

  const handleCloseAuction = async (contractAddress, tokenId) => {
    if (!isConnected) {
      setStatus({ type: "error", message: "Please connect your wallet first" });
      return;
    }

    try {
      setOperationLoading(true);
      setStatus({ type: "loading", message: "Closing auction..." });
      const res = await fetch("/api/assets", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "close_auction", contractAddress, tokenId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to close auction");
      setStatus({ type: "success", message: `Auction closed (tx: ${data.txHash || "pending"})` });
      const refresh = await fetch("/api/assets?auctioned=true&limit=50");
      const refreshData = await refresh.json().catch(() => ({}));
      if (refresh.ok) setAuctions(Array.isArray(refreshData.assets) ? refreshData.assets : []);
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
          <h1>Active Auctions</h1>

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
              Loading auctions...
            </div>
          ) : auctions.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
              No active auctions found
            </div>
          ) : (
            <div className="grid">
              {auctions.map((auction) => {
                const contractAddress = String(auction.contractAddress || "");
                const tokenId = String(auction.tokenId || "");
                const auctionKey = `${contractAddress}-${tokenId}`;
                const startingBid = Number(auction.auction?.startingBidEth || 0);
                const highest = Number(auction.auction?.highestBid?.amountEth || 0);
                const currentBid = Math.max(startingBid, highest);
                const buyoutPrice = Number(auction.auction?.buyoutPriceEth || 0) > 0 ? Number(auction.auction?.buyoutPriceEth || 0) : null;
                const endAt = auction.auction?.endAt ? new Date(auction.auction.endAt) : null;
                const timeRemaining = endAt ? getTimeRemaining(endAt.getTime()) : "—";
                const isEnded = endAt ? endAt < new Date() : false;

                return (
                  <div key={auctionKey} className="card" style={{ padding: 16 }}>
                    <Link href={`/asset/${contractAddress}/${tokenId}`}>
                      <img 
                        src={auction.image || "/placeholder-nft.png"} 
                        alt={auction.name || `NFT #${tokenId}`}
                        style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 8, marginBottom: 12, cursor: "pointer" }}
                        onError={(e) => {
                          e.target.src = "https://via.placeholder.com/400x400?text=NFT";
                        }}
                      />
                    </Link>
                    <div style={{ marginBottom: 8, fontWeight: 600 }}>
                      {auction.name || `NFT #${tokenId}`}
                    </div>
                    <div style={{ marginBottom: 8, color: "var(--muted)", fontSize: 14 }}>
                      <div>Current Bid: {currentBid} ETH</div>
                      {buyoutPrice && <div>Buyout: {buyoutPrice} ETH</div>}
                      <div>Time Left: {timeRemaining}</div>
                    </div>

                    {isEnded ? (
                      <div style={{ marginTop: 12 }}>
                        <button
                          className="btn primary"
                          onClick={() => handleCloseAuction(contractAddress, tokenId)}
                          disabled={operationLoading}
                          style={{ width: "100%" }}
                        >
                          {operationLoading ? "Processing..." : "Claim NFT"}
                        </button>
                      </div>
                    ) : (
                      <div style={{ marginTop: 12 }}>
                        <input
                          type="number"
                          step="0.001"
                          placeholder={`Min: ${currentBid} ETH`}
                          value={bidAmounts[auctionKey] || ""}
                          onChange={(e) => setBidAmounts({ ...bidAmounts, [auctionKey]: e.target.value })}
                          style={{
                            width: "100%",
                            padding: 8,
                            marginBottom: 8,
                            borderRadius: 6,
                            border: "1px solid var(--border)",
                            background: "var(--bg)",
                            color: "var(--text)",
                          }}
                        />
                        <button
                          className="btn primary"
                          onClick={() => handlePlaceBid(auctionKey, contractAddress, tokenId, currentBid)}
                          disabled={!isConnected || operationLoading}
                          style={{ width: "100%" }}
                        >
                          {operationLoading ? "Placing Bid..." : "Place Bid"}
                        </button>
                        {buyoutPrice && (
                          <button
                            className="btn"
                            onClick={() => {
                              setBidAmounts({ ...bidAmounts, [auctionKey]: String(buyoutPrice) });
                              handlePlaceBid(auctionKey, contractAddress, tokenId, currentBid);
                            }}
                            disabled={!isConnected || operationLoading}
                            style={{ width: "100%", marginTop: 8 }}
                          >
                            Buy Now ({buyoutPrice} ETH)
                          </button>
                        )}
                      </div>
                    )}
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

