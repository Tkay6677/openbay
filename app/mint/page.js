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

            <div className="mint-header" style={{ position: "relative", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <h1 style={{ margin: 0 }}>Mint</h1>
                <div style={{ color: "var(--muted)", marginTop: 6 }}>Mint an NFT to the default collection or your own.</div>
              </div>
              <div className="mint-header-actions" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn" type="button" onClick={() => router.push("/wallet")}>
                  Wallet
                </button>
                <button className="btn" type="button" onClick={() => router.push("/collections")}>
                  Collections
                </button>
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

          <div className="mint-grid" style={{ marginTop: 18 }}>
            <motion.div variants={cardVariants} className="card" initial="hidden" animate="show" style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontWeight: 800 }}>Collection</div>
                <button className="btn" type="button" onClick={refreshMyCollections} disabled={myCollectionsState.isLoading} style={{ padding: "6px 10px", fontSize: 12 }}>
                  {myCollectionsState.isLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              <div className="mint-collection-tabs" style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <button className={collectionMode === "default" ? "btn primary" : "btn"} type="button" onClick={() => setCollectionMode("default")}>
                  Default
                </button>
                <button className={collectionMode === "existing" ? "btn primary" : "btn"} type="button" onClick={() => setCollectionMode("existing")}>
                  My Collections
                </button>
                <button className={collectionMode === "create" ? "btn primary" : "btn"} type="button" onClick={() => setCollectionMode("create")}>
                  Create
                </button>
              </div>

              <AnimatePresence mode="wait">
                {collectionMode === "default" ? (
                  <motion.div key="default" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.18 }} style={{ marginTop: 14 }}>
                    <div style={{ color: "var(--muted)", fontSize: 13 }}>Mints to the configured default contract.</div>
                  </motion.div>
                ) : null}

                {collectionMode === "existing" ? (
                  <motion.div key="existing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.18 }} style={{ marginTop: 14 }}>
                    {myCollectionsState.error ? <div style={{ color: "var(--red)", marginBottom: 10 }}>{myCollectionsState.error}</div> : null}
                    {myCollections.length === 0 ? (
                      <div style={{ color: "var(--muted)", fontSize: 13 }}>No collections found for this account.</div>
                    ) : (
                      <div style={{ display: "grid", gap: 10 }}>
                        <select
                          value={selectedCollection}
                          onChange={(e) => setSelectedCollection(e.target.value)}
                          style={{ ...softFieldStyle, padding: 11 }}
                        >
                          <option value="">Select a collection…</option>
                          {myCollections.map((c) => (
                            <option key={c.contractAddress} value={c.contractAddress}>
                              {c.name} • {truncateAddress(c.contractAddress)}
                            </option>
                          ))}
                        </select>

                        {selectedCollection ? (
                          <div style={{ fontSize: 12, color: "var(--muted)" }}>
                            Selected: <span style={{ fontFamily: "monospace", color: "var(--text)", wordBreak: "break-all" }}>{selectedCollection}</span>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </motion.div>
                ) : null}

                {collectionMode === "create" ? (
                  <motion.div key="create" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.18 }} style={{ marginTop: 14 }}>
                    {collectionCreateState.error ? <div style={{ color: "var(--red)", marginBottom: 10 }}>{collectionCreateState.error}</div> : null}
                    {collectionCreateState.success ? <div style={{ color: "var(--green)", marginBottom: 10 }}>{collectionCreateState.success}</div> : null}

                    <div style={{ display: "grid", gap: 12 }}>
                      <div>
                        <label style={{ display: "block", marginBottom: 8, fontWeight: 700 }}>Image *</label>
                        <input type="file" accept="image/*" onChange={handleCollectionImageChange} style={softFieldStyle} />
                        {collectionImagePreview ? (
                          <motion.img
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            src={collectionImagePreview}
                            alt="Collection preview"
                            style={{ marginTop: 10, width: "100%", height: 180, objectFit: "cover", borderRadius: 12, border: "1px solid var(--border)" }}
                          />
                        ) : null}
                      </div>

                      <div>
                        <label style={{ display: "block", marginBottom: 8, fontWeight: 700 }}>Name *</label>
                        <input
                          value={collectionForm.name}
                          onChange={(e) => setCollectionForm((s) => ({ ...s, name: e.target.value }))}
                          placeholder="My Collection"
                          style={softFieldStyle}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", marginBottom: 8, fontWeight: 700 }}>Description</label>
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

            <motion.div variants={cardVariants} className="card" initial="hidden" animate="show" style={{ padding: 16 }}>
              <div style={{ fontWeight: 800, marginBottom: 12 }}>NFT</div>

              <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 700 }}>Image *</label>
                  <input type="file" accept="image/*" onChange={handleImageChange} style={softFieldStyle} />
                  <AnimatePresence>
                    {imagePreview ? (
                      <motion.img
                        key="nft-preview"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        src={imagePreview}
                        alt="Preview"
                        style={{ marginTop: 10, width: "100%", maxHeight: 340, objectFit: "cover", borderRadius: 12, border: "1px solid var(--border)" }}
                      />
                    ) : null}
                  </AnimatePresence>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", marginBottom: 8, fontWeight: 700 }}>Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="My Awesome NFT"
                      required
                      style={softFieldStyle}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: 8, fontWeight: 700 }}>Rarity</label>
                    <input
                      type="text"
                      value={formData.rarity}
                      onChange={(e) => setFormData({ ...formData, rarity: e.target.value })}
                      placeholder="Common, Rare, Epic"
                      style={softFieldStyle}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 700 }}>Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your NFT..."
                    required
                    rows={4}
                    style={{ ...softFieldStyle, resize: "vertical", fontFamily: "inherit" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 700 }}>Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Art, Collectibles, Gaming"
                    style={softFieldStyle}
                  />
                </div>

                <button
                  type="submit"
                  className="btn primary"
                  disabled={
                    !isConnected ||
                    isLoading ||
                    !imageFile ||
                    (collectionMode === "existing" && !selectedCollection) ||
                    profileState.isLoading ||
                    !profileState.walletAddress ||
                    walletMismatch
                  }
                  style={{ width: "100%", padding: 12 }}
                >
                  {isLoading ? "Minting..." : collectionMode === "existing" ? "Mint to Collection" : "Mint NFT"}
                </button>
              </form>
            </motion.div>
          </div>
        </motion.div>
      </main>
      <Footer />
    </>
  );
}
