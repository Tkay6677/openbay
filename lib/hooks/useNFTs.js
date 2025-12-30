"use client";
import { useNFTs, useNFT, useOwnedNFTs } from "@thirdweb-dev/react";
import { useNFTContract } from "./useContracts";

/**
 * Hook to get all NFTs in a collection
 */
export function useCollectionNFTs(options = {}) {
  const { contract } = useNFTContract();
  const { data: nfts, isLoading, error } = useNFTs(contract, {
    start: options.start || 0,
    count: options.count || 100,
  });

  return {
    nfts: nfts || [],
    isLoading,
    error,
  };
}

/**
 * Hook to get single NFT by token ID
 */
export function useNFTDetails(tokenId) {
  const { contract } = useNFTContract();
  const { data: nft, isLoading, error } = useNFT(contract, tokenId);

  return {
    nft,
    isLoading,
    error,
  };
}

/**
 * Hook to get user's owned NFTs
 */
export function useUserNFTs(walletAddress) {
  const { contract } = useNFTContract();
  const { data: ownedNFTs, isLoading, error } = useOwnedNFTs(
    contract,
    walletAddress
  );

  return {
    ownedNFTs: ownedNFTs || [],
    isLoading,
    error,
  };
}

