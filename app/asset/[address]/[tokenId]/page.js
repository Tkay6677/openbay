"use client";

import NavBar from "../../../../components/NavBar";
import Footer from "../../../../components/Footer";
import CreateListingModal from "../../../../components/CreateListingModal";
import { useWalletConnection } from "../../../../lib/hooks/useWallet";
import { getTimeRemaining, handleTransactionError, truncateAddress } from "../../../../lib/utils";
import { useEffect, useMemo, useState } from "react";

export default function AssetDetail({ params }) {
  const contractAddress = String(params?.address || "").trim().toLowerCase();
  const tokenId = String(params?.tokenId || "").trim();
  const { address, isConnected } = useWalletConnection();

  const [dbAsset, setDbAsset] = useState(null);
  const [dbState, setDbState] = useState({ isLoading: true, error: null });
  const [actionStatus, setActionStatus] = useState({ type: null, message: "" });
  const [offers, setOffers] = useState([]);
  const [offersState, setOffersState] = useState({ isLoading: false, error: null });
  const [offerForm, setOfferForm] = useState({ amount: "", expiresHours: "24" });
  const [bidAmount, setBidAmount] = useState("");
  const [listingNft, setListingNft] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!contractAddress || !tokenId) {
        if (!cancelled) setDbState({ isLoading: false, error: "Invalid asset route" });
        return;
      }

      try {
        setDbState({ isLoading: true, error: null });
        const res = await fetch(`/api/assets?contractAddress=${encodeURIComponent(contractAddress)}&tokenId=${encodeURIComponent(tokenId)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) {
            setDbAsset(null);
            setDbState({ isLoading: false, error: null });
          }
          return;
        }

        const asset = data?.asset || null;
        if (!cancelled) {
          setDbAsset(asset);
          setDbState({ isLoading: false, error: null });
        }
      } catch (e) {
        if (!cancelled) setDbState({ isLoading: false, error: e?.message || "Failed to load asset" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [contractAddress, tokenId]);

  const loadOffers = async () => {
    if (!contractAddress || !tokenId) return;
    setOffersState({ isLoading: true, error: null });
    try {
      const res = await fetch(
        `/api/assets?offers=true&contractAddress=${encodeURIComponent(contractAddress)}&tokenId=${encodeURIComponent(tokenId)}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load offers");
      setOffers(Array.isArray(data.offers) ? data.offers : []);
      setOffersState({ isLoading: false, error: null });
    } catch (e) {
      setOffers([]);
      setOffersState({ isLoading: false, error: e?.message || "Failed to load offers" });
    }
  };

  useEffect(() => {
    loadOffers();
  }, [contractAddress, tokenId]);

  const view = useMemo(() => {
    if (!dbAsset) return null;
    return {
      name: dbAsset?.name || (tokenId ? `NFT #${tokenId}` : "NFT"),
      image: dbAsset?.image || "/placeholder-nft.png",
      description: dbAsset?.description || null,
      owner: dbAsset?.owner || null,
      collection: dbAsset?.collection || (contractAddress ? truncateAddress(contractAddress) : "Unknown Collection"),
      priceEth: Number(dbAsset?.priceEth || 0),
      status: dbAsset?.status || "owned",
      traits: Array.isArray(dbAsset?.traits) ? dbAsset.traits : [],
      auction: dbAsset?.auction || null,
    };
  }, [contractAddress, dbAsset, tokenId]);

  const isLoading = dbState.isLoading;
  const isOwner = !!address && !!view?.owner && String(view.owner).toLowerCase() === String(address).toLowerCase();

  const runAction = async (payload, successMessage) => {
    try {
      setActionStatus({ type: "loading", message: "Processing..." });
      const res = await fetch("/api/assets", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Action failed");
      setActionStatus({ type: "success", message: `${successMessage} (tx: ${data.txHash || "pending"})` });
      const refresh = await fetch(`/api/assets?contractAddress=${encodeURIComponent(contractAddress)}&tokenId=${encodeURIComponent(tokenId)}`);
      const refreshed = await refresh.json().catch(() => ({}));
      if (refresh.ok) setDbAsset(refreshed?.asset || null);
      await loadOffers();
    } catch (e) {
      setActionStatus({ type: "error", message: handleTransactionError(e) });
    }
  };

  return (
    <>
      <NavBar />
      <main className="container">
        {isLoading ? (
          <div className="section" style={{ color: "var(--muted)" }}>
            Loading...
          </div>
        ) : !view ? (
          <div className="section">
            <h2>Item not found</h2>
            <p style={{ color: "var(--muted)" }}>{dbState.error || "The item you are looking for does not exist."}</p>
          </div>
        ) : (
          <div className="section" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div>
              <img
                src={view.image}
                alt={view.name}
                style={{ width: "100%", borderRadius: 16, border: "1px solid var(--border)" }}
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/800x800?text=NFT";
                }}
              />
            </div>
            <div>
              <div className="sub">{view.collection}</div>
              <h2 style={{ marginTop: 6 }}>{view.name}</h2>
              {view.owner ? <div style={{ marginTop: 10, color: "var(--muted)" }}>Owned by {truncateAddress(view.owner)}</div> : null}
              <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
                <div className="card" style={{ padding: 16 }}>
                  {actionStatus.message ? (
                    <div
                      style={{
                        marginBottom: 12,
                        padding: 10,
                        borderRadius: 8,
                        background:
                          actionStatus.type === "error"
                            ? "rgba(239, 68, 68, 0.1)"
                            : actionStatus.type === "success"
                              ? "rgba(34, 197, 94, 0.1)"
                              : "rgba(45, 212, 191, 0.1)",
                        color:
                          actionStatus.type === "error"
                            ? "var(--red)"
                            : actionStatus.type === "success"
                              ? "var(--green)"
                              : "var(--primary)",
                        border: `1px solid ${
                          actionStatus.type === "error"
                            ? "var(--red)"
                            : actionStatus.type === "success"
                              ? "var(--green)"
                              : "var(--primary)"
                        }`,
                      }}
                    >
                      {actionStatus.message}
                    </div>
                  ) : null}

                  {view.status === "listed" ? (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div>Listed price</div>
                        <div style={{ fontWeight: 700 }}>{view.priceEth} ETH</div>
                      </div>
                      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {isOwner ? (
                          <button
                            className="btn"
                            onClick={() =>
                              runAction({ action: "unlist", contractAddress, tokenId }, "Unlisted")
                            }
                          >
                            Cancel listing
                          </button>
                        ) : (
                          <button
                            className="btn primary"
                            onClick={() => runAction({ action: "buy", contractAddress, tokenId }, "Purchased")}
                            disabled={!isConnected}
                          >
                            Buy now
                          </button>
                        )}
                        {!isOwner ? (
                          <button
                            className="btn"
                            onClick={() =>
                              runAction(
                                {
                                  action: "make_offer",
                                  contractAddress,
                                  tokenId,
                                  amountEth: Number(offerForm.amount),
                                  expiresHours: Number(offerForm.expiresHours || 24),
                                },
                                "Offer placed"
                              )
                            }
                            disabled={!isConnected || !offerForm.amount}
                          >
                            Make offer
                          </button>
                        ) : null}
                      </div>
                    </>
                  ) : view.status === "auction" ? (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div>Current bid</div>
                        <div style={{ fontWeight: 700 }}>
                          {Math.max(Number(view.auction?.startingBidEth || 0), Number(view.auction?.highestBid?.amountEth || 0))} ETH
                        </div>
                      </div>
                      <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 12 }}>
                        Time left:{" "}
                        {view.auction?.endAt ? getTimeRemaining(new Date(view.auction.endAt).getTime()) : "—"}
                      </div>
                      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                        <input
                          className="btn"
                          style={{ cursor: "text" }}
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          placeholder="Bid amount (ETH)"
                          inputMode="decimal"
                        />
                        <button
                          className="btn primary"
                          onClick={() => runAction({ action: "bid", contractAddress, tokenId, amountEth: Number(bidAmount) }, "Bid placed")}
                          disabled={!isConnected || !bidAmount || isOwner}
                        >
                          Place bid
                        </button>
                        {isOwner ? (
                          <button
                            className="btn"
                            onClick={() => runAction({ action: "close_auction", contractAddress, tokenId }, "Auction closed")}
                          >
                            Close auction
                          </button>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div>Status</div>
                        <div style={{ fontWeight: 700 }}>{view.status}</div>
                      </div>
                      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {isOwner ? (
                          <button
                            className="btn primary"
                            onClick={() =>
                              setListingNft({
                                tokenId,
                                owner: view.owner,
                                contractAddress,
                                metadata: { id: tokenId, name: view.name, image: view.image },
                              })
                            }
                          >
                            List / Auction
                          </button>
                        ) : (
                          <>
                            <input
                              className="btn"
                              style={{ cursor: "text", flex: 1, minWidth: 160 }}
                              value={offerForm.amount}
                              onChange={(e) => setOfferForm((s) => ({ ...s, amount: e.target.value }))}
                              placeholder="Offer (ETH)"
                              inputMode="decimal"
                            />
                            <button
                              className="btn"
                              onClick={() =>
                                runAction(
                                  {
                                    action: "make_offer",
                                    contractAddress,
                                    tokenId,
                                    amountEth: Number(offerForm.amount),
                                    expiresHours: Number(offerForm.expiresHours || 24),
                                  },
                                  "Offer placed"
                                )
                              }
                              disabled={!isConnected || !offerForm.amount}
                            >
                              Make offer
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
                {offersState.error ? <div style={{ color: "var(--red)" }}>{offersState.error}</div> : null}
                {offers.length ? (
                  <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>Offers</div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {offers.map((o) => (
                        <div key={o.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                          <div style={{ fontSize: 12, color: "var(--muted)" }}>
                            {truncateAddress(o.bidder)} • {Number(o.amountEth || 0)} ETH
                          </div>
                          {isOwner ? (
                            <button
                              className="btn"
                              onClick={() =>
                                runAction(
                                  { action: "accept_offer", contractAddress, tokenId, offerId: o.id },
                                  "Offer accepted"
                                )
                              }
                            >
                              Accept
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {view.description ? (
                  <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>Description</div>
                    <div style={{ color: "var(--muted)", whiteSpace: "pre-wrap" }}>{view.description}</div>
                  </div>
                ) : null}
                {Array.isArray(view.traits) && view.traits.length ? (
                  <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>Traits</div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {view.traits.map((t, i) => (
                        <div key={i} className="chip">
                          {t.type}: {t.value}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </main>
      {listingNft ? (
        <CreateListingModal
          nft={listingNft}
          onClose={() => setListingNft(null)}
          onSuccess={() => setListingNft(null)}
        />
      ) : null}
      <Footer />
    </>
  );
}
