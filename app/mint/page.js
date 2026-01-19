"use client";
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import { useMinting } from "../../lib/hooks/useMinting";
import { useWalletConnection } from "../../lib/hooks/useWallet";
import { handleTransactionError, truncateAddress, validateImageFile } from "../../lib/utils";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useSigner } from "@thirdweb-dev/react";

export default function MintPage() {
  const { address, isConnected } = useWalletConnection();
  const { mintNFTWithImage, uploadImage, isLoading } = useMinting();
  const signer = useSigner();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    rarity: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [status, setStatus] = useState({ type: null, message: "" });
  const [minted, setMinted] = useState(null);

  const [collectionMode, setCollectionMode] = useState("default");
  const [myCollections, setMyCollections] = useState([]);
  const [myCollectionsState, setMyCollectionsState] = useState({ isLoading: false, error: null });
  const [selectedCollection, setSelectedCollection] = useState("");
  const [profileState, setProfileState] = useState({ isLoading: true, walletAddress: null, error: null });

  const [collectionForm, setCollectionForm] = useState({ name: "", description: "" });
  const [collectionImageFile, setCollectionImageFile] = useState(null);
  const [collectionImagePreview, setCollectionImagePreview] = useState(null);
  const [collectionCreateState, setCollectionCreateState] = useState({ isLoading: false, error: null, success: null });

  const pageVariants = useMemo(
    () => ({
      hidden: { opacity: 0, y: 14 },
      show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
    }),
    []
  );

  const cardVariants = useMemo(
    () => ({
      hidden: { opacity: 0, y: 10, scale: 0.99 },
      show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } },
    }),
    []
  );

  const softFieldStyle = useMemo(
    () => ({
      width: "100%",
      padding: 10,
      borderRadius: 12,
      border: "1px solid var(--border)",
      background: "rgba(255, 255, 255, 0.03)",
      color: "var(--text)",
      outline: "none",
    }),
    []
  );

  const refreshMyCollections = async () => {
    setMyCollectionsState({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/collections?mine=true");
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setMyCollections([]);
        setMyCollectionsState({ isLoading: false, error: "Sign in to view your collections" });
        return;
      }
      if (!res.ok) throw new Error(data.error || "Failed to load collections");
      setMyCollections(Array.isArray(data.collections) ? data.collections : []);
      setMyCollectionsState({ isLoading: false, error: null });
    } catch (e) {
      setMyCollections([]);
      setMyCollectionsState({ isLoading: false, error: e?.message || "Failed to load collections" });
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      setProfileState((s) => ({ ...s, isLoading: true, error: null }));
      try {
        const res = await fetch("/api/user/profile");
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          if (!cancelled) setProfileState({ isLoading: false, walletAddress: null, error: "Sign in to mint NFTs" });
          return;
        }
        if (!res.ok) throw new Error(data.error || "Failed to load profile");
        if (!cancelled) {
          setProfileState({ isLoading: false, walletAddress: data.walletAddress || null, error: null });
        }
      } catch (e) {
        if (!cancelled) {
          setProfileState({ isLoading: false, walletAddress: null, error: e?.message || "Failed to load profile" });
        }
      }
    };
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isConnected) return;
    if (!profileState.walletAddress) return;
    refreshMyCollections();
  }, [isConnected, profileState.walletAddress]);

  const walletMismatch =
    profileState.walletAddress &&
    address &&
    profileState.walletAddress.toLowerCase() !== address.toLowerCase();

  const currentStep = useMemo(() => {
    const needsCollection = collectionMode === "existing";
    if (needsCollection && !selectedCollection) return 1;
    if (!imageFile) return 2;
    if (!formData.name.trim() || !formData.description.trim()) return 3;
    return 4;
  }, [collectionMode, selectedCollection, imageFile, formData.name, formData.description]);

  const preview = useMemo(() => {
    const name = formData.name.trim() || "Untitled NFT";
    const description = formData.description.trim() || "Add a description to help collectors understand your NFT.";
    const category = formData.category.trim() || "Uncategorized";
    const rarity = formData.rarity.trim() || "Standard";
    return { name, description, category, rarity };
  }, [formData.name, formData.description, formData.category, formData.rarity]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        validateImageFile(file);
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
      } catch (err) {
        setImageFile(null);
        setImagePreview(null);
        setStatus({ type: "error", message: err?.message || "Invalid image" });
      }
    }
  };

  const handleCollectionImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        validateImageFile(file);
        setCollectionImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setCollectionImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
      } catch (err) {
        setCollectionImageFile(null);
        setCollectionImagePreview(null);
        setCollectionCreateState({ isLoading: false, error: err?.message || "Invalid image", success: null });
      }
    }
  };

  const createCollection = async () => {
    setCollectionCreateState({ isLoading: true, error: null, success: null });
    try {
      if (!isConnected) throw new Error("Please connect your wallet first");
      if (!signer) throw new Error("Wallet signer not available");
      if (profileState.isLoading) throw new Error("Loading wallet link status...");
      if (!profileState.walletAddress) throw new Error(profileState.error || "Link your wallet before creating a collection");
      if (walletMismatch) throw new Error("Connected wallet does not match your linked wallet");
      if (!collectionForm.name.trim()) throw new Error("Collection name is required");
      if (!collectionImageFile) throw new Error("Collection image is required");

      const image = await uploadImage(collectionImageFile);
      const nowIso = new Date().toISOString();
      const message = `Create collection on Cosmos\nName: ${collectionForm.name.trim()}\nTime: ${nowIso}`;
      const signature = await signer.signMessage(message);

      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: collectionForm.name.trim(),
          description: collectionForm.description.trim(),
          image,
          message,
          signature,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create collection");

      const contractAddress = String(data.contractAddress || "").trim();
      setSelectedCollection(contractAddress);
      setCollectionMode("existing");
      setCollectionCreateState({ isLoading: false, error: null, success: `Collection created: ${truncateAddress(contractAddress)}` });
      setCollectionForm({ name: "", description: "" });
      setCollectionImageFile(null);
      setCollectionImagePreview(null);
      await refreshMyCollections();
    } catch (e) {
      setCollectionCreateState({ isLoading: false, error: e?.message || "Failed to create collection", success: null });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isConnected) {
      setStatus({ type: "error", message: "Please connect your wallet first" });
      return;
    }

    if (profileState.isLoading) {
      setStatus({ type: "error", message: "Loading wallet link status..." });
      return;
    }

    if (!profileState.walletAddress) {
      setStatus({ type: "error", message: profileState.error || "Link your wallet before minting" });
      return;
    }

    if (walletMismatch) {
      setStatus({
        type: "error",
        message: `Wrong wallet connected. Linked: ${truncateAddress(profileState.walletAddress)}.`,
      });
      return;
    }

    if (!imageFile) {
      setStatus({ type: "error", message: "Please select an image" });
      return;
    }

    if (!formData.name || !formData.description) {
      setStatus({ type: "error", message: "Please fill in all required fields" });
      return;
    }

    try {
      setMinted(null);
      setStatus({ type: "loading", message: "Check your wallet to sign the mint message..." });
      const contractAddress = collectionMode === "existing" && selectedCollection ? selectedCollection : "";
      const result = await mintNFTWithImage(imageFile, { ...formData, contractAddress });
      setStatus({
        type: "success",
        message: `NFT minted successfully! Token ID: ${result.tokenId}`,
      });
      setMinted({
        tokenId: result?.tokenId ? String(result.tokenId) : null,
        contractAddress: result?.contractAddress || contractAddress || process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS || null,
      });
    } catch (error) {
      const errorMessage = handleTransactionError(error);
      setStatus({ type: "error", message: errorMessage });
    }
  };

  return (
    <>
      <NavBar />
      <main className="container mint-page">
        <motion.div className="section" initial="hidden" animate="show" variants={pageVariants} style={{ maxWidth: 980, margin: "0 auto" }}>
          <div style={{ position: "relative", overflow: "hidden" }}>
            <motion.div aria-hidden style={{ position: "absolute", inset: -120, pointerEvents: "none", filter: "blur(26px)", opacity: 0.85 }}>
              <motion.div
                aria-hidden
                animate={{ x: [0, 28, 0], y: [0, -16, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: "absolute",
                  top: 36,
                  left: 40,
                  width: 280,
                  height: 280,
                  borderRadius: 999,
                  background: "radial-gradient(circle at 35% 30%, rgba(45, 212, 191, 0.55), transparent 65%)",
                }}
              />
              <motion.div
                aria-hidden
                animate={{ x: [0, -22, 0], y: [0, 18, 0] }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: "absolute",
                  top: 0,
                  right: 30,
                  width: 320,
                  height: 320,
                  borderRadius: 999,
                  background: "radial-gradient(circle at 30% 35%, rgba(124, 58, 237, 0.48), transparent 62%)",
                }}
              />
            </motion.div>

            <div className="mint-hero">
              <div className="mint-hero-top">
                <div className="mint-hero-left">
                  <div className="mint-hero-badge">Create</div>
                  <h1 style={{ margin: 0 }}>Mint</h1>
                  <div className="mint-hero-sub">Upload media, add details, then mint into a collection.</div>
                </div>
                <div className="mint-header-actions mint-hero-actions">
                  <button className="btn" type="button" onClick={() => router.push("/wallet")}>
                    Wallet
                  </button>
                  <button className="btn" type="button" onClick={() => router.push("/collections")}>
                    Collections
                  </button>
                </div>
              </div>

              <div className="mint-hero-bottom">
                <div className="mint-steps" role="list" aria-label="Mint steps">
                  <div className={`mint-step${currentStep === 1 ? " active" : ""}${currentStep > 1 ? " done" : ""}`} role="listitem">
                    <div className="mint-step-dot">1</div>
                    <div className="mint-step-text">
                      <div className="mint-step-title">Collection</div>
                      <div className="mint-step-sub">Default or yours</div>
                    </div>
                  </div>
                  <div className={`mint-step${currentStep === 2 ? " active" : ""}${currentStep > 2 ? " done" : ""}`} role="listitem">
                    <div className="mint-step-dot">2</div>
                    <div className="mint-step-text">
                      <div className="mint-step-title">Media</div>
                      <div className="mint-step-sub">Upload artwork</div>
                    </div>
                  </div>
                  <div className={`mint-step${currentStep === 3 ? " active" : ""}${currentStep > 3 ? " done" : ""}`} role="listitem">
                    <div className="mint-step-dot">3</div>
                    <div className="mint-step-text">
                      <div className="mint-step-title">Details</div>
                      <div className="mint-step-sub">Name + description</div>
                    </div>
                  </div>
                  <div className={`mint-step${currentStep === 4 ? " active" : ""}`} role="listitem">
                    <div className="mint-step-dot">4</div>
                    <div className="mint-step-text">
                      <div className="mint-step-title">Mint</div>
                      <div className="mint-step-sub">Sign message</div>
                    </div>
                  </div>
                </div>

                <div className="mint-hero-pills">
                  <div className={`mint-pill${isConnected ? " ok" : ""}`}>{isConnected && address ? `Connected: ${truncateAddress(address)}` : "Wallet not connected"}</div>
                  <div className={`mint-pill${profileState.walletAddress ? " ok" : ""}`}>
                    {profileState.walletAddress ? `Linked: ${truncateAddress(profileState.walletAddress)}` : "Wallet not linked"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {status.message ? (
              <motion.div
                key="status"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="card"
                style={{
                  padding: 12,
                  marginTop: 16,
                  borderColor: status.type === "error" ? "var(--red)" : status.type === "success" ? "var(--green)" : "rgba(45, 212, 191, 0.6)",
                  background:
                    status.type === "error"
                      ? "rgba(239, 68, 68, 0.08)"
                      : status.type === "success"
                        ? "rgba(34, 197, 94, 0.08)"
                        : "rgba(45, 212, 191, 0.06)",
                  color: status.type === "error" ? "var(--red)" : status.type === "success" ? "var(--green)" : "var(--primary)",
                }}
              >
                {status.message}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {minted?.tokenId && minted?.contractAddress ? (
              <motion.div key="minted" variants={cardVariants} initial="hidden" animate="show" exit={{ opacity: 0, y: 6 }} className="card" style={{ padding: 14, marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>Minted</div>
                    <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
                      Token #{minted.tokenId} • {truncateAddress(minted.contractAddress)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Link href={`/asset/${minted.contractAddress}/${minted.tokenId}`} className="btn primary">
                      View NFT
                    </Link>
                    <Link href={`/collections/${encodeURIComponent(minted.contractAddress)}`} className="btn">
                      View Collection
                    </Link>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        setMinted(null);
                        setStatus({ type: null, message: "" });
                        setFormData({ name: "", description: "", category: "", rarity: "" });
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                    >
                      Mint Another
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {!isConnected ? (
            <div className="card" style={{ padding: 14, marginTop: 16, borderColor: "var(--red)", background: "rgba(239, 68, 68, 0.06)" }}>
              <div style={{ color: "var(--red)" }}>Please connect your wallet to mint NFTs</div>
            </div>
          ) : profileState.error ? (
            <div className="card" style={{ padding: 14, marginTop: 16, borderColor: "var(--red)", background: "rgba(239, 68, 68, 0.06)" }}>
              <div style={{ color: "var(--red)" }}>{profileState.error}</div>
            </div>
          ) : walletMismatch ? (
            <div className="card" style={{ padding: 14, marginTop: 16, borderColor: "var(--yellow)", background: "rgba(234, 179, 8, 0.06)" }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Wrong wallet connected</div>
              <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>
                This account is linked to {truncateAddress(profileState.walletAddress)}. Switch wallets or link the connected wallet.
              </div>
              <button className="btn" type="button" onClick={() => router.push("/wallet")}>
                Go to Wallet
              </button>
            </div>
          ) : !profileState.walletAddress ? (
            <div className="card" style={{ padding: 14, marginTop: 16, borderColor: "var(--yellow)", background: "rgba(234, 179, 8, 0.06)" }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Wallet not linked</div>
              <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>
                Link your wallet to your account to mint NFTs and create collections.
              </div>
              <button className="btn" type="button" onClick={() => router.push("/wallet")}>
                Link Wallet
              </button>
            </div>
          ) : null}

          <div className="mint-layout" style={{ marginTop: 18 }}>
            <motion.div variants={cardVariants} className="card mint-card mint-main-card" initial="hidden" animate="show">
              <div className="mint-card-head">
                <div>
                  <div className="mint-card-title">Create NFT</div>
                  <div className="mint-card-sub">Fields marked with * are required.</div>
                </div>
                {imageFile ? (
                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    style={{ padding: "6px 10px", fontSize: 12 }}
                  >
                    Remove Image
                  </button>
                ) : null}
              </div>

              <form onSubmit={handleSubmit} className="mint-form">
                <div className="mint-field">
                  <div className="mint-field-head">
                    <label className="mint-label">Image *</label>
                    <div className="mint-field-hint">PNG, JPG, GIF, WEBP</div>
                  </div>
                  <label className={`mint-drop${imagePreview ? " has" : ""}`}>
                    <input className="mint-file-input" type="file" accept="image/*" onChange={handleImageChange} />
                    <div className="mint-drop-inner">
                      <div className="mint-drop-title">{imageFile ? imageFile.name : "Choose a file"}</div>
                      <div className="mint-drop-sub">{imageFile ? "Click to replace" : "Click to upload artwork"}</div>
                    </div>
                  </label>
                  <AnimatePresence>
                    {imagePreview ? (
                      <motion.img
                        key="nft-preview"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        src={imagePreview}
                        alt="NFT preview"
                        className="mint-media-preview"
                      />
                    ) : null}
                  </AnimatePresence>
                </div>

                <div className="mint-two-col">
                  <div className="mint-field">
                    <label className="mint-label">Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="My Awesome NFT"
                      required
                      style={softFieldStyle}
                    />
                  </div>

                  <div className="mint-field">
                    <label className="mint-label">Rarity</label>
                    <input
                      type="text"
                      value={formData.rarity}
                      onChange={(e) => setFormData({ ...formData, rarity: e.target.value })}
                      placeholder="Common, Rare, Epic"
                      style={softFieldStyle}
                    />
                  </div>
                </div>

                <div className="mint-field">
                  <label className="mint-label">Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your NFT..."
                    required
                    rows={4}
                    style={{ ...softFieldStyle, resize: "vertical", fontFamily: "inherit" }}
                  />
                </div>

                <div className="mint-field">
                  <label className="mint-label">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Art, Collectibles, Gaming"
                    style={softFieldStyle}
                  />
                </div>

                <div className="mint-submit-row">
                  <button
                    type="submit"
                    className="btn primary mint-submit"
                    disabled={
                      !isConnected ||
                      isLoading ||
                      !imageFile ||
                      (collectionMode === "existing" && !selectedCollection) ||
                      profileState.isLoading ||
                      !profileState.walletAddress ||
                      walletMismatch
                    }
                  >
                    {isLoading ? "Minting..." : collectionMode === "existing" ? "Mint to Collection" : "Mint NFT"}
                  </button>
                  <div className="mint-submit-sub">
                    {profileState.walletAddress ? "Minting requires a wallet signature." : "Link your wallet to mint."}
                  </div>
                </div>
              </form>
            </motion.div>

            <div className="mint-side">
              <motion.div variants={cardVariants} className="card mint-card" initial="hidden" animate="show">
                <div className="mint-card-head">
                  <div>
                    <div className="mint-card-title">Collection</div>
                    <div className="mint-card-sub">Choose where your NFT will be minted.</div>
                  </div>
                  <button className="btn" type="button" onClick={refreshMyCollections} disabled={myCollectionsState.isLoading} style={{ padding: "6px 10px", fontSize: 12 }}>
                    {myCollectionsState.isLoading ? "Refreshing..." : "Refresh"}
                  </button>
                </div>

                <div className="mint-seg" role="tablist" aria-label="Collection mode">
                  <button
                    className={`mint-seg-btn${collectionMode === "default" ? " active" : ""}`}
                    type="button"
                    onClick={() => setCollectionMode("default")}
                    aria-selected={collectionMode === "default"}
                  >
                    Default
                  </button>
                  <button
                    className={`mint-seg-btn${collectionMode === "existing" ? " active" : ""}`}
                    type="button"
                    onClick={() => setCollectionMode("existing")}
                    aria-selected={collectionMode === "existing"}
                  >
                    My Collections
                  </button>
                  <button
                    className={`mint-seg-btn${collectionMode === "create" ? " active" : ""}`}
                    type="button"
                    onClick={() => setCollectionMode("create")}
                    aria-selected={collectionMode === "create"}
                  >
                    Create
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {collectionMode === "default" ? (
                    <motion.div key="default" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.18 }} className="mint-tab">
                      <div className="mint-muted">Mints to the configured default contract.</div>
                    </motion.div>
                  ) : null}

                  {collectionMode === "existing" ? (
                    <motion.div key="existing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.18 }} className="mint-tab">
                      {myCollectionsState.error ? <div className="mint-error">{myCollectionsState.error}</div> : null}
                      {myCollections.length === 0 ? (
                        <div className="mint-muted">No collections found for this account.</div>
                      ) : (
                        <div className="mint-stack">
                          <select value={selectedCollection} onChange={(e) => setSelectedCollection(e.target.value)} style={{ ...softFieldStyle, padding: 11 }}>
                            <option value="">Select a collection…</option>
                            {myCollections.map((c) => (
                              <option key={c.contractAddress} value={c.contractAddress}>
                                {c.name} • {truncateAddress(c.contractAddress)}
                              </option>
                            ))}
                          </select>

                          {selectedCollection ? (
                            <div className="mint-mono">
                              Selected: <span>{selectedCollection}</span>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </motion.div>
                  ) : null}

                  {collectionMode === "create" ? (
                    <motion.div key="create" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.18 }} className="mint-tab">
                      {collectionCreateState.error ? <div className="mint-error">{collectionCreateState.error}</div> : null}
                      {collectionCreateState.success ? <div className="mint-success">{collectionCreateState.success}</div> : null}

                      <div className="mint-stack">
                        <div className="mint-field">
                          <label className="mint-label">Image *</label>
                          <label className={`mint-drop small${collectionImagePreview ? " has" : ""}`}>
                            <input className="mint-file-input" type="file" accept="image/*" onChange={handleCollectionImageChange} />
                            <div className="mint-drop-inner">
                              <div className="mint-drop-title">{collectionImageFile ? collectionImageFile.name : "Choose a file"}</div>
                              <div className="mint-drop-sub">{collectionImageFile ? "Click to replace" : "Click to upload collection image"}</div>
                            </div>
                          </label>
                          {collectionImagePreview ? (
                            <motion.img initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} src={collectionImagePreview} alt="Collection preview" className="mint-media-preview small" />
                          ) : null}
                        </div>

                        <div className="mint-field">
                          <label className="mint-label">Name *</label>
                          <input
                            value={collectionForm.name}
                            onChange={(e) => setCollectionForm((s) => ({ ...s, name: e.target.value }))}
                            placeholder="My Collection"
                            style={softFieldStyle}
                          />
                        </div>

                        <div className="mint-field">
                          <label className="mint-label">Description</label>
                          <textarea
                            value={collectionForm.description}
                            onChange={(e) => setCollectionForm((s) => ({ ...s, description: e.target.value }))}
                            placeholder="Optional description"
                            rows={3}
                            style={{ ...softFieldStyle, resize: "vertical", fontFamily: "inherit" }}
                          />
                        </div>

                        <button className="btn primary" type="button" onClick={createCollection} disabled={collectionCreateState.isLoading || !isConnected}>
                          {collectionCreateState.isLoading ? "Creating..." : "Create Collection"}
                        </button>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>

              <motion.div variants={cardVariants} className="card mint-card mint-preview-card" initial="hidden" animate="show">
                <div className="mint-card-head">
                  <div>
                    <div className="mint-card-title">Preview</div>
                    <div className="mint-card-sub">This is how your NFT will look.</div>
                  </div>
                  <div className={`mint-preview-chip step-${currentStep}`}>Step {currentStep}/4</div>
                </div>

                <div className="mint-preview-media">
                  {imagePreview ? <img src={imagePreview} alt="Preview artwork" /> : <div className="mint-preview-placeholder">Upload an image to preview</div>}
                </div>

                <div className="mint-preview-meta">
                  <div className="mint-preview-title">{preview.name}</div>
                  <div className="mint-preview-desc">{preview.description}</div>

                  <div className="mint-preview-attrs">
                    <div className="mint-attr">
                      <div className="mint-attr-k">Category</div>
                      <div className="mint-attr-v">{preview.category}</div>
                    </div>
                    <div className="mint-attr">
                      <div className="mint-attr-k">Rarity</div>
                      <div className="mint-attr-v">{preview.rarity}</div>
                    </div>
                  </div>

                  <div className="mint-preview-collection">
                    <div className="mint-attr-k">Collection</div>
                    {collectionMode === "existing" && selectedCollection ? (
                      <div className="mint-mono">
                        <span>{selectedCollection}</span>
                      </div>
                    ) : (
                      <div className="mint-muted">{collectionMode === "default" ? "Default contract" : "Select or create a collection"}</div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </main>
      <Footer />
    </>
  );
}
