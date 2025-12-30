"use client";
import { useState, useEffect } from "react";
import { handleTransactionError } from "../lib/utils";

export default function CreateListingModal({ nft, onClose, onSuccess }) {
  const assetContractAddress = String(nft?.contractAddress || "").trim().toLowerCase();
  const tokenId = nft?.tokenId !== undefined ? String(nft.tokenId) : String(nft?.metadata?.id || "");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState(30); // days
  const [type, setType] = useState("direct");
  const [startingBid, setStartingBid] = useState("");
  const [buyoutPrice, setBuyoutPrice] = useState("");
  const [auctionDurationHours, setAuctionDurationHours] = useState(24);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: null, message: "" });

  // Simulated marketplace approval (no on-chain transactions)
  useEffect(() => {
    try {
      const approvedCosmos = typeof window !== "undefined" && window.localStorage.getItem("cosmos.marketplaceApproved") === "1";
      setNeedsApproval(!approvedCosmos);
    } catch {
      setNeedsApproval(false);
    }
  }, []);

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      setStatus({ type: "loading", message: "Approving marketplace..." });
      await new Promise((r) => setTimeout(r, 900));
      if (typeof window !== "undefined") {
        window.localStorage.setItem("cosmos.marketplaceApproved", "1");
      }
      setNeedsApproval(false);
      setStatus({ type: "success", message: "Approval successful" });
    } catch (error) {
      const errorMessage = handleTransactionError(error);
      setStatus({ type: "error", message: errorMessage });
    } finally {
      setIsApproving(false);
    }
  };

  const handleCreateListing = async (e) => {
    e.preventDefault();

    if (needsApproval) {
      setStatus({ type: "error", message: "Please approve the marketplace first" });
      return;
    }

    try {
      if (!assetContractAddress || !tokenId) throw new Error("Invalid NFT");
      setIsSubmitting(true);

      if (type === "direct") {
        if (!price || parseFloat(price) <= 0) {
          setStatus({ type: "error", message: "Please enter a valid price" });
          return;
        }

        setStatus({ type: "loading", message: "Creating listing..." });
        const res = await fetch("/api/assets", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "list",
            contractAddress: assetContractAddress,
            tokenId,
            priceEth: Number(price),
            durationDays: Number(duration),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to create listing");
        setStatus({ type: "success", message: `Listing created (tx: ${data.txHash || "pending"})` });
        if (onSuccess) onSuccess(data);
      } else {
        if (!startingBid || parseFloat(startingBid) <= 0) {
          setStatus({ type: "error", message: "Please enter a valid starting bid" });
          return;
        }

        setStatus({ type: "loading", message: "Creating auction..." });
        const res = await fetch("/api/assets", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "create_auction",
            contractAddress: assetContractAddress,
            tokenId,
            startingBidEth: Number(startingBid),
            buyoutPriceEth: buyoutPrice ? Number(buyoutPrice) : null,
            durationHours: Number(auctionDurationHours),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to create auction");
        setStatus({ type: "success", message: `Auction created (tx: ${data.txHash || "pending"})` });
        if (onSuccess) onSuccess(data);
      }
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      const errorMessage = handleTransactionError(error);
      setStatus({ type: "error", message: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    }} onClick={onClose}>
      <div 
        className="card" 
        style={{ 
          padding: 24, 
          maxWidth: 500, 
          width: "90%",
          background: "var(--bg-elev)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0 }}>Create Listing</h2>

        {status.message && (
          <div style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            background: status.type === "error" ? "rgba(239, 68, 68, 0.1)" : status.type === "success" ? "rgba(34, 197, 94, 0.1)" : "rgba(45, 212, 191, 0.1)",
            color: status.type === "error" ? "var(--red)" : status.type === "success" ? "var(--green)" : "var(--primary)",
            border: `1px solid ${status.type === "error" ? "var(--red)" : status.type === "success" ? "var(--green)" : "var(--primary)"}`,
          }}>
            {status.message}
          </div>
        )}

        {needsApproval && (
          <div style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            background: "rgba(239, 68, 68, 0.1)",
            color: "var(--red)",
            border: "1px solid var(--red)",
          }}>
            <div style={{ marginBottom: 8 }}>Marketplace approval required</div>
            <button
              className="btn primary"
              onClick={handleApprove}
              disabled={isApproving}
              style={{ width: "100%" }}
            >
              {isApproving ? "Approving..." : "Approve Marketplace"}
            </button>
          </div>
        )}

        <form onSubmit={handleCreateListing}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Type</label>
            <select
              className="btn"
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={needsApproval}
              style={{ width: "100%", padding: 10 }}
            >
              <option value="direct">Fixed price</option>
              <option value="auction">Auction</option>
            </select>
          </div>

          {type === "direct" ? (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                  Price (ETH) *
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.0"
                  required
                  disabled={needsApproval}
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                    color: "var(--text)",
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                  Duration (days)
                </label>
                <input
                  type="number"
                  min="1"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  required
                  disabled={needsApproval}
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                    color: "var(--text)",
                  }}
                />
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Starting bid (ETH) *</label>
                <input
                  type="number"
                  step="0.001"
                  value={startingBid}
                  onChange={(e) => setStartingBid(e.target.value)}
                  placeholder="0.0"
                  required
                  disabled={needsApproval}
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                    color: "var(--text)",
                  }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Buyout price (ETH)</label>
                <input
                  type="number"
                  step="0.001"
                  value={buyoutPrice}
                  onChange={(e) => setBuyoutPrice(e.target.value)}
                  placeholder="Optional"
                  disabled={needsApproval}
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                    color: "var(--text)",
                  }}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Duration (hours)</label>
                <input
                  type="number"
                  min="1"
                  value={auctionDurationHours}
                  onChange={(e) => setAuctionDurationHours(parseInt(e.target.value))}
                  required
                  disabled={needsApproval}
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                    color: "var(--text)",
                  }}
                />
              </div>
            </>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              className="btn"
              onClick={onClose}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn primary"
              disabled={isSubmitting || needsApproval}
              style={{ flex: 1 }}
            >
              {isSubmitting ? "Creating..." : type === "direct" ? "Create Listing" : "Create Auction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
