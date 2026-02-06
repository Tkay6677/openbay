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

function isEthAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value || "").trim());
}

function SkeletonTable({ columns = 6, rows = 6, minWidth = 980 } = {}) {
  const cols = Array.from({ length: columns });
  const r = Array.from({ length: rows });
  // Responsive minWidth for mobile
  const responsiveMinWidth = typeof window !== "undefined" && window.innerWidth < 768 ? 650 : minWidth;
  
  return (
    <div
      style={{
        overflowX: "auto",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: 14,
        background: "rgba(0, 0, 0, 0.18)",
      }}
    >
      <table style={{ width: "100%", minWidth: responsiveMinWidth, borderCollapse: "separate", borderSpacing: 0 }}>
        <thead>
          <tr style={{ background: "rgba(255, 255, 255, 0.02)" }}>
            {cols.map((_, idx) => (
              <th key={idx} style={{ padding: "10px 12px" }}>
                <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,0.10)", width: `${40 + (idx % 3) * 18}%` }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {r.map((_, rowIdx) => (
            <tr key={rowIdx}>
              {cols.map((__, colIdx) => (
                <td key={colIdx} style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ height: 12, borderRadius: 10, background: "rgba(255,255,255,0.06)", width: `${55 + ((rowIdx + colIdx) % 4) * 10}%` }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminDashboard() {
  const tabs = useMemo(
    () => [
      { key: "users", label: "Users", icon: "👥" },
      { key: "transactions", label: "Transactions", icon: "💸" },
      { key: "withdrawals", label: "Withdrawals", icon: "💳" },
      { key: "platformWallet", label: "Platform Wallet", icon: "🏦" },
      { key: "items", label: "NFTs", icon: "🖼️" },
      { key: "collections", label: "Collections", icon: "📚" },
      { key: "featuredAssets", label: "Featured NFTs", icon: "⭐" },
      { key: "featuredCollections", label: "Featured Collections", icon: "🌟" },
      { key: "heroBanners", label: "Hero Carousel", icon: "🎠" },
      { key: "mint", label: "Mint NFT", icon: "✨" },
      { key: "seed", label: "Seed DB", icon: "🌱" },
    ],
    []
  );

  const [activeTab, setActiveTab] = useState("users");
  const [globalError, setGlobalError] = useState(null);

  const activeTabLabel = useMemo(() => {
    const found = tabs.find((t) => t.key === activeTab);
    return found?.label || "Admin";
  }, [activeTab, tabs]);

  const [usersQuery, setUsersQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [adjustForm, setAdjustForm] = useState({ userId: "", mode: "delta", amount: "", reason: "" });
  const [adjustStatus, setAdjustStatus] = useState({ isLoading: false, error: null, success: null });
  const [userEditForm, setUserEditForm] = useState({ userId: "", name: "", walletAddress: "" });
  const [userEditStatus, setUserEditStatus] = useState({ isLoading: false, error: null, success: null });

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

  const [platformWallet, setPlatformWallet] = useState(null);
  const [platformWalletLoading, setPlatformWalletLoading] = useState(false);
  const [platformWalletForm, setPlatformWalletForm] = useState({ address: "" });
  const [platformWalletStatus, setPlatformWalletStatus] = useState({ isLoading: false, error: null, success: null });

  const platformWalletCurrentAddress = platformWallet?.address || "";
  const platformWalletDraftAddress = String(platformWalletForm.address || "").trim();
  const platformWalletDraftValid = isEthAddress(platformWalletDraftAddress);
  const platformWalletDraftChanged =
    !!platformWalletDraftAddress &&
    platformWalletDraftAddress.toLowerCase() !== platformWalletCurrentAddress.toLowerCase();

  const [toasts, setToasts] = useState([]);
  const pushToast = useCallback((toast) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const next = {
      id,
      type: toast?.type || "info",
      message: toast?.message || "",
    };
    setToasts((prev) => [...prev, next].slice(-4));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, toast?.timeoutMs || 3600);
  }, []);

  const [confirmState, setConfirmState] = useState(null);
  const requestConfirm = useCallback(({ title, message, confirmText, tone } = {}) => {
    return new Promise((resolve) => {
      setConfirmState({
        title: title || "Confirm",
        message: message || "",
        confirmText: confirmText || "Confirm",
        tone: tone || "danger",
        resolve,
      });
    });
  }, []);

  const copyToClipboard = useCallback(
    async (text, successMessage = "Copied") => {
      try {
        await navigator.clipboard.writeText(String(text || ""));
        pushToast({ type: "success", message: successMessage });
      } catch (e) {
        pushToast({ type: "error", message: e?.message || "Copy failed" });
      }
    },
    [pushToast]
  );

  const [itemsQuery, setItemsQuery] = useState("");
  const [itemsStatusFilter, setItemsStatusFilter] = useState("all");
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemForm, setItemForm] = useState({
    contractAddress: "",
    tokenId: "",
    name: "",
    collection: "",
    image: "",
    priceEth: "0",
    ownerId: "",
    status: "owned",
    description: "",
  });
  const [itemStatus, setItemStatus] = useState({ isLoading: false, error: null, success: null });

  const [collectionsQuery, setCollectionsQuery] = useState("");
  const [collections, setCollections] = useState([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [adminCollectionForm, setAdminCollectionForm] = useState({
    contractAddress: "",
    name: "",
    description: "",
    image: "",
    creatorId: "",
    nextTokenId: "",
  });
  const [adminCollectionStatus, setAdminCollectionStatus] = useState({ isLoading: false, error: null, success: null });

  const [featuredAssets, setFeaturedAssets] = useState([]);
  const [featuredAssetsLoading, setFeaturedAssetsLoading] = useState(false);
  const [availableNFTs, setAvailableNFTs] = useState([]);
  const [availableNFTsLoading, setAvailableNFTsLoading] = useState(false);
  const [selectedNFTId, setSelectedNFTId] = useState("");
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
  const [availableCollections, setAvailableCollections] = useState([]);
  const [availableCollectionsLoading, setAvailableCollectionsLoading] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
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
  const [selectedBannerId, setSelectedBannerId] = useState("");
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
        pushToast({ type: "success", message: "Deposit approved" });
        fetchTransactions();
      } catch (e) {
        setApproveDepositStatus({ isLoading: false, error: e.message || "Failed to approve deposit", success: null, txId: transactionId });
        pushToast({ type: "error", message: e.message || "Failed to approve deposit" });
      }
    },
    [fetchTransactions, pushToast]
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

  const fetchPlatformWallet = useCallback(async () => {
    setPlatformWalletLoading(true);
    setGlobalError(null);
    try {
      const res = await fetch("/api/admin/platform-wallet");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to fetch platform wallet");
      setPlatformWallet({ address: data.address, chainId: data.chainId || 1 });
      setPlatformWalletForm({ address: data.address || "" });
    } catch (e) {
      setGlobalError(e.message || "Failed to fetch platform wallet");
    } finally {
      setPlatformWalletLoading(false);
    }
  }, []);

  const submitPlatformWallet = async (e) => {
    e.preventDefault();
    setPlatformWalletStatus({ isLoading: true, error: null, success: null });
    try {
      const res = await fetch("/api/admin/platform-wallet", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ platformWalletAddress: platformWalletForm.address }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update platform wallet address");
      setPlatformWalletStatus({ isLoading: false, error: null, success: "Updated" });
      setPlatformWallet({ address: data.address, chainId: data.chainId || 1 });
      setPlatformWalletForm({ address: data.address || "" });
      pushToast({ type: "success", message: "Platform wallet updated" });
    } catch (err) {
      setPlatformWalletStatus({ isLoading: false, error: err.message || "Failed to update platform wallet address", success: null });
      pushToast({ type: "error", message: err.message || "Failed to update platform wallet address" });
    }
  };

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

  const fetchItems = useCallback(async () => {
    setItemsLoading(true);
    setGlobalError(null);
    try {
      const params = new URLSearchParams();
      if (itemsQuery.trim()) params.set("q", itemsQuery.trim());
      if (itemsStatusFilter && itemsStatusFilter !== "all") params.set("status", itemsStatusFilter);
      const res = await fetch(`/api/admin/items?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to fetch items");
      setItems(data.items || []);
    } catch (e) {
      setGlobalError(e.message || "Failed to fetch items");
    } finally {
      setItemsLoading(false);
    }
  }, [itemsQuery, itemsStatusFilter]);

  const fetchAdminCollections = useCallback(async () => {
    setCollectionsLoading(true);
    setGlobalError(null);
    try {
      const params = new URLSearchParams();
      if (collectionsQuery.trim()) params.set("q", collectionsQuery.trim());
      const res = await fetch(`/api/admin/collections?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to fetch collections");
      setCollections(data.collections || []);
    } catch (e) {
      setGlobalError(e.message || "Failed to fetch collections");
    } finally {
      setCollectionsLoading(false);
    }
  }, [collectionsQuery]);

  const fetchAvailableNFTs = useCallback(async () => {
    setAvailableNFTsLoading(true);
    try {
      const res = await fetch("/api/admin/items?limit=1000");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to fetch NFTs");
      setAvailableNFTs(data.items || []);
    } catch (e) {
      pushToast({ type: "error", message: e.message || "Failed to fetch NFTs" });
    } finally {
      setAvailableNFTsLoading(false);
    }
  }, []);

  const fetchAvailableCollections = useCallback(async () => {
    setAvailableCollectionsLoading(true);
    try {
      const res = await fetch("/api/admin/collections?limit=1000");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to fetch collections");
      setAvailableCollections(data.collections || []);
    } catch (e) {
      pushToast({ type: "error", message: e.message || "Failed to fetch collections" });
    } finally {
      setAvailableCollectionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "users") fetchUsers();
    if (activeTab === "transactions") fetchTransactions();
    if (activeTab === "withdrawals") fetchWithdrawals();
    if (activeTab === "platformWallet") fetchPlatformWallet();
    if (activeTab === "items") fetchItems();
    if (activeTab === "collections") fetchAdminCollections();
    if (activeTab === "featuredAssets") {
      fetchFeaturedAssets();
      fetchAvailableNFTs();
    }
    if (activeTab === "featuredCollections") {
      fetchFeaturedCollections();
      fetchAvailableCollections();
    }
    if (activeTab === "heroBanners") fetchHeroBanners();
  }, [
    activeTab,
    fetchAdminCollections,
    fetchAvailableCollections,
    fetchAvailableNFTs,
    fetchFeaturedAssets,
    fetchFeaturedCollections,
    fetchHeroBanners,
    fetchItems,
    fetchPlatformWallet,
    fetchTransactions,
    fetchUsers,
    fetchWithdrawals,
  ]);

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

  const submitUserEdit = async (e) => {
    e.preventDefault();
    setUserEditStatus({ isLoading: true, error: null, success: null });
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: userEditForm.userId,
          name: userEditForm.name.trim() ? userEditForm.name : null,
          walletAddress: userEditForm.walletAddress.trim() ? userEditForm.walletAddress : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update user");
      setUserEditStatus({ isLoading: false, error: null, success: "Saved" });
      setUserEditForm({ userId: "", name: "", walletAddress: "" });
      fetchUsers();
    } catch (err) {
      setUserEditStatus({ isLoading: false, error: err.message || "Failed to update user", success: null });
    }
  };

  const deleteUser = async (id) => {
    const confirmed = await requestConfirm({
      title: "Delete user",
      message: "This will permanently delete the user record.",
      confirmText: "Delete",
      tone: "danger",
    });
    if (!confirmed) return;

    setUserEditStatus({ isLoading: true, error: null, success: null });
    try {
      const res = await fetch(`/api/admin/users?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete user");
      setUserEditStatus({ isLoading: false, error: null, success: "Deleted" });
      pushToast({ type: "success", message: "User deleted" });
      fetchUsers();
    } catch (err) {
      setUserEditStatus({ isLoading: false, error: err.message || "Failed to delete user", success: null });
      pushToast({ type: "error", message: err.message || "Failed to delete user" });
    }
  };

  const submitItem = async (e) => {
    e.preventDefault();
    setItemStatus({ isLoading: true, error: null, success: null });
    try {
      const res = await fetch("/api/admin/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(itemForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save item");
      setItemStatus({ isLoading: false, error: null, success: "Saved" });
      setItemForm({
        contractAddress: "",
        tokenId: "",
        name: "",
        collection: "",
        image: "",
        priceEth: "0",
        ownerId: "",
        status: "owned",
        description: "",
      });
      fetchItems();
    } catch (err) {
      setItemStatus({ isLoading: false, error: err.message || "Failed to save item", success: null });
    }
  };

  const deleteItem = async (id) => {
    const confirmed = await requestConfirm({
      title: "Delete item",
      message: "This will permanently delete the item record.",
      confirmText: "Delete",
      tone: "danger",
    });
    if (!confirmed) return;

    setItemStatus({ isLoading: true, error: null, success: null });
    try {
      const res = await fetch(`/api/admin/items?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete item");
      setItemStatus({ isLoading: false, error: null, success: "Deleted" });
      pushToast({ type: "success", message: "Item deleted" });
      fetchItems();
    } catch (err) {
      setItemStatus({ isLoading: false, error: err.message || "Failed to delete item", success: null });
      pushToast({ type: "error", message: err.message || "Failed to delete item" });
    }
  };

  const submitAdminCollection = async (e) => {
    e.preventDefault();
    setAdminCollectionStatus({ isLoading: true, error: null, success: null });
    try {
      const res = await fetch("/api/admin/collections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(adminCollectionForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save collection");
      setAdminCollectionStatus({ isLoading: false, error: null, success: "Saved" });
      setAdminCollectionForm({
        contractAddress: "",
        name: "",
        description: "",
        image: "",
        creatorId: "",
        nextTokenId: "",
      });
      fetchAdminCollections();
    } catch (err) {
      setAdminCollectionStatus({ isLoading: false, error: err.message || "Failed to save collection", success: null });
    }
  };

  const deleteAdminCollection = async (id) => {
    setAdminCollectionStatus({ isLoading: true, error: null, success: null });
    try {
      const res = await fetch(`/api/admin/collections?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete collection");
      setAdminCollectionStatus({ isLoading: false, error: null, success: "Deleted" });
      fetchAdminCollections();
    } catch (err) {
      setAdminCollectionStatus({ isLoading: false, error: err.message || "Failed to delete collection", success: null });
    }
  };

  const handleNFTSelect = (nftId) => {
    setSelectedNFTId(nftId);
    const nft = availableNFTs.find((n) => n.id === nftId);
    if (nft) {
      setAssetForm({
        contractAddress: nft.contractAddress || "",
        tokenId: nft.tokenId || "",
        name: nft.name || "",
        collection: nft.collection || "",
        image: nft.image || "",
        priceEth: String(nft.priceEth || 0),
        owner: nft.owner || nft.ownerId || "",
        description: nft.description || "",
        order: "0",
      });
    }
  };

  const submitFeaturedAsset = async (e) => {
    e.preventDefault();
    if (!selectedNFTId) {
      setAssetStatus({ isLoading: false, error: "Please select an NFT", success: null });
      return;
    }
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
      setSelectedNFTId("");
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
    const confirmed = await requestConfirm({
      title: "Delete featured NFT",
      message: "This will remove the NFT from the featured list.",
      confirmText: "Delete",
      tone: "danger",
    });
    if (!confirmed) return;

    setAssetStatus({ isLoading: true, error: null, success: null });
    try {
      const res = await fetch(`/api/admin/featured-assets?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete asset");
      setAssetStatus({ isLoading: false, error: null, success: "Deleted" });
      pushToast({ type: "success", message: "Featured NFT deleted" });
      fetchFeaturedAssets();
    } catch (err) {
      setAssetStatus({ isLoading: false, error: err.message || "Failed to delete asset", success: null });
      pushToast({ type: "error", message: err.message || "Failed to delete asset" });
    }
  };

  const handleCollectionSelect = (collectionId) => {
    setSelectedCollectionId(collectionId);
    const collection = availableCollections.find((c) => c.id === collectionId);
    if (collection) {
      setCollectionForm({
        name: collection.name || "",
        image: collection.image || "",
        floor: "0",
        delta: "0",
        order: "0",
      });
    }
  };

  const submitFeaturedCollection = async (e) => {
    e.preventDefault();
    if (!selectedCollectionId) {
      setCollectionStatus({ isLoading: false, error: "Please select a collection", success: null });
      return;
    }
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
      setSelectedCollectionId("");
      setCollectionForm({ name: "", image: "", floor: "0", delta: "0", order: "0" });
      fetchFeaturedCollections();
    } catch (err) {
      setCollectionStatus({ isLoading: false, error: err.message || "Failed to save collection", success: null });
    }
  };

  const deleteFeaturedCollection = async (id) => {
    const confirmed = await requestConfirm({
      title: "Delete featured collection",
      message: "This will remove the collection from the featured list.",
      confirmText: "Delete",
      tone: "danger",
    });
    if (!confirmed) return;

    setCollectionStatus({ isLoading: true, error: null, success: null });
    try {
      const res = await fetch(`/api/admin/featured-collections?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete collection");
      setCollectionStatus({ isLoading: false, error: null, success: "Deleted" });
      pushToast({ type: "success", message: "Featured collection deleted" });
      fetchFeaturedCollections();
    } catch (err) {
      setCollectionStatus({ isLoading: false, error: err.message || "Failed to delete collection", success: null });
      pushToast({ type: "error", message: err.message || "Failed to delete collection" });
    }
  };

  const runProcessWithdrawals = async () => {
    const confirmed = await requestConfirm({
      title: "Process withdrawals",
      message: "This will attempt to process pending withdrawals from the platform wallet.",
      confirmText: "Process",
      tone: "info",
    });
    if (!confirmed) return;

    setProcessWithdrawalsStatus({ isLoading: true, error: null, result: null });
    try {
      const res = await fetch("/api/admin/process-withdrawals?limit=10&minWaitMs=60000", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to process withdrawals");
      setProcessWithdrawalsStatus({ isLoading: false, error: null, result: data });
      pushToast({ type: "success", message: data.message || "Processed withdrawals" });
      fetchWithdrawals();
    } catch (err) {
      setProcessWithdrawalsStatus({ isLoading: false, error: err.message || "Failed to process withdrawals", result: null });
      pushToast({ type: "error", message: err.message || "Failed to process withdrawals" });
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
      setHeroBannerStatus({ isLoading: false, error: null, success: selectedBannerId ? "Updated" : "Created" });
      setSelectedBannerId("");
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
    const confirmed = await requestConfirm({
      title: "Delete hero banner",
      message: "This will remove the banner from the hero carousel.",
      confirmText: "Delete",
      tone: "danger",
    });
    if (!confirmed) return;

    setHeroBannerStatus({ isLoading: true, error: null, success: null });
    try {
      const res = await fetch(`/api/admin/hero-banners?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete hero banner");
      setHeroBannerStatus({ isLoading: false, error: null, success: "Deleted" });
      pushToast({ type: "success", message: "Hero banner deleted" });
      fetchHeroBanners();
    } catch (err) {
      setHeroBannerStatus({ isLoading: false, error: err.message || "Failed to delete hero banner", success: null });
      pushToast({ type: "error", message: err.message || "Failed to delete hero banner" });
    }
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-top">
          <div className="admin-sidebar-title">Admin</div>
        </div>
        <div className="admin-tabs">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`admin-tab ${activeTab === t.key ? "active" : ""}`}
              onClick={() => {
                setActiveTab(t.key);
                setGlobalError(null);
              }}
              type="button"
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </aside>

      <div className="admin-main">
        <div className="admin-toolbar">
          <div className="admin-toolbar-title">{activeTabLabel}</div>
        </div>

        {globalError ? <div className="admin-alert error">{globalError}</div> : null}

        <div className="admin-content">

      {activeTab === "users" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
            <input
              className="admin-form-input"
              style={{ flex: "1 1 260px", minWidth: 0 }}
              value={usersQuery}
              onChange={(e) => setUsersQuery(e.target.value)}
              placeholder="Search users (email / name / wallet)"
            />
            <button className="btn" onClick={fetchUsers} disabled={usersLoading}>
              {usersLoading ? "Loading..." : "Refresh"}
            </button>
          </div>

          <form onSubmit={submitAdjustBalance} className="admin-card" style={{ display: "grid", gap: 16,}}>
            <div className="admin-form-label">Adjust User Balance</div>
            <div className="admin-form-group" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
              <input
                className="admin-form-input"
                value={adjustForm.userId}
                onChange={(e) => setAdjustForm((s) => ({ ...s, userId: e.target.value }))}
                placeholder="User ID"
                required
              />
              <select
                className="admin-form-input"
                value={adjustForm.mode}
                onChange={(e) => setAdjustForm((s) => ({ ...s, mode: e.target.value }))}
              >
                <option value="delta">Adjust</option>
                <option value="set">Set</option>
              </select>
              <input
                className="admin-form-input"
                value={adjustForm.amount}
                onChange={(e) => setAdjustForm((s) => ({ ...s, amount: e.target.value }))}
                placeholder={adjustForm.mode === "set" ? "Balance (e.g. 1.25)" : "Amount (e.g. 0.25 or -0.10)"}
                inputMode="decimal"
                required
              />
            </div>
            <input
              className="admin-form-input"
              value={adjustForm.reason}
              onChange={(e) => setAdjustForm((s) => ({ ...s, reason: e.target.value }))}
              placeholder="Reason (optional)"
            />
            {adjustStatus.error ? <div className="admin-alert error">{adjustStatus.error}</div> : null}
            {adjustStatus.success ? <div className="admin-alert success">{adjustStatus.success}</div> : null}
            <button className="btn primary" type="submit" disabled={adjustStatus.isLoading}>
              {adjustStatus.isLoading ? "Updating..." : "Apply"}
            </button>
          </form>

          <form onSubmit={submitUserEdit} className="admin-card" style={{ display: "grid", gap: 16 }}>
            <div className="admin-form-label">Update User</div>
            <div className="admin-form-group" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
              <input
                className="admin-form-input"
                value={userEditForm.userId}
                onChange={(e) => setUserEditForm((s) => ({ ...s, userId: e.target.value }))}
                placeholder="User ID"
                required
              />
              <input
                className="admin-form-input"
                value={userEditForm.name}
                onChange={(e) => setUserEditForm((s) => ({ ...s, name: e.target.value }))}
                placeholder="Name (optional)"
              />
              <input
                className="admin-form-input"
                value={userEditForm.walletAddress}
                onChange={(e) => setUserEditForm((s) => ({ ...s, walletAddress: e.target.value }))}
                placeholder="Wallet address (optional)"
              />
            </div>
            {userEditStatus.error ? <div className="admin-alert error">{userEditStatus.error}</div> : null}
            {userEditStatus.success ? <div className="admin-alert success">{userEditStatus.success}</div> : null}
            <button className="btn primary" type="submit" disabled={userEditStatus.isLoading}>
              {userEditStatus.isLoading ? "Saving..." : "Save"}
            </button>
          </form>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            {users.length === 0 ? (
              usersLoading ? (
                <SkeletonTable columns={7} rows={6} minWidth={980} />
              ) : (
                <div className="admin-card" style={{ display: "grid", gap: 10 }}>
                  <div style={{ fontWeight: 800 }}>No users found</div>
                  <div style={{ color: "rgba(255,255,255,0.60)", fontSize: 13 }}>Try a different search query.</div>
                  {usersQuery.trim() ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        className="btn"
                        type="button"
                        onClick={() => {
                          setUsersQuery("");
                          fetchUsers();
                        }}
                      >
                        Clear search
                      </button>
                    </div>
                  ) : null}
                </div>
              )
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table" style={{ minWidth: typeof window !== "undefined" && window.innerWidth < 768 ? 650 : 980 }}>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Wallet</th>
                      <th style={{ textAlign: "right" }}>Balance</th>
                      <th style={{ textAlign: "right" }}>Deposited</th>
                      <th style={{ textAlign: "right" }}>Withdrawn</th>
                      <th>Created</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div style={{ fontWeight: 800, fontSize: 13 }}>{u.email || u.name || u.id}</div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
                            {u.provider || "—"} · <span style={{ fontFamily: "monospace" }}>{u.id}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontFamily: "monospace", fontSize: 12 }}>
                            {u.walletAddress ? truncateAddress(u.walletAddress) : "—"}
                          </div>
                        </td>
                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          {formatEth(u.virtualBalance)} ETH
                        </td>
                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          {formatEth(u.totalDeposited)} ETH
                        </td>
                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          {formatEth(u.totalWithdrawn)} ETH
                        </td>
                        <td style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
                          {formatDate(u.createdAt)}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                            <button
                              className="btn"
                              type="button"
                              onClick={() => setUserEditForm({ userId: u.id, name: u.name || "", walletAddress: u.walletAddress || "" })}
                            >
                              Edit
                            </button>
                            <button className="btn" type="button" onClick={() => deleteUser(u.id)} disabled={userEditStatus.isLoading}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
            transactionsLoading ? (
              <SkeletonTable columns={7} rows={7} minWidth={980} />
            ) : (
              <div style={{ display: "grid", gap: 10, padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.18)" }}>
                <div style={{ fontWeight: 800 }}>No transactions found</div>
                <div style={{ color: "rgba(255,255,255,0.60)", fontSize: 13 }}>Try adjusting filters or clearing the search.</div>
                {txQuery.trim() || txType !== "all" || txStatus !== "all" ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      className="btn"
                      type="button"
                      onClick={() => {
                        setTxQuery("");
                        setTxType("all");
                        setTxStatus("all");
                        fetchTransactions();
                      }}
                    >
                      Clear filters
                    </button>
                  </div>
                ) : null}
              </div>
            )
          ) : (
            <div
              style={{
                overflowX: "auto",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 14,
                background: "rgba(0, 0, 0, 0.18)",
              }}
            >
              <table style={{ width: "100%", minWidth: typeof window !== "undefined" && window.innerWidth < 768 ? 650 : 980, borderCollapse: "separate", borderSpacing: 0 }}>
                <thead>
                  <tr style={{ background: "rgba(255, 255, 255, 0.02)" }}>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      Type
                    </th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      User
                    </th>
                    <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      Amount
                    </th>
                    <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      Status
                    </th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      Tx Hash
                    </th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      Created
                    </th>
                    <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, idx) => (
                    <tr key={tx.id}>
                      <td style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ fontWeight: 800, fontSize: 13 }}>{tx.type}</div>
                        {tx.description ? <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>{tx.description}</div> : null}
                      </td>
                      <td style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ fontFamily: "monospace", fontSize: 12 }}>{tx.userId ? truncateAddress(tx.userId) : "—"}</div>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", borderTop: "1px solid rgba(255,255,255,0.06)", fontVariantNumeric: "tabular-nums" }}>
                        {formatEth(tx.amount)} ETH
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", borderTop: "1px solid rgba(255,255,255,0.06)", fontWeight: 700 }}>
                        {tx.status || "—"}
                      </td>
                      <td style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ fontFamily: "monospace", fontSize: 12 }}>{tx.txHash ? truncateAddress(tx.txHash) : "—"}</div>
                      </td>
                      <td style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
                        {formatDate(tx.createdAt)}
                      </td>
                      <td style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "right" }}>
                        {tx.type === "deposit" && tx.status === "pending" ? (
                          <div style={{ display: "inline-flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                            <button
                              className="btn primary"
                              onClick={() => approveDeposit(tx.id)}
                              disabled={approveDepositStatus.isLoading && approveDepositStatus.txId === tx.id}
                            >
                              {approveDepositStatus.isLoading && approveDepositStatus.txId === tx.id ? "Approving..." : "Approve"}
                            </button>
                            {approveDepositStatus.error && approveDepositStatus.txId === tx.id ? (
                              <div style={{ color: "var(--red)", fontSize: 12 }}>{approveDepositStatus.error}</div>
                            ) : null}
                            {approveDepositStatus.success && approveDepositStatus.txId === tx.id ? (
                              <div style={{ color: "var(--green)", fontSize: 12 }}>{approveDepositStatus.success}</div>
                            ) : null}
                          </div>
                        ) : (
                          <span style={{ color: "rgba(255,255,255,0.40)", fontSize: 12 }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            withdrawalsLoading ? (
              <SkeletonTable columns={6} rows={6} minWidth={980} />
            ) : (
              <div style={{ display: "grid", gap: 10, padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.18)" }}>
                <div style={{ fontWeight: 800 }}>No withdrawals found</div>
                <div style={{ color: "rgba(255,255,255,0.60)", fontSize: 13 }}>Try changing the status filter.</div>
                {withdrawalStatusFilter !== "pending" ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      className="btn"
                      type="button"
                      onClick={() => {
                        setWithdrawalStatusFilter("pending");
                        fetchWithdrawals();
                      }}
                    >
                      Show pending
                    </button>
                  </div>
                ) : null}
              </div>
            )
          ) : (
            <div
              style={{
                overflowX: "auto",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 14,
                background: "rgba(0, 0, 0, 0.18)",
              }}
            >
              <table style={{ width: "100%", minWidth: typeof window !== "undefined" && window.innerWidth < 768 ? 650 : 980, borderCollapse: "separate", borderSpacing: 0 }}>
                <thead>
                  <tr style={{ background: "rgba(255, 255, 255, 0.02)" }}>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      User
                    </th>
                    <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      Amount
                    </th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      To
                    </th>
                    <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      Status
                    </th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      Requested
                    </th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      Tx Hash
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w) => (
                    <tr key={w.id}>
                      <td style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ fontFamily: "monospace", fontSize: 12 }}>{w.userId ? truncateAddress(w.userId) : "—"}</div>
                        {w.failureReason ? <div style={{ fontSize: 12, color: "var(--red)" }}>{w.failureReason}</div> : null}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", borderTop: "1px solid rgba(255,255,255,0.06)", fontVariantNumeric: "tabular-nums", fontWeight: 800 }}>
                        {formatEth(w.amount)} ETH
                      </td>
                      <td style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ fontFamily: "monospace", fontSize: 12 }}>{w.destinationAddress ? truncateAddress(w.destinationAddress) : "—"}</div>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", borderTop: "1px solid rgba(255,255,255,0.06)", fontWeight: 700 }}>
                        {w.status}
                      </td>
                      <td style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
                        {formatDate(w.requestedAt)}
                      </td>
                      <td style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ fontFamily: "monospace", fontSize: 12 }}>{w.txHash ? truncateAddress(w.txHash) : "—"}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "platformWallet" ? (
        <div style={{ display: "grid", gap: 14, maxWidth: 920 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
              This address is shown to users as the deposit destination.
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn" type="button" onClick={fetchPlatformWallet} disabled={platformWalletLoading}>
                {platformWalletLoading ? "Loading..." : "Refresh"}
              </button>
              <button className="btn" type="button" onClick={() => copyToClipboard(platformWalletCurrentAddress, "Address copied")} disabled={!platformWalletCurrentAddress}>
                Copy current
              </button>
            </div>
          </div>

          <div style={{ padding: 14, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.18)", display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ fontWeight: 900 }}>Current platform wallet</div>
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>Chain ID: {platformWallet?.chainId || "—"}</div>
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 13, wordBreak: "break-all" }}>{platformWalletCurrentAddress || "—"}</div>
          </div>

          <form onSubmit={submitPlatformWallet} style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 900 }}>Update platform wallet address</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input
                className="btn"
                style={{ cursor: "text", flex: "1 1 420px", minWidth: 0 }}
                value={platformWalletForm.address}
                onChange={(e) => setPlatformWalletForm({ address: e.target.value })}
                placeholder="0x..."
                inputMode="text"
                required
              />
              <button className="btn" type="button" onClick={() => copyToClipboard(platformWalletDraftAddress, "Draft copied")} disabled={!platformWalletDraftAddress}>
                Copy draft
              </button>
            </div>

            <div style={{ color: platformWalletDraftAddress && !platformWalletDraftValid ? "var(--red)" : "rgba(255,255,255,0.55)", fontSize: 12 }}>
              {!platformWalletDraftAddress
                ? "Enter an Ethereum address (0x...)"
                : !platformWalletDraftValid
                  ? "Invalid address format"
                  : platformWalletDraftChanged
                    ? "Valid address — ready to save"
                    : "No changes"}
            </div>

            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
              Withdrawals still use PLATFORM_WALLET_PRIVATE_KEY — keep it aligned with this address.
            </div>

            {platformWalletStatus.error ? <div style={{ color: "var(--red)" }}>{platformWalletStatus.error}</div> : null}
            {platformWalletStatus.success ? <div style={{ color: "var(--green)" }}>{platformWalletStatus.success}</div> : null}

            <button className="btn primary" type="submit" disabled={platformWalletStatus.isLoading || !platformWalletDraftValid || !platformWalletDraftChanged}>
              {platformWalletStatus.isLoading ? "Saving..." : "Save changes"}
            </button>
          </form>
        </div>
      ) : null}

      {activeTab === "items" ? (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              className="btn"
              style={{ cursor: "text", flex: "1 1 260px", minWidth: 0 }}
              value={itemsQuery}
              onChange={(e) => setItemsQuery(e.target.value)}
              placeholder="Search (name / collection / contract / token / owner)"
            />
            <select className="btn" value={itemsStatusFilter} onChange={(e) => setItemsStatusFilter(e.target.value)} style={{ padding: "6px 12px" }}>
              <option value="all">All statuses</option>
              <option value="owned">owned</option>
              <option value="listed">listed</option>
              <option value="auction">auction</option>
            </select>
            <button className="btn" onClick={fetchItems} disabled={itemsLoading}>
              {itemsLoading ? "Loading..." : "Refresh"}
            </button>
          </div>

          <form onSubmit={submitItem} style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 700 }}>Add / Update NFT</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
              <input
                className="btn"
                style={{ cursor: "text" }}
                value={itemForm.contractAddress}
                onChange={(e) => setItemForm((s) => ({ ...s, contractAddress: e.target.value }))}
                placeholder="Contract address"
                required
              />
              <input
                className="btn"
                style={{ cursor: "text" }}
                value={itemForm.tokenId}
                onChange={(e) => setItemForm((s) => ({ ...s, tokenId: e.target.value }))}
                placeholder="Token ID"
                required
              />
            </div>
            <input
              className="btn"
              style={{ cursor: "text" }}
              value={itemForm.name}
              onChange={(e) => setItemForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="Name"
              required
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
              <input
                className="btn"
                style={{ cursor: "text" }}
                value={itemForm.collection}
                onChange={(e) => setItemForm((s) => ({ ...s, collection: e.target.value }))}
                placeholder="Collection name (optional)"
              />
              <input
                className="btn"
                style={{ cursor: "text" }}
                value={itemForm.ownerId}
                onChange={(e) => setItemForm((s) => ({ ...s, ownerId: e.target.value }))}
                placeholder="Owner wallet (optional)"
              />
            </div>
            <input
              className="btn"
              style={{ cursor: "text" }}
              value={itemForm.image}
              onChange={(e) => setItemForm((s) => ({ ...s, image: e.target.value }))}
              placeholder="Image URL (optional)"
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
              <select
                className="btn"
                value={itemForm.status}
                onChange={(e) => setItemForm((s) => ({ ...s, status: e.target.value }))}
                style={{ padding: "6px 12px" }}
              >
                <option value="owned">owned</option>
                <option value="listed">listed</option>
                <option value="auction">auction</option>
              </select>
              <input
                className="btn"
                style={{ cursor: "text" }}
                value={itemForm.priceEth}
                onChange={(e) => setItemForm((s) => ({ ...s, priceEth: e.target.value }))}
                placeholder="Price (ETH)"
                inputMode="decimal"
              />
            </div>
            <textarea
              className="btn"
              style={{ cursor: "text", minHeight: 90, padding: 10 }}
              value={itemForm.description}
              onChange={(e) => setItemForm((s) => ({ ...s, description: e.target.value }))}
              placeholder="Description (optional)"
            />
            {itemStatus.error ? <div style={{ color: "var(--red)" }}>{itemStatus.error}</div> : null}
            {itemStatus.success ? <div style={{ color: "var(--green)" }}>{itemStatus.success}</div> : null}
            <button className="btn primary" type="submit" disabled={itemStatus.isLoading}>
              {itemStatus.isLoading ? "Saving..." : "Save"}
            </button>
          </form>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            {items.length === 0 ? (
              <div style={{ color: "var(--muted)" }}>{itemsLoading ? "Loading..." : "No NFTs found"}</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {items.map((a) => (
                  <div key={a.id} style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-secondary)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700 }}>{a.name || `${a.contractAddress} / ${a.tokenId}`}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          className="btn"
                          type="button"
                          onClick={() =>
                            setItemForm({
                              contractAddress: a.contractAddress || "",
                              tokenId: a.tokenId || "",
                              name: a.name || "",
                              collection: a.collection || "",
                              image: a.image || "",
                              priceEth: String(a.priceEth ?? 0),
                              ownerId: a.ownerId || a.owner || "",
                              status: a.status || "owned",
                              description: a.description || "",
                            })
                          }
                        >
                          Edit
                        </button>
                        <button className="btn" type="button" onClick={() => deleteItem(a.id)} disabled={itemStatus.isLoading}>
                          Delete
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      {truncateAddress(a.contractAddress)} / Token {a.tokenId}
                    </div>
                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6 }}>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>Status: {a.status || "—"}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>Price: {formatEth(a.priceEth)} ETH</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>
                        Owner: {a.owner ? truncateAddress(a.owner) : "—"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {activeTab === "collections" ? (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              className="btn"
              style={{ cursor: "text", flex: "1 1 260px", minWidth: 0 }}
              value={collectionsQuery}
              onChange={(e) => setCollectionsQuery(e.target.value)}
              placeholder="Search (name / contract / creator)"
            />
            <button className="btn" onClick={fetchAdminCollections} disabled={collectionsLoading}>
              {collectionsLoading ? "Loading..." : "Refresh"}
            </button>
          </div>

          <form onSubmit={submitAdminCollection} style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 700 }}>Add / Update Collection</div>
            <input
              className="btn"
              style={{ cursor: "text" }}
              value={adminCollectionForm.contractAddress}
              onChange={(e) => setAdminCollectionForm((s) => ({ ...s, contractAddress: e.target.value }))}
              placeholder="Contract address"
              required
            />
            <input
              className="btn"
              style={{ cursor: "text" }}
              value={adminCollectionForm.name}
              onChange={(e) => setAdminCollectionForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="Name"
              required
            />
            <input
              className="btn"
              style={{ cursor: "text" }}
              value={adminCollectionForm.image}
              onChange={(e) => setAdminCollectionForm((s) => ({ ...s, image: e.target.value }))}
              placeholder="Image URL (optional)"
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
              <input
                className="btn"
                style={{ cursor: "text" }}
                value={adminCollectionForm.creatorId}
                onChange={(e) => setAdminCollectionForm((s) => ({ ...s, creatorId: e.target.value }))}
                placeholder="Creator wallet (optional)"
              />
              <input
                className="btn"
                style={{ cursor: "text" }}
                value={adminCollectionForm.nextTokenId}
                onChange={(e) => setAdminCollectionForm((s) => ({ ...s, nextTokenId: e.target.value }))}
                placeholder="Next token ID (optional)"
                inputMode="numeric"
              />
            </div>
            <textarea
              className="btn"
              style={{ cursor: "text", minHeight: 90, padding: 10 }}
              value={adminCollectionForm.description}
              onChange={(e) => setAdminCollectionForm((s) => ({ ...s, description: e.target.value }))}
              placeholder="Description (optional)"
            />
            {adminCollectionStatus.error ? <div style={{ color: "var(--red)" }}>{adminCollectionStatus.error}</div> : null}
            {adminCollectionStatus.success ? <div style={{ color: "var(--green)" }}>{adminCollectionStatus.success}</div> : null}
            <button className="btn primary" type="submit" disabled={adminCollectionStatus.isLoading}>
              {adminCollectionStatus.isLoading ? "Saving..." : "Save"}
            </button>
          </form>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            {collections.length === 0 ? (
              <div style={{ color: "var(--muted)" }}>{collectionsLoading ? "Loading..." : "No collections found"}</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {collections.map((c) => (
                  <div key={c.id} style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-secondary)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700 }}>{c.name || c.contractAddress || c.id}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          className="btn"
                          type="button"
                          onClick={() =>
                            setAdminCollectionForm({
                              contractAddress: c.contractAddress || "",
                              name: c.name || "",
                              description: c.description || "",
                              image: c.image || "",
                              creatorId: c.creatorId || "",
                              nextTokenId: c.nextTokenId == null ? "" : String(c.nextTokenId),
                            })
                          }
                        >
                          Edit
                        </button>
                        <button
                          className="btn"
                          type="button"
                          onClick={() => deleteAdminCollection(c.id)}
                          disabled={adminCollectionStatus.isLoading}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      Contract: {c.contractAddress ? truncateAddress(c.contractAddress) : "—"}
                    </div>
                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6 }}>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>
                        Creator: {c.creatorId ? truncateAddress(c.creatorId) : "—"}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>Next token: {c.nextTokenId ?? "—"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
          <form onSubmit={submitHeroBanner} className="admin-card" style={{ display: "grid", gap: 16 }}>
            <div className="admin-form-label">Add / Update Hero Banner</div>
            <div className="admin-form-group">
              <label style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>Select Existing Banner (optional)</label>
              <select
                className="admin-form-input"
                value={selectedBannerId}
                onChange={(e) => {
                  setSelectedBannerId(e.target.value);
                  if (e.target.value) {
                    const banner = heroBanners.find((b) => b.id === e.target.value);
                    if (banner) {
                      setHeroBannerForm({
                        key: banner.key || "",
                        title: banner.title || "",
                        by: banner.by || "",
                        image: banner.image || "",
                        order: String(banner.order ?? 0),
                        stat1Label: banner.stats?.[0]?.label || "",
                        stat1Value: banner.stats?.[0]?.value || "",
                        stat2Label: banner.stats?.[1]?.label || "",
                        stat2Value: banner.stats?.[1]?.value || "",
                        stat3Label: banner.stats?.[2]?.label || "",
                        stat3Value: banner.stats?.[2]?.value || "",
                        stat4Label: banner.stats?.[3]?.label || "",
                        stat4Value: banner.stats?.[3]?.value || "",
                      });
                    }
                  } else {
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
                  }
                }}
                disabled={heroBannersLoading}
              >
                <option value="">-- Create New Banner --</option>
                {heroBanners.map((banner) => (
                  <option key={banner.id} value={banner.id}>
                    {banner.title || banner.key || "Untitled"} (Order: {banner.order ?? 0})
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 6, display: "block" }}>Key (optional)</label>
                <input
                  className="admin-form-input"
                  value={heroBannerForm.key}
                  onChange={(e) => setHeroBannerForm((s) => ({ ...s, key: e.target.value }))}
                  placeholder="Key (optional)"
                />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 6, display: "block" }}>Order</label>
                <input
                  className="admin-form-input"
                  value={heroBannerForm.order}
                  onChange={(e) => setHeroBannerForm((s) => ({ ...s, order: e.target.value }))}
                  placeholder="Order"
                  inputMode="numeric"
                />
              </div>
            </div>
            <div className="admin-form-group">
              <label style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>Title *</label>
              <input
                className="admin-form-input"
                value={heroBannerForm.title}
                onChange={(e) => setHeroBannerForm((s) => ({ ...s, title: e.target.value }))}
                placeholder="Title"
                required
              />
            </div>
            <div className="admin-form-group">
              <label style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>By (optional)</label>
              <input
                className="admin-form-input"
                value={heroBannerForm.by}
                onChange={(e) => setHeroBannerForm((s) => ({ ...s, by: e.target.value }))}
                placeholder="By (optional)"
              />
            </div>
            <div className="admin-form-group">
              <label style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>Image URL *</label>
              <input
                className="admin-form-input"
                value={heroBannerForm.image}
                onChange={(e) => setHeroBannerForm((s) => ({ ...s, image: e.target.value }))}
                placeholder="Image URL"
                required
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 6, display: "block" }}>Stat 1 Label</label>
                <input
                  className="admin-form-input"
                  value={heroBannerForm.stat1Label}
                  onChange={(e) => setHeroBannerForm((s) => ({ ...s, stat1Label: e.target.value }))}
                  placeholder="Stat 1 label"
                />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 6, display: "block" }}>Stat 1 Value</label>
                <input
                  className="admin-form-input"
                  value={heroBannerForm.stat1Value}
                  onChange={(e) => setHeroBannerForm((s) => ({ ...s, stat1Value: e.target.value }))}
                  placeholder="Stat 1 value"
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 6, display: "block" }}>Stat 2 Label</label>
                <input
                  className="admin-form-input"
                  value={heroBannerForm.stat2Label}
                  onChange={(e) => setHeroBannerForm((s) => ({ ...s, stat2Label: e.target.value }))}
                  placeholder="Stat 2 label"
                />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 6, display: "block" }}>Stat 2 Value</label>
                <input
                  className="admin-form-input"
                  value={heroBannerForm.stat2Value}
                  onChange={(e) => setHeroBannerForm((s) => ({ ...s, stat2Value: e.target.value }))}
                  placeholder="Stat 2 value"
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 6, display: "block" }}>Stat 3 Label</label>
                <input
                  className="admin-form-input"
                  value={heroBannerForm.stat3Label}
                  onChange={(e) => setHeroBannerForm((s) => ({ ...s, stat3Label: e.target.value }))}
                  placeholder="Stat 3 label"
                />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 6, display: "block" }}>Stat 3 Value</label>
                <input
                  className="admin-form-input"
                  value={heroBannerForm.stat3Value}
                  onChange={(e) => setHeroBannerForm((s) => ({ ...s, stat3Value: e.target.value }))}
                  placeholder="Stat 3 value"
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 6, display: "block" }}>Stat 4 Label</label>
                <input
                  className="admin-form-input"
                  value={heroBannerForm.stat4Label}
                  onChange={(e) => setHeroBannerForm((s) => ({ ...s, stat4Label: e.target.value }))}
                  placeholder="Stat 4 label"
                />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 6, display: "block" }}>Stat 4 Value</label>
                <input
                  className="admin-form-input"
                  value={heroBannerForm.stat4Value}
                  onChange={(e) => setHeroBannerForm((s) => ({ ...s, stat4Value: e.target.value }))}
                  placeholder="Stat 4 value"
                />
              </div>
            </div>
            {heroBannerStatus.error ? <div className="admin-alert error">{heroBannerStatus.error}</div> : null}
            {heroBannerStatus.success ? <div className="admin-alert success">{heroBannerStatus.success}</div> : null}
            <button className="btn primary" type="submit" disabled={heroBannerStatus.isLoading}>
              {heroBannerStatus.isLoading ? "Saving..." : selectedBannerId ? "Update Banner" : "Create Banner"}
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
          <form onSubmit={submitFeaturedAsset} className="admin-card" style={{ display: "grid", gap: 16 }}>
            <div className="admin-form-label">Add Featured NFT</div>
            <div className="admin-form-group">
              <label style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>Select NFT</label>
              <select
                className="admin-form-input"
                value={selectedNFTId}
                onChange={(e) => handleNFTSelect(e.target.value)}
                disabled={availableNFTsLoading}
                required
              >
                <option value="">-- Select an NFT --</option>
                {availableNFTs.map((nft) => (
                  <option key={nft.id} value={nft.id}>
                    {nft.name || "Unnamed"} {nft.collection ? `(${nft.collection})` : ""} - {truncateAddress(nft.contractAddress)} #{nft.tokenId}
                  </option>
                ))}
              </select>
              {availableNFTsLoading && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Loading NFTs...</div>}
            </div>
            {selectedNFTId && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 6, display: "block" }}>Order</label>
                    <input
                      className="admin-form-input"
                      value={assetForm.order}
                      onChange={(e) => setAssetForm((s) => ({ ...s, order: e.target.value }))}
                      placeholder="Order"
                      inputMode="numeric"
                    />
                  </div>
                </div>
                {assetForm.image && (
                  <div>
                    <img src={assetForm.image} alt={assetForm.name} style={{ maxWidth: "200px", maxHeight: "200px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)" }} />
                  </div>
                )}
              </>
            )}
            {assetStatus.error ? <div className="admin-alert error">{assetStatus.error}</div> : null}
            {assetStatus.success ? <div className="admin-alert success">{assetStatus.success}</div> : null}
            <button className="btn primary" type="submit" disabled={assetStatus.isLoading || !selectedNFTId}>
              {assetStatus.isLoading ? "Saving..." : "Add to Featured"}
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
              <div
                style={{
                  overflowX: "auto",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 14,
                  background: "rgba(0, 0, 0, 0.18)",
                }}
              >
                <table style={{ width: "100%", minWidth: typeof window !== "undefined" && window.innerWidth < 768 ? 600 : 820, borderCollapse: "separate", borderSpacing: 0 }}>
                  <thead>
                    <tr style={{ background: "rgba(255, 255, 255, 0.02)" }}>
                      <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        NFT
                      </th>
                      <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        Contract / Token
                      </th>
                      <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        Order
                      </th>
                      <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {featuredAssets.map((a) => (
                      <tr key={a.id}>
                        <td style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                          <div style={{ fontWeight: 800, fontSize: 13 }}>{a.name}</div>
                          {a.collection ? <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>{a.collection}</div> : null}
                        </td>
                        <td style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                          <div style={{ fontFamily: "monospace", fontSize: 12 }}>
                            {truncateAddress(a.contractAddress)} · #{a.tokenId}
                          </div>
                        </td>
                        <td style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          {a.order ?? 0}
                        </td>
                        <td style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "right" }}>
                          <button className="btn" onClick={() => deleteFeaturedAsset(a.id)} disabled={assetStatus.isLoading}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {activeTab === "featuredCollections" ? (
        <div style={{ display: "grid", gap: 16 }}>
          <form onSubmit={submitFeaturedCollection} className="admin-card" style={{ display: "grid", gap: 16 }}>
            <div className="admin-form-label">Add Featured Collection</div>
            <div className="admin-form-group">
              <label style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>Select Collection</label>
              <select
                className="admin-form-input"
                value={selectedCollectionId}
                onChange={(e) => handleCollectionSelect(e.target.value)}
                disabled={availableCollectionsLoading}
                required
              >
                <option value="">-- Select a Collection --</option>
                {availableCollections.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name || "Unnamed"} {col.contractAddress ? `(${truncateAddress(col.contractAddress)})` : ""}
                  </option>
                ))}
              </select>
              {availableCollectionsLoading && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Loading Collections...</div>}
            </div>
            {selectedCollectionId && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 6, display: "block" }}>Floor Price (ETH)</label>
                  <input
                    className="admin-form-input"
                    value={collectionForm.floor}
                    onChange={(e) => setCollectionForm((s) => ({ ...s, floor: e.target.value }))}
                    placeholder="Floor"
                    inputMode="decimal"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 6, display: "block" }}>Delta %</label>
                  <input
                    className="admin-form-input"
                    value={collectionForm.delta}
                    onChange={(e) => setCollectionForm((s) => ({ ...s, delta: e.target.value }))}
                    placeholder="Delta %"
                    inputMode="decimal"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 6, display: "block" }}>Order</label>
                  <input
                    className="admin-form-input"
                    value={collectionForm.order}
                    onChange={(e) => setCollectionForm((s) => ({ ...s, order: e.target.value }))}
                    placeholder="Order"
                    inputMode="numeric"
                  />
                </div>
              </div>
            )}
            {collectionForm.image && selectedCollectionId && (
              <div>
                <img src={collectionForm.image} alt={collectionForm.name} style={{ maxWidth: "200px", maxHeight: "200px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)" }} />
              </div>
            )}
            {collectionStatus.error ? <div className="admin-alert error">{collectionStatus.error}</div> : null}
            {collectionStatus.success ? <div className="admin-alert success">{collectionStatus.success}</div> : null}
            <button className="btn primary" type="submit" disabled={collectionStatus.isLoading || !selectedCollectionId}>
              {collectionStatus.isLoading ? "Saving..." : "Add to Featured"}
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
              <div
                style={{
                  overflowX: "auto",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 14,
                  background: "rgba(0, 0, 0, 0.18)",
                }}
              >
                <table style={{ width: "100%", minWidth: typeof window !== "undefined" && window.innerWidth < 768 ? 600 : 820, borderCollapse: "separate", borderSpacing: 0 }}>
                  <thead>
                    <tr style={{ background: "rgba(255, 255, 255, 0.02)" }}>
                      <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        Collection
                      </th>
                      <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        Floor
                      </th>
                      <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        Delta
                      </th>
                      <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        Order
                      </th>
                      <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {featuredCollections.map((c) => (
                      <tr key={c.id}>
                        <td style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                          <div style={{ fontWeight: 800, fontSize: 13 }}>{c.name}</div>
                        </td>
                        <td style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          {formatEth(c.floor)} ETH
                        </td>
                        <td style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          {Number(c.delta || 0).toFixed(2)}%
                        </td>
                        <td style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          {c.order ?? 0}
                        </td>
                        <td style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "right" }}>
                          <button className="btn" onClick={() => deleteFeaturedCollection(c.id)} disabled={collectionStatus.isLoading}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
      </div>

      {toasts.length ? (
        <div className="admin-toasts" aria-live="polite" aria-relevant="additions removals">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`admin-toast ${t.type}`}
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              role="status"
            >
              {t.message}
            </div>
          ))}
        </div>
      ) : null}

      {confirmState ? (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={confirmState.title || "Confirm"}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              confirmState.resolve(false);
              setConfirmState(null);
            }
          }}
        >
          <div className="admin-modal">
            <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 8 }}>{confirmState.title}</div>
            <div style={{ color: "rgba(255,255,255,0.70)", fontSize: 13, marginBottom: 14 }}>{confirmState.message}</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  confirmState.resolve(false);
                  setConfirmState(null);
                }}
              >
                Cancel
              </button>
              <button
                className="btn primary"
                type="button"
                onClick={() => {
                  confirmState.resolve(true);
                  setConfirmState(null);
                }}
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
