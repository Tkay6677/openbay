"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { truncateAddress, handleTransactionError } from "../lib/utils";
import { useMinting } from "../lib/hooks/useMinting";
import { useWalletConnection } from "../lib/hooks/useWallet";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function formatEth(value) {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(n)) return "0.0000";
  return n.toFixed(4);
}

export default function AdminDashboard() {
  const tabs = useMemo(
    () => [
      { key: "users", label: "Users" },
      { key: "transactions", label: "Transactions" },
      { key: "withdrawals", label: "Withdrawals" },
      { key: "featuredAssets", label: "Featured NFTs" },
      { key: "featuredCollections", label: "Featured Collections" },
      { key: "heroBanners", label: "Hero Carousel" },
      { key: "mint", label: "Mint NFT" },
      { key: "seed", label: "Seed DB" },
    ],
    []
  );

  const [activeTab, setActiveTab] = useState("users");
  const [globalError, setGlobalError] = useState(null);

  const [usersQuery, setUsersQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [adjustForm, setAdjustForm] = useState({ userId: "", mode: "delta", amount: "", reason: "" });
  const [adjustStatus, setAdjustStatus] = useState({ isLoading: false, error: null, success: null });

  const [txQuery, setTxQuery] = useState("");
  const [txType, setTxType] = useState("all");
  const [txStatus, setTxStatus] = useState("all");
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [approveDepositStatus, setApproveDepositStatus] = useState({ isLoading: false, error: null, success: null, txId: null });

  const [withdrawalStatusFilter, setWithdrawalStatusFilter] = useState("pending");
  const [withdrawals, setWithdrawals] = useState([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);
  const [processWithdrawalsStatus, setProcessWithdrawalsStatus] = useState({ isLoading: false, error: null, result: null });

  const [featuredAssets, setFeaturedAssets] = useState([]);
  const [featuredAssetsLoading, setFeaturedAssetsLoading] = useState(false);
  const [assetForm, setAssetForm] = useState({
    contractAddress: "",
    tokenId: "",
    name: "",
    collection: "",
    image: "",
    priceEth: "",
    owner: "",
    description: "",
    order: "0",
  });
  const [assetStatus, setAssetStatus] = useState({ isLoading: false, error: null, success: null });

  const [featuredCollections, setFeaturedCollections] = useState([]);
  const [featuredCollectionsLoading, setFeaturedCollectionsLoading] = useState(false);
  const [collectionForm, setCollectionForm] = useState({ name: "", image: "", floor: "0", delta: "0", order: "0" });
  const [collectionStatus, setCollectionStatus] = useState({ isLoading: false, error: null, success: null });

  const { isConnected } = useWalletConnection();
  const { mintNFTWithImage, isLoading: mintingLoading } = useMinting();
  const [mintForm, setMintForm] = useState({ name: "", description: "", category: "", rarity: "" });
  const [mintImageFile, setMintImageFile] = useState(null);
  const [mintImagePreview, setMintImagePreview] = useState(null);
  const [mintStatus, setMintStatus] = useState({ type: null, message: "" });
  const [seedStatus, setSeedStatus] = useState({ isLoading: false, error: null, success: null, result: null });

  const [heroBanners, setHeroBanners] = useState([]);
  const [heroBannersLoading, setHeroBannersLoading] = useState(false);
  const [heroBannerForm, setHeroBannerForm] = useState({
    key: "",
    title: "",
    by: "",
    image: "",
    order: "0",
    stat1Label: "",
    stat1Value: "",
    stat2Label: "",
    stat2Value: "",
    stat3Label: "",
    stat3Value: "",
    stat4Label: "",
    stat4Value: "",
  });
  const [heroBannerStatus, setHeroBannerStatus] = useState({ isLoading: false, error: null, success: null });

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    setGlobalError(null);
    try {
      const params = new URLSearchParams();
      if (usersQuery.trim()) params.set("q", usersQuery.trim());
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to fetch users");
      setUsers(data.users || []);
    } catch (e) {
      setGlobalError(e.message || "Failed to fetch users");
    } finally {
      setUsersLoading(false);
    }
  }, [usersQuery]);

  const fetchTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    setGlobalError(null);
    try {
      const params = new URLSearchParams();
      if (txQuery.trim()) params.set("q", txQuery.trim());
      if (txType && txType !== "all") params.set("type", txType);
      if (txStatus && txStatus !== "all") params.set("status", txStatus);
      const res = await fetch(`/api/admin/transactions?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to fetch transactions");
      setTransactions(data.transactions || []);
    } catch (e) {
      setGlobalError(e.message || "Failed to fetch transactions");
    } finally {
      setTransactionsLoading(false);
    }
  }, [txQuery, txType, txStatus]);

  const approveDeposit = useCallback(
    async (transactionId) => {
      setApproveDepositStatus({ isLoading: true, error: null, success: null, txId: transactionId });
      try {
        const res = await fetch("/api/admin/transactions", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ transactionId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to approve deposit");
        setApproveDepositStatus({ isLoading: false, error: null, success: "Deposit approved", txId: transactionId });
        fetchTransactions();
      } catch (e) {
        setApproveDepositStatus({ isLoading: false, error: e.message || "Failed to approve deposit", success: null, txId: transactionId });
      }
    },
    [fetchTransactions]
  );

  const fetchWithdrawals = useCallback(async () => {
    setWithdrawalsLoading(true);
    setGlobalError(null);
    try {
      const params = new URLSearchParams();
      if (withdrawalStatusFilter && withdrawalStatusFilter !== "all") params.set("status", withdrawalStatusFilter);
      const res = await fetch(`/api/admin/withdrawals?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to fetch withdrawals");
      setWithdrawals(data.withdrawals || []);
    } catch (e) {
      setGlobalError(e.message || "Failed to fetch withdrawals");
    } finally {
      setWithdrawalsLoading(false);
    }
  }, [withdrawalStatusFilter]);

  const fetchFeaturedAssets = useCallback(async () => {
    setFeaturedAssetsLoading(true);
    setGlobalError(null);
    try {
      const res = await fetch("/api/admin/featured-assets");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to fetch featured assets");
      setFeaturedAssets(data.assets || []);
    } catch (e) {
      setGlobalError(e.message || "Failed to fetch featured assets");
    } finally {
      setFeaturedAssetsLoading(false);
    }
  }, []);

  const fetchFeaturedCollections = useCallback(async () => {
    setFeaturedCollectionsLoading(true);
    setGlobalError(null);
    try {
      const res = await fetch("/api/admin/featured-collections");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to fetch featured collections");
      setFeaturedCollections(data.collections || []);
    } catch (e) {
      setGlobalError(e.message || "Failed to fetch featured collections");
    } finally {
      setFeaturedCollectionsLoading(false);
    }
  }, []);

  const fetchHeroBanners = useCallback(async () => {
    setHeroBannersLoading(true);
    setGlobalError(null);
    try {
      const res = await fetch("/api/admin/hero-banners");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to fetch hero banners");
      setHeroBanners(data.banners || []);
    } catch (e) {
      setGlobalError(e.message || "Failed to fetch hero banners");
    } finally {
      setHeroBannersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "users") fetchUsers();
    if (activeTab === "transactions") fetchTransactions();
    if (activeTab === "withdrawals") fetchWithdrawals();
    if (activeTab === "featuredAssets") fetchFeaturedAssets();
    if (activeTab === "featuredCollections") fetchFeaturedCollections();
    if (activeTab === "heroBanners") fetchHeroBanners();
  }, [activeTab, fetchFeaturedAssets, fetchFeaturedCollections, fetchTransactions, fetchUsers, fetchWithdrawals]);

  const submitAdjustBalance = async (e) => {
    e.preventDefault();
    setAdjustStatus({ isLoading: true, error: null, success: null });
    try {
      const res = await fetch("/api/admin/users/adjust-balance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: adjustForm.userId,
          mode: adjustForm.mode,
          amount: adjustForm.amount,
          reason: adjustForm.reason,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to adjust balance");
      setAdjustStatus({ isLoading: false, error: null, success: `Updated. New balance: ${formatEth(data.user?.virtualBalance)} ETH` });
      setAdjustForm({ userId: "", mode: "delta", amount: "", reason: "" });
      fetchUsers();
    } catch (err) {
      setAdjustStatus({ isLoading: false, error: err.message || "Failed to adjust balance", success: null });
    }
  };

  const submitFeaturedAsset = async (e) => {
    e.preventDefault();
    setAssetStatus({ isLoading: true, error: null, success: null });
    try {
      const res = await fetch("/api/admin/featured-assets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(assetForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save asset");
      setAssetStatus({ isLoading: false, error: null, success: "Saved" });
      setAssetForm({
        contractAddress: "",
        tokenId: "",
        name: "",
        collection: "",
        image: "",
        priceEth: "",
        owner: "",
        description: "",
        order: "0",
      });
      fetchFeaturedAssets();
    } catch (err) {
      setAssetStatus({ isLoading: false, error: err.message || "Failed to save asset", success: null });
    }
  };

  const deleteFeaturedAsset = async (id) => {
    setAssetStatus({ isLoading: true, error: null, success: null });
    try {
      const res = await fetch(`/api/admin/featured-assets?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete asset");
      setAssetStatus({ isLoading: false, error: null, success: "Deleted" });
      fetchFeaturedAssets();
    } catch (err) {
      setAssetStatus({ isLoading: false, error: err.message || "Failed to delete asset", success: null });
    }
  };

  const submitFeaturedCollection = async (e) => {
    e.preventDefault();
    setCollectionStatus({ isLoading: true, error: null, success: null });
    try {
      const res = await fetch("/api/admin/featured-collections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(collectionForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save collection");
      setCollectionStatus({ isLoading: false, error: null, success: "Saved" });
      setCollectionForm({ name: "", image: "", floor: "0", delta: "0", order: "0" });
      fetchFeaturedCollections();
    } catch (err) {
      setCollectionStatus({ isLoading: false, error: err.message || "Failed to save collection", success: null });
    }
  };

  const deleteFeaturedCollection = async (id) => {
    setCollectionStatus({ isLoading: true, error: null, success: null });
    try {
      const res = await fetch(`/api/admin/featured-collections?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete collection");
      setCollectionStatus({ isLoading: false, error: null, success: "Deleted" });
      fetchFeaturedCollections();
    } catch (err) {
      setCollectionStatus({ isLoading: false, error: err.message || "Failed to delete collection", success: null });
    }
  };

  const runProcessWithdrawals = async () => {
    setProcessWithdrawalsStatus({ isLoading: true, error: null, result: null });
    try {
      const res = await fetch("/api/admin/process-withdrawals?limit=10&minWaitMs=60000", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to process withdrawals");
      setProcessWithdrawalsStatus({ isLoading: false, error: null, result: data });
      fetchWithdrawals();
    } catch (err) {
      setProcessWithdrawalsStatus({ isLoading: false, error: err.message || "Failed to process withdrawals", result: null });
    }
  };

  const onMintImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    setMintImageFile(file);
    setMintStatus({ type: null, message: "" });
    if (!file) {
      setMintImagePreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setMintImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const submitMint = async (e) => {
    e.preventDefault();
    if (!isConnected) {
      setMintStatus({ type: "error", message: "Connect your wallet first" });
      return;
    }
    if (!mintImageFile) {
      setMintStatus({ type: "error", message: "Select an image" });
      return;
    }
    if (!mintForm.name || !mintForm.description) {
      setMintStatus({ type: "error", message: "Name and description are required" });
      return;
    }
    try {
      setMintStatus({ type: "loading", message: "Minting..." });
      const result = await mintNFTWithImage(mintImageFile, mintForm);
      setMintStatus({ type: "success", message: `Minted. Token ID: ${result.tokenId}` });
      setMintForm({ name: "", description: "", category: "", rarity: "" });
      setMintImageFile(null);
      setMintImagePreview(null);
    } catch (err) {
      setMintStatus({ type: "error", message: handleTransactionError(err) });
    }
  };

  const runSeed = async () => {
    setSeedStatus({ isLoading: true, error: null, success: null, result: null });
    try {
      const res = await fetch("/api/admin/seed", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to seed database");
      setSeedStatus({ isLoading: false, error: null, success: "Seeded database", result: data });
      fetchFeaturedAssets();
      fetchFeaturedCollections();
    } catch (err) {
      setSeedStatus({ isLoading: false, error: err.message || "Failed to seed database", success: null, result: null });
    }
  };

  const submitHeroBanner = async (e) => {
    e.preventDefault();
    setHeroBannerStatus({ isLoading: true, error: null, success: null });
    try {
      const stats = [
        { label: heroBannerForm.stat1Label, value: heroBannerForm.stat1Value },
        { label: heroBannerForm.stat2Label, value: heroBannerForm.stat2Value },
        { label: heroBannerForm.stat3Label, value: heroBannerForm.stat3Value },
        { label: heroBannerForm.stat4Label, value: heroBannerForm.stat4Value },
      ].filter((s) => String(s.label || "").trim() && String(s.value || "").trim());

      const payload = {
        key: heroBannerForm.key,
        title: heroBannerForm.title,
        by: heroBannerForm.by,
        image: heroBannerForm.image,
        order: heroBannerForm.order,
        stats,
      };

      const res = await fetch("/api/admin/hero-banners", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save hero banner");
      setHeroBannerStatus({ isLoading: false, error: null, success: "Saved" });
      setHeroBannerForm({
        key: "",
        title: "",
        by: "",
        image: "",
        order: "0",
        stat1Label: "",
        stat1Value: "",
        stat2Label: "",
        stat2Value: "",
        stat3Label: "",
        stat3Value: "",
        stat4Label: "",
        stat4Value: "",
      });
      fetchHeroBanners();
    } catch (err) {
      setHeroBannerStatus({ isLoading: false, error: err.message || "Failed to save hero banner", success: null });
    }
  };

  const deleteHeroBanner = async (id) => {
    setHeroBannerStatus({ isLoading: true, error: null, success: null });
    try {
      const res = await fetch(`/api/admin/hero-banners?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete hero banner");
      setHeroBannerStatus({ isLoading: false, error: null, success: "Deleted" });
      fetchHeroBanners();
    } catch (err) {
      setHeroBannerStatus({ isLoading: false, error: err.message || "Failed to delete hero banner", success: null });
    }
  };

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`btn ${activeTab === t.key ? "primary" : ""}`}
            onClick={() => {
              setActiveTab(t.key);
              setGlobalError(null);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {globalError ? (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, border: "1px solid var(--red)", color: "var(--red)" }}>
          {globalError}
        </div>
      ) : null}

      {activeTab === "users" ? (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              className="btn"
              style={{ cursor: "text", flex: "1 1 260px", minWidth: 0 }}
              value={usersQuery}
              onChange={(e) => setUsersQuery(e.target.value)}
              placeholder="Search users (email / name / wallet)"
            />
            <button className="btn" onClick={fetchUsers} disabled={usersLoading}>
              {usersLoading ? "Loading..." : "Refresh"}
            </button>
          </div>

          <form onSubmit={submitAdjustBalance} style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 700 }}>Adjust User Balance</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
              <input
                className="btn"
                style={{ cursor: "text" }}
                value={adjustForm.userId}
                onChange={(e) => setAdjustForm((s) => ({ ...s, userId: e.target.value }))}
                placeholder="User ID"
                required
              />
              <select
                className="btn"
                value={adjustForm.mode}
                onChange={(e) => setAdjustForm((s) => ({ ...s, mode: e.target.value }))}
                style={{ padding: "6px 12px" }}
              >
                <option value="delta">Adjust</option>
                <option value="set">Set</option>
              </select>
              <input
                className="btn"
                style={{ cursor: "text" }}
                value={adjustForm.amount}
                onChange={(e) => setAdjustForm((s) => ({ ...s, amount: e.target.value }))}
                placeholder={adjustForm.mode === "set" ? "Balance (e.g. 1.25)" : "Amount (e.g. 0.25 or -0.10)"}
                inputMode="decimal"
                required
              />
            </div>
            <input
              className="btn"
              style={{ cursor: "text" }}
              value={adjustForm.reason}
              onChange={(e) => setAdjustForm((s) => ({ ...s, reason: e.target.value }))}
              placeholder="Reason (optional)"
            />
            {adjustStatus.error ? <div style={{ color: "var(--red)" }}>{adjustStatus.error}</div> : null}
            {adjustStatus.success ? <div style={{ color: "var(--green)" }}>{adjustStatus.success}</div> : null}
            <button className="btn primary" type="submit" disabled={adjustStatus.isLoading}>
              {adjustStatus.isLoading ? "Updating..." : "Apply"}
            </button>
          </form>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            {users.length === 0 ? (
              <div style={{ color: "var(--muted)" }}>{usersLoading ? "Loading..." : "No users found"}</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {users.map((u) => (
                  <div
                    key={u.id}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--bg-secondary)",
                      display: "grid",
                      gap: 4,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700 }}>{u.email || u.name || u.id}</div>
                      <div style={{ color: "var(--muted)", fontSize: 12 }}>{u.provider || "—"}</div>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>ID: {u.id}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      Wallet: {u.walletAddress ? truncateAddress(u.walletAddress) : "—"}
                    </div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
                      <div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>Balance</div>
                        <div style={{ fontWeight: 700 }}>{formatEth(u.virtualBalance)} ETH</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>Deposited</div>
                        <div style={{ fontWeight: 700 }}>{formatEth(u.totalDeposited)} ETH</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>Withdrawn</div>
                        <div style={{ fontWeight: 700 }}>{formatEth(u.totalWithdrawn)} ETH</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>Created</div>
                        <div style={{ fontWeight: 700 }}>{formatDate(u.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {activeTab === "transactions" ? (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              className="btn"
              style={{ cursor: "text", flex: "1 1 260px", minWidth: 0 }}
              value={txQuery}
              onChange={(e) => setTxQuery(e.target.value)}
              placeholder="Search (wallet / txHash / description)"
            />
            <select className="btn" value={txType} onChange={(e) => setTxType(e.target.value)} style={{ padding: "6px 12px" }}>
              <option value="all">All types</option>
              <option value="deposit">deposit</option>
              <option value="withdrawal">withdrawal</option>
              <option value="purchase">purchase</option>
              <option value="sale">sale</option>
              <option value="platform_fee">platform_fee</option>
              <option value="royalty">royalty</option>
              <option value="refund">refund</option>
              <option value="admin_credit">admin_credit</option>
              <option value="admin_debit">admin_debit</option>
            </select>
            <select className="btn" value={txStatus} onChange={(e) => setTxStatus(e.target.value)} style={{ padding: "6px 12px" }}>
              <option value="all">All statuses</option>
              <option value="completed">completed</option>
              <option value="pending">pending</option>
              <option value="failed">failed</option>
              <option value="processing">processing</option>
            </select>
            <button className="btn" onClick={fetchTransactions} disabled={transactionsLoading}>
              {transactionsLoading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {transactions.length === 0 ? (
            <div style={{ color: "var(--muted)" }}>{transactionsLoading ? "Loading..." : "No transactions found"}</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--bg-secondary)",
                    display: "grid",
                    gap: 4,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 700 }}>{tx.type}</div>
                    <div style={{ color: "var(--muted)", fontSize: 12 }}>{formatDate(tx.createdAt)}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>User: {tx.userId ? truncateAddress(tx.userId) : "—"}</div>
                  {tx.txHash ? <div style={{ fontSize: 12, color: "var(--muted)" }}>Tx: {truncateAddress(tx.txHash)}</div> : null}
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6 }}>
                    <div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>Amount</div>
                      <div style={{ fontWeight: 700 }}>{formatEth(tx.amount)} ETH</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>Before</div>
                      <div style={{ fontWeight: 700 }}>{formatEth(tx.balanceBefore)} ETH</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>After</div>
                      <div style={{ fontWeight: 700 }}>{formatEth(tx.balanceAfter)} ETH</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>Status</div>
                      <div style={{ fontWeight: 700 }}>{tx.status || "—"}</div>
                    </div>
                  </div>
                  {tx.description ? <div style={{ fontSize: 12, color: "var(--muted)" }}>{tx.description}</div> : null}
                  {tx.type === "deposit" && tx.status === "pending" ? (
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
                      <button
                        className="btn primary"
                        onClick={() => approveDeposit(tx.id)}
                        disabled={approveDepositStatus.isLoading && approveDepositStatus.txId === tx.id}
                      >
                        {approveDepositStatus.isLoading && approveDepositStatus.txId === tx.id ? "Approving..." : "Approve Deposit"}
                      </button>
                      {approveDepositStatus.error && approveDepositStatus.txId === tx.id ? (
                        <div style={{ color: "var(--red)", fontSize: 12 }}>{approveDepositStatus.error}</div>
                      ) : null}
                      {approveDepositStatus.success && approveDepositStatus.txId === tx.id ? (
                        <div style={{ color: "var(--green)", fontSize: 12 }}>{approveDepositStatus.success}</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "withdrawals" ? (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select
              className="btn"
              value={withdrawalStatusFilter}
              onChange={(e) => setWithdrawalStatusFilter(e.target.value)}
              style={{ padding: "6px 12px" }}
            >
              <option value="pending">pending</option>
              <option value="processing">processing</option>
              <option value="completed">completed</option>
              <option value="failed">failed</option>
              <option value="all">all</option>
            </select>
            <button className="btn" onClick={fetchWithdrawals} disabled={withdrawalsLoading}>
              {withdrawalsLoading ? "Loading..." : "Refresh"}
            </button>
            <button className="btn primary" onClick={runProcessWithdrawals} disabled={processWithdrawalsStatus.isLoading}>
              {processWithdrawalsStatus.isLoading ? "Processing..." : "Process Pending Withdrawals"}
            </button>
          </div>

          {processWithdrawalsStatus.error ? <div style={{ color: "var(--red)" }}>{processWithdrawalsStatus.error}</div> : null}
          {processWithdrawalsStatus.result?.message ? (
            <div style={{ color: "var(--muted)" }}>{processWithdrawalsStatus.result.message}</div>
          ) : null}

          {withdrawals.length === 0 ? (
            <div style={{ color: "var(--muted)" }}>{withdrawalsLoading ? "Loading..." : "No withdrawals found"}</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {withdrawals.map((w) => (
                <div
                  key={w.id}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--bg-secondary)",
                    display: "grid",
                    gap: 4,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 700 }}>{formatEth(w.amount)} ETH</div>
                    <div style={{ color: "var(--muted)", fontSize: 12 }}>{w.status}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>User: {w.userId ? truncateAddress(w.userId) : "—"}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>To: {w.destinationAddress ? truncateAddress(w.destinationAddress) : "—"}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>Requested: {formatDate(w.requestedAt)}</div>
                  {w.txHash ? <div style={{ fontSize: 12, color: "var(--muted)" }}>Tx: {truncateAddress(w.txHash)}</div> : null}
                  {w.failureReason ? <div style={{ fontSize: 12, color: "var(--red)" }}>{w.failureReason}</div> : null}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "seed" ? (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ fontWeight: 700 }}>Seed Featured NFTs, Collections & Hero</div>
          <div style={{ color: "var(--muted)" }}>
            Inserts or updates sample featured NFTs/collections and hero carousel banners into MongoDB.
          </div>
          {seedStatus.error ? <div style={{ color: "var(--red)" }}>{seedStatus.error}</div> : null}
          {seedStatus.success ? <div style={{ color: "var(--green)" }}>{seedStatus.success}</div> : null}
          <button className="btn primary" onClick={runSeed} disabled={seedStatus.isLoading}>
            {seedStatus.isLoading ? "Seeding..." : "Seed Database"}
          </button>
          {seedStatus.result ? (
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Contract: {seedStatus.result.contractAddress || "—"} • Assets upserted:{" "}
              {seedStatus.result.assets?.upserted ?? 0} • Collections upserted: {seedStatus.result.collections?.upserted ?? 0} • Hero upserted:{" "}
              {seedStatus.result.heroBanners?.upserted ?? 0}
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "heroBanners" ? (
        <div style={{ display: "grid", gap: 16 }}>
          <form onSubmit={submitHeroBanner} style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 700 }}>Add / Update Hero Banner</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
              <input
                className="btn"
                style={{ cursor: "text" }}
                value={heroBannerForm.key}
                onChange={(e) => setHeroBannerForm((s) => ({ ...s, key: e.target.value }))}
                placeholder="Key (optional)"
              />
              <input
                className="btn"
                style={{ cursor: "text" }}
                value={heroBannerForm.order}
                onChange={(e) => setHeroBannerForm((s) => ({ ...s, order: e.target.value }))}
                placeholder="Order"
                inputMode="numeric"
              />
            </div>
            <input
              className="btn"
              style={{ cursor: "text" }}
              value={heroBannerForm.title}
              onChange={(e) => setHeroBannerForm((s) => ({ ...s, title: e.target.value }))}
              placeholder="Title"
              required
            />
            <input
              className="btn"
              style={{ cursor: "text" }}
              value={heroBannerForm.by}
              onChange={(e) => setHeroBannerForm((s) => ({ ...s, by: e.target.value }))}
              placeholder="By (optional)"
            />
            <input
              className="btn"
              style={{ cursor: "text" }}
              value={heroBannerForm.image}
              onChange={(e) => setHeroBannerForm((s) => ({ ...s, image: e.target.value }))}
              placeholder="Image URL"
              required
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
              <input
                className="btn"
                style={{ cursor: "text" }}
                value={heroBannerForm.stat1Label}
                onChange={(e) => setHeroBannerForm((s) => ({ ...s, stat1Label: e.target.value }))}
                placeholder="Stat 1 label"
              />
              <input
                className="btn"
                style={{ cursor: "text" }}
                value={heroBannerForm.stat1Value}
                onChange={(e) => setHeroBannerForm((s) => ({ ...s, stat1Value: e.target.value }))}
                placeholder="Stat 1 value"
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
              <input
                className="btn"
                style={{ cursor: "text" }}
                value={heroBannerForm.stat2Label}
                onChange={(e) => setHeroBannerForm((s) => ({ ...s, stat2Label: e.target.value }))}
                placeholder="Stat 2 label"
              />
              <input
                className="btn"
                style={{ cursor: "text" }}
                value={heroBannerForm.stat2Value}
                onChange={(e) => setHeroBannerForm((s) => ({ ...s, stat2Value: e.target.value }))}
                placeholder="Stat 2 value"
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
              <input
                className="btn"
                style={{ cursor: "text" }}
                value={heroBannerForm.stat3Label}
                onChange={(e) => setHeroBannerForm((s) => ({ ...s, stat3Label: e.target.value }))}
                placeholder="Stat 3 label"
              />
              <input
                className="btn"
                style={{ cursor: "text" }}
                value={heroBannerForm.stat3Value}
                onChange={(e) => setHeroBannerForm((s) => ({ ...s, stat3Value: e.target.value }))}
                placeholder="Stat 3 value"
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
              <input
                className="btn"
                style={{ cursor: "text" }}
                value={heroBannerForm.stat4Label}
                onChange={(e) => setHeroBannerForm((s) => ({ ...s, stat4Label: e.target.value }))}
                placeholder="Stat 4 label"
              />
              <input
                className="btn"
                style={{ cursor: "text" }}
                value={heroBannerForm.stat4Value}
                onChange={(e) => setHeroBannerForm((s) => ({ ...s, stat4Value: e.target.value }))}
                placeholder="Stat 4 value"
              />
            </div>
            {heroBannerStatus.error ? <div style={{ color: "var(--red)" }}>{heroBannerStatus.error}</div> : null}
            {heroBannerStatus.success ? <div style={{ color: "var(--green)" }}>{heroBannerStatus.success}</div> : null}
            <button className="btn primary" type="submit" disabled={heroBannerStatus.isLoading}>
              {heroBannerStatus.isLoading ? "Saving..." : "Save"}
            </button>
          </form>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <div style={{ fontWeight: 700 }}>Current Hero Banners</div>
              <button className="btn" onClick={fetchHeroBanners} disabled={heroBannersLoading}>
                {heroBannersLoading ? "Loading..." : "Refresh"}
              </button>
            </div>
            {heroBanners.length === 0 ? (
              <div style={{ color: "var(--muted)" }}>No hero banners</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {heroBanners.map((b) => (
                  <div key={b.id} style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-secondary)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700 }}>{b.title}</div>
                      <button className="btn" onClick={() => deleteHeroBanner(b.id)} disabled={heroBannerStatus.isLoading}>
                        Delete
                      </button>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>Key: {b.key}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>Order: {b.order ?? 0}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {activeTab === "featuredAssets" ? (
        <div style={{ display: "grid", gap: 16 }}>
          <form onSubmit={submitFeaturedAsset} style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 700 }}>Add / Update Featured NFT</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
              <input
                className="btn"
                style={{ cursor: "text" }}
                value={assetForm.contractAddress}
                onChange={(e) => setAssetForm((s) => ({ ...s, contractAddress: e.target.value }))}
                placeholder="Contract address"
                required
              />
              <input
                className="btn"
                style={{ cursor: "text" }}
                value={assetForm.tokenId}
                onChange={(e) => setAssetForm((s) => ({ ...s, tokenId: e.target.value }))}
                placeholder="Token ID"
                required
              />
            </div>
            <input
              className="btn"
              style={{ cursor: "text" }}
              value={assetForm.name}
              onChange={(e) => setAssetForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="Name"
              required
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
              <input
                className="btn"
                style={{ cursor: "text" }}
                value={assetForm.collection}
                onChange={(e) => setAssetForm((s) => ({ ...s, collection: e.target.value }))}
                placeholder="Collection name"
              />
              <input
                className="btn"
                style={{ cursor: "text" }}
                value={assetForm.owner}
                onChange={(e) => setAssetForm((s) => ({ ...s, owner: e.target.value }))}
                placeholder="Owner (optional)"
              />
            </div>
            <input
              className="btn"
              style={{ cursor: "text" }}
              value={assetForm.image}
              onChange={(e) => setAssetForm((s) => ({ ...s, image: e.target.value }))}
              placeholder="Image URL"
              required
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
              <input
                className="btn"
                style={{ cursor: "text" }}
                value={assetForm.priceEth}
                onChange={(e) => setAssetForm((s) => ({ ...s, priceEth: e.target.value }))}
                placeholder="Price (ETH)"
                inputMode="decimal"
              />
              <input
                className="btn"
                style={{ cursor: "text" }}
                value={assetForm.order}
                onChange={(e) => setAssetForm((s) => ({ ...s, order: e.target.value }))}
                placeholder="Order"
                inputMode="numeric"
              />
            </div>
            <textarea
              className="btn"
              style={{ cursor: "text", minHeight: 90, padding: 10 }}
              value={assetForm.description}
              onChange={(e) => setAssetForm((s) => ({ ...s, description: e.target.value }))}
              placeholder="Description (optional)"
            />
            {assetStatus.error ? <div style={{ color: "var(--red)" }}>{assetStatus.error}</div> : null}
            {assetStatus.success ? <div style={{ color: "var(--green)" }}>{assetStatus.success}</div> : null}
            <button className="btn primary" type="submit" disabled={assetStatus.isLoading}>
              {assetStatus.isLoading ? "Saving..." : "Save"}
            </button>
          </form>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <div style={{ fontWeight: 700 }}>Current Featured NFTs</div>
              <button className="btn" onClick={fetchFeaturedAssets} disabled={featuredAssetsLoading}>
                {featuredAssetsLoading ? "Loading..." : "Refresh"}
              </button>
            </div>
            {featuredAssets.length === 0 ? (
              <div style={{ color: "var(--muted)" }}>No featured assets</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {featuredAssets.map((a) => (
                  <div key={a.id} style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-secondary)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700 }}>{a.name}</div>
                      <button className="btn" onClick={() => deleteFeaturedAsset(a.id)} disabled={assetStatus.isLoading}>
                        Delete
                      </button>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      {truncateAddress(a.contractAddress)} / Token {a.tokenId}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>Order: {a.order ?? 0}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {activeTab === "featuredCollections" ? (
        <div style={{ display: "grid", gap: 16 }}>
          <form onSubmit={submitFeaturedCollection} style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 700 }}>Add / Update Featured Collection</div>
            <input
              className="btn"
              style={{ cursor: "text" }}
              value={collectionForm.name}
              onChange={(e) => setCollectionForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="Name"
              required
            />
            <input
              className="btn"
              style={{ cursor: "text" }}
              value={collectionForm.image}
              onChange={(e) => setCollectionForm((s) => ({ ...s, image: e.target.value }))}
              placeholder="Image URL"
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
              <input
                className="btn"
                style={{ cursor: "text" }}
                value={collectionForm.floor}
                onChange={(e) => setCollectionForm((s) => ({ ...s, floor: e.target.value }))}
                placeholder="Floor"
                inputMode="decimal"
              />
              <input
                className="btn"
                style={{ cursor: "text" }}
                value={collectionForm.delta}
                onChange={(e) => setCollectionForm((s) => ({ ...s, delta: e.target.value }))}
                placeholder="Delta %"
                inputMode="decimal"
              />
              <input
                className="btn"
                style={{ cursor: "text" }}
                value={collectionForm.order}
                onChange={(e) => setCollectionForm((s) => ({ ...s, order: e.target.value }))}
                placeholder="Order"
                inputMode="numeric"
              />
            </div>
            {collectionStatus.error ? <div style={{ color: "var(--red)" }}>{collectionStatus.error}</div> : null}
            {collectionStatus.success ? <div style={{ color: "var(--green)" }}>{collectionStatus.success}</div> : null}
            <button className="btn primary" type="submit" disabled={collectionStatus.isLoading}>
              {collectionStatus.isLoading ? "Saving..." : "Save"}
            </button>
          </form>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <div style={{ fontWeight: 700 }}>Current Featured Collections</div>
              <button className="btn" onClick={fetchFeaturedCollections} disabled={featuredCollectionsLoading}>
                {featuredCollectionsLoading ? "Loading..." : "Refresh"}
              </button>
            </div>
            {featuredCollections.length === 0 ? (
              <div style={{ color: "var(--muted)" }}>No featured collections</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {featuredCollections.map((c) => (
                  <div key={c.id} style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-secondary)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700 }}>{c.name}</div>
                      <button className="btn" onClick={() => deleteFeaturedCollection(c.id)} disabled={collectionStatus.isLoading}>
                        Delete
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 6 }}>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>Floor: {formatEth(c.floor)} ETH</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>Delta: {Number(c.delta || 0).toFixed(2)}%</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>Order: {c.order ?? 0}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {activeTab === "mint" ? (
        <div style={{ display: "grid", gap: 14, maxWidth: 680 }}>
          {mintStatus.message ? (
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background:
                  mintStatus.type === "error"
                    ? "rgba(239, 68, 68, 0.1)"
                    : mintStatus.type === "success"
                      ? "rgba(34, 197, 94, 0.1)"
                      : "rgba(45, 212, 191, 0.1)",
                color:
                  mintStatus.type === "error"
                    ? "var(--red)"
                    : mintStatus.type === "success"
                      ? "var(--green)"
                      : "var(--primary)",
                border: `1px solid ${
                  mintStatus.type === "error"
                    ? "var(--red)"
                    : mintStatus.type === "success"
                      ? "var(--green)"
                      : "var(--primary)"
                }`,
              }}
            >
              {mintStatus.message}
            </div>
          ) : null}

          {!isConnected ? (
            <div style={{ padding: 12, borderRadius: 8, border: "1px solid var(--red)", color: "var(--red)" }}>
              Connect your wallet to mint NFTs.
            </div>
          ) : null}

          <form onSubmit={submitMint} style={{ display: "grid", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Image *</div>
              <input type="file" accept="image/*" onChange={onMintImageChange} />
              {mintImagePreview ? (
                <img
                  src={mintImagePreview}
                  alt="Preview"
                  style={{ marginTop: 10, width: "100%", maxHeight: 320, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }}
                />
              ) : null}
            </div>

            <input
              className="btn"
              style={{ cursor: "text" }}
              value={mintForm.name}
              onChange={(e) => setMintForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="Name *"
              required
            />
            <textarea
              className="btn"
              style={{ cursor: "text", minHeight: 100, padding: 10 }}
              value={mintForm.description}
              onChange={(e) => setMintForm((s) => ({ ...s, description: e.target.value }))}
              placeholder="Description *"
              required
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
              <input
                className="btn"
                style={{ cursor: "text" }}
                value={mintForm.category}
                onChange={(e) => setMintForm((s) => ({ ...s, category: e.target.value }))}
                placeholder="Category"
              />
              <input
                className="btn"
                style={{ cursor: "text" }}
                value={mintForm.rarity}
                onChange={(e) => setMintForm((s) => ({ ...s, rarity: e.target.value }))}
                placeholder="Rarity"
              />
            </div>
            <button className="btn primary" type="submit" disabled={!isConnected || mintingLoading || !mintImageFile}>
              {mintingLoading ? "Minting..." : "Mint NFT"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
