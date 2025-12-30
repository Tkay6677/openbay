"use client";
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import ProtectedRoute from "../../components/ProtectedRoute";
import WalletBalanceCard from "../../components/WalletBalanceCard";
import DepositForm from "../../components/DepositForm";
import WithdrawForm from "../../components/WithdrawForm";
import TransactionList from "../../components/TransactionList";
import { useEffect, useState } from "react";
import { useWalletConnection } from "../../lib/hooks/useWallet";
import { useSigner } from "@thirdweb-dev/react";
import { truncateAddress } from "../../lib/utils";
import Link from "next/link";

export default function WalletPage() {
  const [activeTab, setActiveTab] = useState("balance");
  const { address, isConnected, connectWallet, disconnectWallet, isConnecting } = useWalletConnection();
  const signer = useSigner();
  const [walletProvider, setWalletProvider] = useState("metamask");
  const [profileState, setProfileState] = useState({ isLoading: true, walletAddress: null, error: null });
  const [linkStatus, setLinkStatus] = useState({ isLoading: false, error: null });
  const [copied, setCopied] = useState({ address: false });
  const [virtualAssets, setVirtualAssets] = useState([]);
  const [virtualAssetsState, setVirtualAssetsState] = useState({ isLoading: false, error: null });

  useEffect(() => {
    window.dispatchEvent(new Event("cosmos:wallet:refetch"));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setProfileState((s) => ({ ...s, isLoading: true, error: null }));
      try {
        const res = await fetch("/api/user/profile");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to load profile");
        if (cancelled) return;
        setProfileState({ isLoading: false, walletAddress: data.walletAddress || null, error: null });
      } catch (e) {
        if (cancelled) return;
        setProfileState({ isLoading: false, walletAddress: null, error: e.message || "Failed to load profile" });
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchMine = async () => {
      if (activeTab !== "nfts") return;
      if (!profileState.walletAddress) return;
      setVirtualAssetsState({ isLoading: true, error: null });
      try {
        const res = await fetch("/api/assets?mine=true&limit=50");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) {
            setVirtualAssets([]);
            setVirtualAssetsState({ isLoading: false, error: data.error || "Failed to load NFTs" });
          }
          return;
        }
        if (!cancelled) {
          setVirtualAssets(Array.isArray(data.assets) ? data.assets : []);
          setVirtualAssetsState({ isLoading: false, error: null });
        }
      } catch (e) {
        if (!cancelled) {
          setVirtualAssets([]);
          setVirtualAssetsState({ isLoading: false, error: e?.message || "Failed to load NFTs" });
        }
      }
    };
    fetchMine();
    return () => {
      cancelled = true;
    };
  }, [activeTab, profileState.walletAddress]);

  const handleDepositSuccess = () => {
    setTimeout(() => {
      window.dispatchEvent(new Event("cosmos:wallet:refetch"));
    }, 180000);
  };

  const handleWithdrawSuccess = () => {
    // Balance will be refreshed by the withdrawal form
  };

  const copyText = async (text, key) => {
    try {
      await navigator.clipboard.writeText(String(text || ""));
      setCopied((s) => ({ ...s, [key]: true }));
      window.setTimeout(() => {
        setCopied((s) => ({ ...s, [key]: false }));
      }, 1200);
    } catch {
      setCopied((s) => ({ ...s, [key]: false }));
    }
  };

  const linkWallet = async () => {
    setLinkStatus({ isLoading: true, error: null });
    try {
      if (!isConnected || !address) throw new Error("Connect your wallet first");
      if (!signer) throw new Error("Wallet signer not available");
      const message = `Link wallet to Cosmos account\nWallet: ${address}\nTime: ${new Date().toISOString()}`;
      const signature = await signer.signMessage(message);
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ walletAddress: address, message, signature }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to link wallet");
      setProfileState((s) => ({ ...s, walletAddress: data.walletAddress || address, error: null }));
      window.dispatchEvent(new Event("cosmos:wallet:refetch"));
    } catch (e) {
      setLinkStatus({ isLoading: false, error: e.message || "Failed to link wallet" });
      return;
    } finally {
      setLinkStatus((s) => ({ ...s, isLoading: false }));
    }
  };

  return (
    <ProtectedRoute>
      <NavBar />
      <main className="container">
        <div className="section">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 20,
              maxWidth: 980,
            }}
          >
            <div>
              <h1 style={{ margin: 0 }}>My Wallet</h1>
              <div style={{ color: "var(--muted)", marginTop: 6 }}>
                Virtual balance, deposits, withdrawals, and transaction history.
              </div>
            </div>

            {isConnected && address ? (
              <div
                className="card"
                style={{
                  padding: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Connected</div>
                <div style={{ fontFamily: "monospace", fontSize: 13 }}>{truncateAddress(address)}</div>
                <button className="btn" type="button" onClick={() => copyText(address, "address")} style={{ padding: "4px 8px", fontSize: 12 }}>
                  {copied.address ? "Copied" : "Copy"}
                </button>
                <button className="btn" type="button" onClick={disconnectWallet} style={{ padding: "4px 8px", fontSize: 12 }}>
                  Disconnect
                </button>
              </div>
            ) : null}
          </div>

          {!isConnected ? (
            <div className="card" style={{ padding: 24, maxWidth: 980 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, alignItems: "start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Connect your wallet</div>
                  <div style={{ color: "var(--muted)", marginBottom: 10 }}>
                    Step 1 of 2: connect a wallet to use deposit and withdrawal features.
                  </div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                    Your account login stays email/Google. This connection is only for wallet actions.
                  </div>
                </div>
                <div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                    <button
                      className={walletProvider === "metamask" ? "btn primary" : "btn"}
                      onClick={() => setWalletProvider("metamask")}
                      disabled={isConnecting}
                      type="button"
                      style={{ flex: 1, minWidth: 120 }}
                    >
                      MetaMask
                    </button>
                    <button
                      className={walletProvider === "walletconnect" ? "btn primary" : "btn"}
                      onClick={() => setWalletProvider("walletconnect")}
                      disabled={isConnecting}
                      type="button"
                      style={{ flex: 1, minWidth: 120 }}
                    >
                      WalletConnect
                    </button>
                    <button
                      className={walletProvider === "coinbase" ? "btn primary" : "btn"}
                      onClick={() => setWalletProvider("coinbase")}
                      disabled={isConnecting}
                      type="button"
                      style={{ flex: 1, minWidth: 120 }}
                    >
                      Coinbase
                    </button>
                  </div>
                  <button
                    className="btn primary"
                    onClick={() => connectWallet(walletProvider)}
                    disabled={isConnecting}
                    style={{ width: "100%" }}
                    type="button"
                  >
                    {isConnecting ? "Connecting..." : "Connect Wallet"}
                  </button>
                </div>
              </div>
            </div>
          ) : profileState.isLoading ? (
            <div className="card" style={{ padding: 24, maxWidth: 980 }}>
              <div style={{ textAlign: "center", color: "var(--muted)" }}>Loading wallet setup…</div>
            </div>
          ) : profileState.error ? (
            <div className="card" style={{ padding: 24, borderColor: "var(--red)", maxWidth: 980 }}>
              <div style={{ color: "var(--red)" }}>{profileState.error}</div>
            </div>
          ) : profileState.walletAddress && profileState.walletAddress.toLowerCase() !== address?.toLowerCase?.() ? (
            <div className="card" style={{ padding: 24, borderColor: "var(--yellow)", maxWidth: 980 }}>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Wrong wallet connected</div>
              <div style={{ color: "var(--muted)", marginBottom: 16 }}>
                This account is linked to {truncateAddress(profileState.walletAddress)}. Switch your wallet to continue.
              </div>
              <button className="btn" onClick={disconnectWallet} type="button">
                Disconnect Wallet
              </button>
            </div>
          ) : !profileState.walletAddress ? (
            <div className="card" style={{ padding: 24, maxWidth: 980 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Link your wallet</div>
                  <div style={{ color: "var(--muted)", marginBottom: 10 }}>
                    Step 2 of 2: sign a message to link {truncateAddress(address)} to your account.
                  </div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                    Signing is free and does not send a transaction.
                  </div>
                </div>
                <div className="card" style={{ padding: 12, minWidth: 260 }}>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Connected wallet</div>
                  <div style={{ fontFamily: "monospace", fontSize: 13, wordBreak: "break-all" }}>{address}</div>
                </div>
              </div>
              {linkStatus.error ? <div style={{ color: "var(--red)", marginBottom: 12 }}>{linkStatus.error}</div> : null}
              <button className="btn primary" onClick={linkWallet} disabled={linkStatus.isLoading} style={{ width: "100%", marginTop: 14 }} type="button">
                {linkStatus.isLoading ? "Linking..." : "Link Wallet"}
              </button>
            </div>
          ) : (
            <div>
              <div style={{ maxWidth: 980 }}>
                <div
                  className="card"
                  style={{
                    padding: 12,
                    marginBottom: 14,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                    Linked wallet: <span style={{ fontFamily: "monospace", color: "var(--text)" }}>{truncateAddress(profileState.walletAddress)}</span>
                  </div>
                  <button className="btn" type="button" onClick={() => window.dispatchEvent(new Event("cosmos:wallet:refetch"))} style={{ padding: "4px 8px", fontSize: 12 }}>
                    Refresh
                  </button>
                </div>

                <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
                <button
                  className={activeTab === "balance" ? "btn primary" : "btn"}
                  onClick={() => setActiveTab("balance")}
                  type="button"
                >
                  Balance
                </button>
                <button
                  className={activeTab === "deposit" ? "btn primary" : "btn"}
                  onClick={() => setActiveTab("deposit")}
                  type="button"
                >
                  Deposit
                </button>
                <button
                  className={activeTab === "withdraw" ? "btn primary" : "btn"}
                  onClick={() => setActiveTab("withdraw")}
                  type="button"
                >
                  Withdraw
                </button>
                <button
                  className={activeTab === "transactions" ? "btn primary" : "btn"}
                  onClick={() => setActiveTab("transactions")}
                  type="button"
                >
                  Transactions
                </button>
                <button
                  className={activeTab === "nfts" ? "btn primary" : "btn"}
                  onClick={() => setActiveTab("nfts")}
                  type="button"
                >
                  NFTs
                </button>
              </div>

              {activeTab === "balance" && (
                <div style={{ display: "grid", gap: 14 }}>
                  <WalletBalanceCard />
                </div>
              )}

              {activeTab === "deposit" && (
                <div style={{ display: "grid", gap: 14, maxWidth: 740 }}>
                  <div className="card" style={{ padding: 14 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Deposits require admin approval</div>
                    <div style={{ color: "var(--muted)", fontSize: 13 }}>
                      After your on-chain transfer confirms, it will appear as pending until an admin approves it.
                    </div>
                  </div>
                  <DepositForm onDepositSuccess={handleDepositSuccess} />
                </div>
              )}

              {activeTab === "withdraw" && (
                <div style={{ maxWidth: 740 }}>
                  <WithdrawForm onWithdrawSuccess={handleWithdrawSuccess} />
                </div>
              )}

              {activeTab === "transactions" && (
                <div style={{ maxWidth: 980 }}>
                  <TransactionList />
                </div>
              )}

              {activeTab === "nfts" && (
                <div style={{ maxWidth: 980 }}>
                  {virtualAssetsState.isLoading ? (
                    <div className="card" style={{ padding: 24, color: "var(--muted)" }}>
                      Loading your NFTs...
                    </div>
                  ) : virtualAssetsState.error ? (
                    <div className="card" style={{ padding: 24, borderColor: "var(--red)" }}>
                      <div style={{ color: "var(--red)" }}>{virtualAssetsState.error}</div>
                    </div>
                  ) : virtualAssets.length === 0 ? (
                    <div className="card" style={{ padding: 24, color: "var(--muted)" }}>
                      No NFTs in your virtual wallet yet. <Link href="/mint" style={{ color: "var(--primary)" }}>Mint one now!</Link>
                    </div>
                  ) : (
                    <div className="grid">
                      {virtualAssets.map((a) => (
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
                            <div className="sub">{a.collection || "Cosmos Virtual Collection"}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </ProtectedRoute>
  );
}
