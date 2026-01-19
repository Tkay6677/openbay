"use client";
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import { useWalletConnection } from "../../lib/hooks/useWallet";
import { handleTransactionError, getTimeRemaining, NFT_PLACEHOLDER_SRC } from "../../lib/utils";
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
                  <div key={auctionKey} className="card nft-card">
                    <Link href={`/asset/${contractAddress}/${tokenId}`} className="nft-card-link">
                      <img
                        src={auction.image || NFT_PLACEHOLDER_SRC}
                        alt={auction.name || `NFT #${tokenId}`}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = NFT_PLACEHOLDER_SRC;
                        }}
                      />
                      <div className="meta">
                        <div className="title">{auction.name || `NFT #${tokenId}`}</div>
                        <div className="sub">{auction.collection || "Auction"}</div>
                        <div className="price">
                          <span>Current bid</span>
                          <span>{currentBid} ETH</span>
                        </div>
                        {buyoutPrice ? (
                          <div className="price">
                            <span>Buyout</span>
                            <span>{buyoutPrice} ETH</span>
                          </div>
                        ) : null}
                        <div className="sub">Time left: {timeRemaining}</div>
                      </div>
                    </Link>

                    {isEnded ? (
                      <div className="nft-card-actions">
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
                      <div className="nft-card-actions">
                        <input
                          type="number"
                          step="0.001"
                          placeholder={`Min: ${currentBid} ETH`}
                          value={bidAmounts[auctionKey] || ""}
                          onChange={(e) => setBidAmounts({ ...bidAmounts, [auctionKey]: e.target.value })}
                          inputMode="decimal"
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

