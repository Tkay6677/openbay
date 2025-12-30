"use client";
import { useContract } from "@thirdweb-dev/react";

const NFT_COLLECTION_ADDRESS = process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS;
const MARKETPLACE_ADDRESS = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS;

/**
 * Hook to initialize NFT Collection contract
 */
export function useNFTContract() {
  const { contract, isLoading, error } = useContract(
    NFT_COLLECTION_ADDRESS,
    "nft-collection"
  );

  return {
    contract,
    isLoading,
    error,
    isReady: !!contract && !isLoading,
  };
}

/**
 * Hook to initialize Marketplace contract
 */
export function useMarketplaceContract() {
  const { contract, isLoading, error } = useContract(
    MARKETPLACE_ADDRESS,
    "marketplace-v3"
  );

  return {
    contract,
    isLoading,
    error,
    isReady: !!contract && !isLoading,
  };
}

