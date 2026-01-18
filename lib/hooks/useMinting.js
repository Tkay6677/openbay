"use client";
import { useSigner } from "@thirdweb-dev/react";
import { useState } from "react";
import { validateImageFile } from "../utils";

/**
 * Hook for NFT minting operations
 */
export function useMinting() {
  const signer = useSigner();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const fallbackContractAddress = "cosmos-virtual";

  const getMintContractAddress = () => {
    const envAddress = (process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS || "").trim().toLowerCase();
    return envAddress || fallbackContractAddress;
  };

  /**
   * Upload image to IPFS
   */
  const uploadImage = async (file) => {
    try {
      validateImageFile(file);
      const form = new FormData();
      form.append("file", file, file?.name || "upload");
      const res = await fetch("/api/ipfs/upload", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "IPFS upload failed");
      const url = String(data?.url || "").trim();
      if (!url) throw new Error("IPFS upload failed");
      return url;
    } catch (err) {
      const errorMessage = err?.message || "Error uploading image";
      setError(errorMessage);
      throw err;
    }
  };

  /**
   * Mint NFT with image upload
   */
  const mintNFTWithImage = async (file, metadata) => {
    try {
      setIsLoading(true);
      setError(null);

      // Step 1: Upload image to IPFS
      const imageUri = await uploadImage(file);

      if (!signer) throw new Error("Wallet signer not available");
      const requestedContractAddress = (metadata?.contractAddress || "").trim().toLowerCase();
      const contractAddress = requestedContractAddress || getMintContractAddress();

      const nowIso = new Date().toISOString();
      const message = `Mint NFT on Cosmos\nContract: ${contractAddress}\nName: ${metadata?.name || ""}\nTime: ${nowIso}`;
      const signature = await signer.signMessage(message);

      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contractAddress,
          name: metadata?.name || "",
          description: metadata?.description || "",
          image: imageUri,
          category: metadata?.category || "",
          rarity: metadata?.rarity || "",
          traits: Array.isArray(metadata?.traits) ? metadata.traits : [],
          message,
          signature,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Mint failed");

      const tokenId = data?.tokenId ? String(data.tokenId) : "";
      if (!tokenId) throw new Error("Mint failed");

      return {
        tokenId,
        contractAddress,
        imageUri,
        asset: data?.asset || null,
      };
    } catch (err) {
      const errorMessage = err?.message || "Error in minting flow";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Mint NFT (simple - with existing IPFS URI)
   */
  const mintNFT = async (nftData) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!signer) throw new Error("Wallet signer not available");
      const contractAddress = getMintContractAddress();

      const nowIso = new Date().toISOString();
      const message = `Mint NFT on Cosmos\nContract: ${contractAddress}\nName: ${nftData?.name || ""}\nTime: ${nowIso}`;
      const signature = await signer.signMessage(message);

      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contractAddress,
          name: nftData?.name || "",
          description: nftData?.description || "",
          image: nftData?.imageUri || "",
          category: nftData?.category || "",
          rarity: nftData?.rarity || "",
          traits: Array.isArray(nftData?.traits) ? nftData.traits : [],
          message,
          signature,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Mint failed");

      const tokenId = data?.tokenId ? String(data.tokenId) : "";
      if (!tokenId) throw new Error("Mint failed");

      return {
        tokenId,
        contractAddress,
        imageUri: nftData?.imageUri || "",
        asset: data?.asset || null,
      };
    } catch (err) {
      const errorMessage = err?.message || "Error minting NFT";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Batch mint NFTs
   */
  const batchMintNFTs = async (nftsData) => {
    try {
      setIsLoading(true);
      setError(null);

      throw new Error("Batch minting is not supported");
    } catch (err) {
      const errorMessage = err?.message || "Error batch minting";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    uploadImage,
    mintNFT,
    mintNFTWithImage,
    batchMintNFTs,
    isLoading,
    error,
  };
}

