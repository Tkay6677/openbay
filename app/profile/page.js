"use client";
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import CreateListingModal from "../../components/CreateListingModal";
import { useWalletConnection } from "../../lib/hooks/useWallet";
import { useVirtualWallet } from "../../lib/hooks/useVirtualWallet";
import { truncateAddress } from "../../lib/utils";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSigner } from "@thirdweb-dev/react";
import { ethers } from "ethers";

export default function ProfilePage() {
  const { address, isConnected } = useWalletConnection();
  const signer = useSigner();
  const { balance: virtualBalance, isLoading: virtualBalanceLoading } = useVirtualWallet();
  const [virtualOwned, setVirtualOwned] = useState([]);
  const [virtualOwnedState, setVirtualOwnedState] = useState({ isLoading: true, error: null, isUnauthorized: false });

  const [custodialWallet, setCustodialWallet] = useState({
    isLoading: false,
    isCreating: false,
    hasWallet: false,
    address: null,
    balanceEth: null,
    error: null,
  });
  const [custodialPassphrase, setCustodialPassphrase] = useState("");
  const [custodialMnemonic, setCustodialMnemonic] = useState(null);

  const [depositAmountEth, setDepositAmountEth] = useState("");
  const [depositStatus, setDepositStatus] = useState({ isSending: false, error: null, txHash: null });
  const [listingNft, setListingNft] = useState(null);

  const loadCustodialWallet = useCallback(async () => {
    setCustodialWallet((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      if (!isConnected || !address) {
        setCustodialWallet((prev) => ({
          ...prev,
          isLoading: false,
          hasWallet: false,
          address: null,
          balanceEth: null,
          error: null,
        }));
        return;
      }

      const url = `/api/wallet?walletAddress=${encodeURIComponent(address)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load wallet");
      setCustodialWallet((prev) => ({
        ...prev,
        isLoading: false,
        hasWallet: !!data?.hasWallet,
        address: data?.address || null,
        balanceEth: data?.balanceEth ?? null,
        error: null,
      }));
    } catch (e) {
      setCustodialWallet((prev) => ({
        ...prev,
        isLoading: false,
        error: e?.message || "Failed to load wallet",
      }));
    }
  }, [address, isConnected]);

  const createCustodialWallet = useCallback(async () => {
    setCustodialWallet((prev) => ({ ...prev, isCreating: true, error: null }));
    try {
      if (!isConnected || !address) throw new Error("Connect your wallet first");
      if (!signer) throw new Error("Wallet signer not available");
      const message = `Cosmos custodial wallet setup\nWallet: ${address}\nTime: ${new Date().toISOString()}`;
      const signature = await signer.signMessage(message);
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          message,
          signature,
          passphrase: custodialPassphrase || null,
        }),
      });
      const data = await res.json();
      if (!res.ok && res.status !== 409) throw new Error(data?.error || "Failed to create wallet");
      setCustodialWallet((prev) => ({
        ...prev,
        isCreating: false,
        hasWallet: true,
        address: data?.address || prev.address,
        error: null,
      }));
      if (data?.mnemonic) setCustodialMnemonic(data.mnemonic);
    } catch (e) {
      setCustodialWallet((prev) => ({
        ...prev,
        isCreating: false,
        error: e?.message || "Failed to create wallet",
      }));
    }
  }, [address, custodialPassphrase, isConnected, signer]);

  useEffect(() => {
    if (!isConnected || !address) {
      setCustodialWallet((prev) => ({
        ...prev,
        isLoading: false,
        hasWallet: false,
        address: null,
        balanceEth: null,
        error: null,
      }));
      setCustodialMnemonic(null);
      setDepositAmountEth("");
      setDepositStatus({ isSending: false, error: null, txHash: null });
      return;
    }
    loadCustodialWallet();
  }, [address, isConnected, loadCustodialWallet]);

  useEffect(() => {
    let cancelled = false;
    const fetchVirtualOwned = async () => {
      setVirtualOwnedState({ isLoading: true, error: null, isUnauthorized: false });
      try {
        const res = await fetch("/api/assets?mine=true&limit=50");
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          if (!cancelled) {
            setVirtualOwned([]);
            setVirtualOwnedState({ isLoading: false, error: null, isUnauthorized: true });
          }
          return;
        }
        if (!res.ok) {
          if (!cancelled) {
            setVirtualOwned([]);
            setVirtualOwnedState({ isLoading: false, error: data.error || "Failed to load NFTs", isUnauthorized: false });
          }
          return;
        }
        if (!cancelled) {
          setVirtualOwned(Array.isArray(data.assets) ? data.assets : []);
          setVirtualOwnedState({ isLoading: false, error: null, isUnauthorized: false });
        }
      } catch (e) {
        if (!cancelled) {
          setVirtualOwned([]);
          setVirtualOwnedState({ isLoading: false, error: e?.message || "Failed to load NFTs", isUnauthorized: false });
        }
      }
    };

    fetchVirtualOwned();
    const onRefetch = () => fetchVirtualOwned();
    window.addEventListener("cosmos:wallet:refetch", onRefetch);
    return () => {
      cancelled = true;
      window.removeEventListener("cosmos:wallet:refetch", onRefetch);
    };
  }, []);

  const sendDeposit = useCallback(async () => {
    setDepositStatus({ isSending: true, error: null, txHash: null });
    try {
      if (!signer) throw new Error("Wallet signer not available");
      if (!custodialWallet?.address) throw new Error("Create your custodial wallet first");
      const value = ethers.utils.parseEther((depositAmountEth || "0").trim());
      if (!value || value.lte(0)) throw new Error("Invalid amount");
      const tx = await signer.sendTransaction({ to: custodialWallet.address, value });
      setDepositStatus({ isSending: false, error: null, txHash: tx.hash });
      loadCustodialWallet();
    } catch (e) {
      setDepositStatus({ isSending: false, error: e?.message || "Failed to send", txHash: null });
    }
  }, [custodialWallet?.address, depositAmountEth, loadCustodialWallet, signer]);

  // Get user's stats
  const stats = useMemo(() => {
    const safeOwned = Array.isArray(virtualOwned) ? virtualOwned : [];
    const listedOrAuction = safeOwned.filter((a) => a?.status === "listed" || a?.status === "auction");
    const totalValue = listedOrAuction.reduce((sum, a) => {
      if (a?.status === "listed") return sum + Number(a?.priceEth || 0);
      const highest = Number(a?.auction?.highestBid?.amountEth || 0);
      const start = Number(a?.auction?.startingBidEth || 0);
      return sum + Math.max(highest, start);
    }, 0);
    return {
      totalOwned: safeOwned.length,
      totalListed: listedOrAuction.length,
      totalValue,
    };
  }, [virtualOwned]);

  return (
    <>
      <NavBar />
      <main className="container">
        <div className="section">
          <h1>My Profile</h1>

          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
              <div className="card" style={{ padding: 24 }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 4 }}>Wallet Profile</div>
                  <div style={{ fontWeight: 600 }}>{isConnected ? truncateAddress(address) : "Not connected"}</div>
                  <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 6 }}>
                    {isConnected ? "Connected via your wallet" : "Connect a wallet to see your profile stats"}
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: 24 }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 4 }}>Virtual Wallet Balance</div>
                  {virtualBalanceLoading ? (
                    <div style={{ color: "var(--muted)" }}>Loading...</div>
                  ) : virtualBalance ? (
                    <>
                      <div style={{ fontWeight: 600, fontSize: 24, marginBottom: 4 }}>
                        {Number(virtualBalance.virtualBalance || 0).toFixed(4)} ETH
                      </div>
                      <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 6 }}>
                        Available: {Number(virtualBalance.availableToWithdraw || 0).toFixed(4)} ETH
                      </div>
                      <Link href="/wallet" style={{ display: "inline-block", marginTop: 12, color: "var(--primary)", fontSize: 14 }}>
                        Manage Wallet →
                      </Link>
                    </>
                  ) : (
                    <div style={{ fontSize: 14, color: "var(--muted)" }}>
                      <Link href="/login" style={{ color: "var(--primary)" }}>Sign in</Link> to view your virtual wallet
                    </div>
                  )}
                </div>
              </div>

              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 14, color: "var(--muted)" }}>Custodial Wallet</div>
                  <button className="btn" onClick={loadCustodialWallet} disabled={custodialWallet.isLoading}>
                    Refresh
                  </button>
                </div>

                {custodialWallet.error ? (
                  <div style={{ color: "var(--red)", marginBottom: 12 }}>{custodialWallet.error}</div>
                ) : null}

                {custodialWallet.hasWallet ? (
                  <>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 4 }}>Address</div>
                      <div style={{ fontWeight: 600 }}>{custodialWallet.address}</div>
                      <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 6 }}>
                        Fund this address with ETH to use it in-app.
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 4 }}>Balance</div>
                      <div style={{ fontWeight: 600 }}>
                        {custodialWallet.balanceEth == null ? "—" : `${Number(custodialWallet.balanceEth).toFixed(6)} ETH`}
                      </div>
                    </div>

                    <div style={{ borderTop: "1px solid var(--border)", marginTop: 16, paddingTop: 16 }}>
                      <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 10 }}>Deposit ETH (from connected wallet)</div>
                      <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
                        <input
                          className="btn"
                          style={{ width: "100%", cursor: "text" }}
                          value={depositAmountEth}
                          onChange={(e) => setDepositAmountEth(e.target.value)}
                          placeholder="Amount in ETH"
                          inputMode="decimal"
                          autoComplete="off"
                        />
                        {depositStatus.error ? <div style={{ color: "var(--red)" }}>{depositStatus.error}</div> : null}
                        {depositStatus.txHash ? (
                          <div style={{ fontSize: 14, color: "var(--muted)" }}>Tx: {depositStatus.txHash}</div>
                        ) : null}
                        <button
                          className="btn"
                          onClick={sendDeposit}
                          disabled={!isConnected || depositStatus.isSending || !depositAmountEth}
                        >
                          {depositStatus.isSending ? "Sending..." : isConnected ? "Send" : "Connect Wallet"}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 10 }}>
                      Create a custodial wallet to deposit ETH and hold NFTs.
                    </div>
                    <input
                      className="btn"
                      style={{ width: "100%", cursor: "text", marginBottom: 10 }}
                      value={custodialPassphrase}
                      onChange={(e) => setCustodialPassphrase(e.target.value)}
                      placeholder="Optional passphrase"
                      autoComplete="off"
                    />
                    <button className="btn primary" onClick={createCustodialWallet} disabled={custodialWallet.isCreating}>
                      {custodialWallet.isCreating ? "Creating..." : "Create Wallet"}
                    </button>
                  </>
                )}
              </div>
            </div>

            {custodialMnemonic ? (
              <div className="card" style={{ padding: 24, marginTop: 16, borderColor: "var(--yellow)" }}>
                <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 6 }}>Recovery Phrase (shown once)</div>
                <div style={{ fontWeight: 600, wordBreak: "break-word" }}>{custodialMnemonic}</div>
              </div>
            ) : null}

            <div className="card" style={{ padding: 24, marginTop: 16 }}>
              <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 8 }}>Connected Wallet</div>
              {isConnected ? (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 4 }}>Address</div>
                    <div style={{ fontWeight: 600 }}>{truncateAddress(address)}</div>
                  </div>
                </>
              ) : (
                <div style={{ color: "var(--muted)" }}>Connect a wallet to view on-chain holdings.</div>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
            <div className="card" style={{ padding: 20, textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>{stats.totalOwned}</div>
              <div style={{ color: "var(--muted)" }}>NFTs Owned</div>
            </div>
            <div className="card" style={{ padding: 20, textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>{stats.totalListed}</div>
              <div style={{ color: "var(--muted)" }}>Active Listings</div>
            </div>
            <div className="card" style={{ padding: 20, textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>{stats.totalValue.toFixed(3)}</div>
              <div style={{ color: "var(--muted)" }}>Total Listed Value (ETH)</div>
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <h2>My NFTs</h2>
            <div style={{ marginBottom: 12, fontSize: 14, color: "var(--muted)" }}>Wallet NFTs</div>
            {virtualOwnedState.isLoading ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Loading your virtual NFTs...</div>
            ) : virtualOwnedState.isUnauthorized ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
                <Link href="/login" style={{ color: "var(--primary)" }}>Sign in</Link> to view your virtual wallet NFTs.
              </div>
            ) : virtualOwnedState.error ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--red)" }}>{virtualOwnedState.error}</div>
            ) : virtualOwned.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
                No NFTs in your virtual wallet yet. <Link href="/mint" style={{ color: "var(--primary)" }}>Mint one now!</Link>
              </div>
            ) : (
              <div className="grid" style={{ marginBottom: 20 }}>
                {virtualOwned.map((a) => {
                  const key = `${a.contractAddress}-${a.tokenId}`;
                  return (
                    <div key={key} className="card" style={{ padding: 0 }}>
                      <Link href={`/asset/${a.contractAddress}/${a.tokenId}`} style={{ textDecoration: "none", color: "inherit" }}>
                        <img
                          src={a.image || "/placeholder-nft.png"}
                          alt={a.name || `NFT #${a.tokenId}`}
                          style={{ width: "100%", height: 200, objectFit: "cover" }}
                          onError={(e) => {
                            e.target.src = "https://via.placeholder.com/400x400?text=NFT";
                          }}
                        />
                        <div className="meta">
                          <div className="title">{a.name || `NFT #${a.tokenId}`}</div>
                          <div className="sub">{a.collection || "Cosmos Virtual Collection"}</div>
                        </div>
                      </Link>
                      <div style={{ padding: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button
                          className="btn primary"
                          onClick={() =>
                            setListingNft({
                              tokenId: String(a.tokenId || ""),
                              owner: a.owner || null,
                              contractAddress: String(a.contractAddress || "").toLowerCase(),
                              metadata: {
                                id: String(a.tokenId || ""),
                                name: a.name || "",
                                image: a.image || "",
                              },
                            })
                          }
                        >
                          List / Auction
                        </button>
                        {a.status === "listed" || a.status === "auction" ? (
                          <Link href={`/asset/${a.contractAddress}/${a.tokenId}`} className="btn">
                            View
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h2>My Listings</h2>
            {virtualOwned.filter((a) => a.status === "listed" || a.status === "auction").length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
                You don't have any active listings.{" "}
                <Link href="/listings" style={{ color: "var(--primary)" }}>
                  View marketplace
                </Link>
              </div>
            ) : (
              <div className="grid">
                {virtualOwned
                  .filter((a) => a.status === "listed" || a.status === "auction")
                  .slice(0, 6)
                  .map((a) => (
                  <Link
                    key={`${a.contractAddress}-${a.tokenId}`}
                    href={`/asset/${a.contractAddress}/${a.tokenId}`}
                    className="card"
                    style={{ textDecoration: "none" }}
                  >
                    <img 
                      src={a.image || "/placeholder-nft.png"} 
                      alt={a.name || `NFT #${a.tokenId}`}
                      style={{ width: "100%", height: 200, objectFit: "cover" }}
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/400x400?text=NFT";
                      }}
                    />
                    <div className="meta">
                      <div className="title">{a.name || `NFT #${a.tokenId}`}</div>
                      <div className="sub">{a.status === "auction" ? "Auction" : `${Number(a.priceEth || 0)} ETH`}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      {listingNft ? (
        <CreateListingModal
          nft={listingNft}
          onClose={() => setListingNft(null)}
          onSuccess={() => {
            if (typeof window !== "undefined") window.dispatchEvent(new Event("cosmos:wallet:refetch"));
            setListingNft(null);
          }}
        />
      ) : null}
      <Footer />
    </>
  );
}
