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
import { truncateAddress, NFT_PLACEHOLDER_SRC } from "../../lib/utils";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

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

  const pageVariants = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  };

  const contentVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.16, ease: [0.22, 1, 0.36, 1] } },
  };

  const tabButtonMotion = {
    whileHover: { y: -1, filter: "brightness(1.04)" },
    whileTap: { scale: 0.98 },
  };

  const renderTab = () => {
    if (activeTab === "balance") {
      return (
        <div style={{ display: "grid", gap: 14 }}>
          <WalletBalanceCard
            onSend={() => setActiveTab("withdraw")}
            onRequest={() => setActiveTab("deposit")}
            onSeeMoreTransactions={() => setActiveTab("transactions")}
          />
        </div>
      );
    }

    if (activeTab === "deposit") {
      return (
        <div style={{ display: "grid", gap: 14, maxWidth: 740 }}>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Deposits require admin approval</div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              After your on-chain transfer confirms, it will appear as pending until an admin approves it.
            </div>
          </div>
          <DepositForm onDepositSuccess={handleDepositSuccess} />
        </div>
      );
    }

    if (activeTab === "withdraw") {
      return (
        <div style={{ maxWidth: 740 }}>
          <WithdrawForm onWithdrawSuccess={handleWithdrawSuccess} />
        </div>
      );
    }

    if (activeTab === "transactions") {
      return (
        <div style={{ maxWidth: 980 }}>
          <TransactionList />
        </div>
      );
    }

    if (activeTab === "nfts") {
      return (
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
              No NFTs in your virtual wallet yet.{" "}
              <Link href="/mint" style={{ color: "var(--primary)" }}>
                Mint one now!
              </Link>
            </div>
          ) : (
            <div className="grid">
              {virtualAssets.map((a, idx) => (
                <Link
                  key={`${a.contractAddress}-${a.tokenId}`}
                  href={`/asset/${a.contractAddress}/${a.tokenId}`}
                  className="card nft-card"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: Math.min(0.18, idx * 0.02), ease: [0.22, 1, 0.36, 1] }}
                  >
                    <img
                      src={a.image || NFT_PLACEHOLDER_SRC}
                      alt={a.name || `NFT #${a.tokenId}`}
                      onError={(e) => {
                        e.currentTarget.src = NFT_PLACEHOLDER_SRC;
                      }}
                    />
                    <div className="meta">
                      <div className="title">{a.name || `NFT #${a.tokenId}`}</div>
                      <div className="sub">{a.collection || "Cosmos Virtual Collection"}</div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <ProtectedRoute>
      <NavBar />
      <main className="container">
        <motion.div className="section" initial="hidden" animate="show" variants={pageVariants}>
          <div style={{ position: "relative", maxWidth: 980 }}>
            <motion.div
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              style={{ position: "absolute", inset: -90, pointerEvents: "none", filter: "blur(26px)", opacity: 0.85 }}
            >
              <motion.div
                aria-hidden
                animate={{ x: [0, 24, 0], y: [0, -18, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: "absolute",
                  top: 40,
                  left: 40,
                  width: 260,
                  height: 260,
                  borderRadius: 999,
                  background: "radial-gradient(circle at 35% 30%, rgba(45, 212, 191, 0.55), transparent 65%)",
                }}
              />
              <motion.div
                aria-hidden
                animate={{ x: [0, -22, 0], y: [0, 16, 0] }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: "absolute",
                  top: 10,
                  right: 30,
                  width: 300,
                  height: 300,
                  borderRadius: 999,
                  background: "radial-gradient(circle at 30% 35%, rgba(124, 58, 237, 0.48), transparent 62%)",
                }}
              />
            </motion.div>

            <div
              style={{
                position: "relative",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 20,
              }}
            >
              <div>
                <h1 style={{ margin: 0 }}>My Wallet</h1>
                <div style={{ color: "var(--muted)", marginTop: 6 }}>
                  Virtual balance, deposits, withdrawals, and transaction history.
                </div>
              </div>

              <AnimatePresence>
                {isConnected && address ? (
                  <motion.div
                    key="connected"
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="card"
                    style={{
                      padding: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                      background:
                        "radial-gradient(900px 220px at 0% 0%, rgba(45, 212, 191, 0.10), transparent 60%), var(--bg-elev)",
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
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!isConnected ? (
              <motion.div
                key="connect"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="card"
                style={{
                  padding: 24,
                  maxWidth: 980,
                  background: "radial-gradient(900px 220px at 0% 0%, rgba(124, 58, 237, 0.12), transparent 60%), var(--bg-elev)",
                }}
              >
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
                      <motion.button
                        {...tabButtonMotion}
                        className={walletProvider === "metamask" ? "btn primary" : "btn"}
                        onClick={() => setWalletProvider("metamask")}
                        disabled={isConnecting}
                        type="button"
                        style={{ flex: "1 1 120px", minWidth: 0 }}
                      >
                        MetaMask
                      </motion.button>
                      <motion.button
                        {...tabButtonMotion}
                        className={walletProvider === "walletconnect" ? "btn primary" : "btn"}
                        onClick={() => setWalletProvider("walletconnect")}
                        disabled={isConnecting}
                        type="button"
                        style={{ flex: "1 1 120px", minWidth: 0 }}
                      >
                        WalletConnect
                      </motion.button>
                      <motion.button
                        {...tabButtonMotion}
                        className={walletProvider === "coinbase" ? "btn primary" : "btn"}
                        onClick={() => setWalletProvider("coinbase")}
                        disabled={isConnecting}
                        type="button"
                        style={{ flex: "1 1 120px", minWidth: 0 }}
                      >
                        Coinbase
                      </motion.button>
                    </div>
                    <motion.button
                      {...tabButtonMotion}
                      className="btn primary"
                      onClick={() => connectWallet(walletProvider)}
                      disabled={isConnecting}
                      style={{ width: "100%" }}
                      type="button"
                    >
                      {isConnecting ? "Connecting..." : "Connect Wallet"}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ) : profileState.isLoading ? (
              <motion.div
                key="profile-loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="card"
                style={{ padding: 24, maxWidth: 980 }}
              >
                <motion.div
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: 1 }}
                  transition={{ repeat: Infinity, repeatType: "reverse", duration: 0.8 }}
                  style={{ height: 10, background: "rgba(45, 212, 191, 0.35)", borderRadius: 999 }}
                />
                <div style={{ marginTop: 10, textAlign: "center", color: "var(--muted)" }}>Loading wallet setup…</div>
              </motion.div>
            ) : profileState.error ? (
              <motion.div
                key="profile-error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="card"
                style={{ padding: 24, borderColor: "var(--red)", maxWidth: 980 }}
              >
                <div style={{ color: "var(--red)" }}>{profileState.error}</div>
              </motion.div>
            ) : profileState.walletAddress && profileState.walletAddress.toLowerCase() !== address?.toLowerCase?.() ? (
              <motion.div
                key="wrong-wallet"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="card"
                style={{ padding: 24, borderColor: "var(--yellow)", maxWidth: 980 }}
              >
                <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Wrong wallet connected</div>
                <div style={{ color: "var(--muted)", marginBottom: 16 }}>
                  This account is linked to {truncateAddress(profileState.walletAddress)}. Switch your wallet to continue.
                </div>
                <motion.button {...tabButtonMotion} className="btn" onClick={disconnectWallet} type="button">
                  Disconnect Wallet
                </motion.button>
              </motion.div>
            ) : !profileState.walletAddress ? (
              <motion.div
                key="link-wallet"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="card"
                style={{
                  padding: 24,
                  maxWidth: 980,
                  background: "radial-gradient(900px 220px at 0% 0%, rgba(45, 212, 191, 0.10), transparent 60%), var(--bg-elev)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "start" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Link your wallet</div>
                    <div style={{ color: "var(--muted)", marginBottom: 10 }}>
                      Step 2 of 2: sign a message to link {truncateAddress(address)} to your account.
                    </div>
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>Signing is free and does not send a transaction.</div>
                  </div>
                  <div
                    className="card"
                    style={{
                      padding: 12,
                      flex: "1 1 260px",
                      minWidth: 0,
                      background: "rgba(255, 255, 255, 0.03)",
                    }}
                  >
                    <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Connected wallet</div>
                    <div style={{ fontFamily: "monospace", fontSize: 13, wordBreak: "break-all" }}>{address}</div>
                  </div>
                </div>
                {linkStatus.error ? <div style={{ color: "var(--red)", marginBottom: 12 }}>{linkStatus.error}</div> : null}
                <motion.button
                  {...tabButtonMotion}
                  className="btn primary"
                  onClick={linkWallet}
                  disabled={linkStatus.isLoading}
                  style={{ width: "100%", marginTop: 14 }}
                  type="button"
                >
                  {linkStatus.isLoading ? "Linking..." : "Link Wallet"}
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="ready"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
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
                      background: "rgba(255, 255, 255, 0.03)",
                    }}
                  >
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>
                      Linked wallet: <span style={{ fontFamily: "monospace", color: "var(--text)" }}>{truncateAddress(profileState.walletAddress)}</span>
                    </div>
                    <motion.button
                      {...tabButtonMotion}
                      className="btn"
                      type="button"
                      onClick={() => window.dispatchEvent(new Event("cosmos:wallet:refetch"))}
                      style={{ padding: "4px 8px", fontSize: 12 }}
                    >
                      Refresh
                    </motion.button>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
                    <div className="wallet-tabs" role="tablist" aria-label="Wallet tabs">
                      <motion.button
                        {...tabButtonMotion}
                        className={`wallet-tab-btn${activeTab === "balance" ? " active" : ""}`}
                        onClick={() => setActiveTab("balance")}
                        type="button"
                        aria-selected={activeTab === "balance"}
                      >
                        Balance
                      </motion.button>
                      <motion.button
                        {...tabButtonMotion}
                        className={`wallet-tab-btn${activeTab === "deposit" ? " active" : ""}`}
                        onClick={() => setActiveTab("deposit")}
                        type="button"
                        aria-selected={activeTab === "deposit"}
                      >
                        Deposit
                      </motion.button>
                      <motion.button
                        {...tabButtonMotion}
                        className={`wallet-tab-btn${activeTab === "withdraw" ? " active" : ""}`}
                        onClick={() => setActiveTab("withdraw")}
                        type="button"
                        aria-selected={activeTab === "withdraw"}
                      >
                        Withdraw
                      </motion.button>
                      <motion.button
                        {...tabButtonMotion}
                        className={`wallet-tab-btn${activeTab === "transactions" ? " active" : ""}`}
                        onClick={() => setActiveTab("transactions")}
                        type="button"
                        aria-selected={activeTab === "transactions"}
                      >
                        Transactions
                      </motion.button>
                      <motion.button
                        {...tabButtonMotion}
                        className={`wallet-tab-btn${activeTab === "nfts" ? " active" : ""}`}
                        onClick={() => setActiveTab("nfts")}
                        type="button"
                        aria-selected={activeTab === "nfts"}
                      >
                        NFTs
                      </motion.button>
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div key={activeTab} variants={contentVariants} initial="hidden" animate="show" exit="exit">
                      {renderTab()}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>
      <Footer />
    </ProtectedRoute>
  );
}
