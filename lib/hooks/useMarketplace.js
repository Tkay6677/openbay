"use client";
import { useActiveListings, useContract } from "@thirdweb-dev/react";
import { useMarketplaceContract } from "./useContracts";
import { useState } from "react";

/**
 * Hook to get all active marketplace listings
 */
export function useMarketplaceListings() {
  const { contract } = useMarketplaceContract();
  const { data: listings, isLoading, error } = useActiveListings(contract);

  return {
    listings: listings || [],
    isLoading,
    error,
  };
}

/**
 * Hook for marketplace operations (buy, list, etc.)
 */
export function useMarketplaceOperations() {
  const { contract: marketplaceContract } = useMarketplaceContract();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Create direct listing (fixed price)
   */
  const createDirectListing = async (listingData) => {
    if (!marketplaceContract) {
      throw new Error("Marketplace contract not initialized");
    }

    try {
      setIsLoading(true);
      setError(null);

      const tx = await marketplaceContract.directListings.createListing({
        assetContractAddress: listingData.nftContractAddress,
        tokenId: listingData.tokenId,
        pricePerToken: listingData.price,
        startTimestamp: new Date(),
        endTimestamp: new Date(
          Date.now() + listingData.durationInDays * 24 * 60 * 60 * 1000
        ),
        quantity: 1,
        currencyContractAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // Native token
      });

      return {
        listingId: tx.id,
        receipt: tx.receipt,
      };
    } catch (err) {
      const errorMessage = err?.message || "Error creating listing";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Buy NFT from direct listing
   */
  const buyNFT = async (listingId, buyerAddress) => {
    if (!marketplaceContract) {
      throw new Error("Marketplace contract not initialized");
    }

    try {
      setIsLoading(true);
      setError(null);

      const tx = await marketplaceContract.directListings.buyFromListing(
        listingId,
        1, // quantity (always 1 for ERC-721)
        buyerAddress
      );

      return tx;
    } catch (err) {
      const errorMessage = err?.message || "Error buying NFT";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Cancel a listing
   */
  const cancelListing = async (listingId) => {
    if (!marketplaceContract) {
      throw new Error("Marketplace contract not initialized");
    }

    try {
      setIsLoading(true);
      setError(null);

      const tx = await marketplaceContract.directListings.cancelListing(listingId);
      return tx;
    } catch (err) {
      const errorMessage = err?.message || "Error canceling listing";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Update listing price
   */
  const updateListingPrice = async (listingId, newPrice) => {
    if (!marketplaceContract) {
      throw new Error("Marketplace contract not initialized");
    }

    try {
      setIsLoading(true);
      setError(null);

      const tx = await marketplaceContract.directListings.updateListing(listingId, {
        pricePerToken: newPrice,
      });
      return tx;
    } catch (err) {
      const errorMessage = err?.message || "Error updating listing";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Make an offer on NFT
   */
  const makeOffer = async (offerData) => {
    if (!marketplaceContract) {
      throw new Error("Marketplace contract not initialized");
    }

    try {
      setIsLoading(true);
      setError(null);

      const tx = await marketplaceContract.offers.makeOffer({
        assetContractAddress: offerData.nftContractAddress,
        tokenId: offerData.tokenId,
        totalPrice: offerData.offerPrice,
        quantity: 1,
        expirationDate: new Date(
          Date.now() + offerData.expirationHours * 60 * 60 * 1000
        ),
        currencyContractAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      });

      return {
        offerId: tx.id,
        receipt: tx.receipt,
      };
    } catch (err) {
      const errorMessage = err?.message || "Error making offer";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Accept an offer
   */
  const acceptOffer = async (offerId) => {
    if (!marketplaceContract) {
      throw new Error("Marketplace contract not initialized");
    }

    try {
      setIsLoading(true);
      setError(null);

      const tx = await marketplaceContract.offers.acceptOffer(offerId);
      return tx;
    } catch (err) {
      const errorMessage = err?.message || "Error accepting offer";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Create auction listing
   */
  const createAuctionListing = async (auctionData) => {
    if (!marketplaceContract) {
      throw new Error("Marketplace contract not initialized");
    }

    try {
      setIsLoading(true);
      setError(null);

      const tx = await marketplaceContract.englishAuctions.createAuction({
        assetContractAddress: auctionData.nftContractAddress,
        tokenId: auctionData.tokenId,
        minimumBidAmount: auctionData.startingBid,
        buyoutBidAmount: auctionData.buyoutPrice,
        startTimestamp: new Date(),
        endTimestamp: new Date(
          Date.now() + auctionData.durationInHours * 60 * 60 * 1000
        ),
        quantity: 1,
        currencyContractAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      });

      return {
        auctionId: tx.id,
        receipt: tx.receipt,
      };
    } catch (err) {
      const errorMessage = err?.message || "Error creating auction";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Place bid on auction
   */
  const placeBid = async (auctionId, bidAmount) => {
    if (!marketplaceContract) {
      throw new Error("Marketplace contract not initialized");
    }

    try {
      setIsLoading(true);
      setError(null);

      const tx = await marketplaceContract.englishAuctions.makeBid(
        auctionId,
        bidAmount
      );
      return tx;
    } catch (err) {
      const errorMessage = err?.message || "Error placing bid";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Close auction
   */
  const closeAuction = async (auctionId) => {
    if (!marketplaceContract) {
      throw new Error("Marketplace contract not initialized");
    }

    try {
      setIsLoading(true);
      setError(null);

      const tx = await marketplaceContract.englishAuctions.closeAuctionForBidder(auctionId);
      return tx;
    } catch (err) {
      const errorMessage = err?.message || "Error closing auction";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createDirectListing,
    buyNFT,
    cancelListing,
    updateListingPrice,
    makeOffer,
    acceptOffer,
    createAuctionListing,
    placeBid,
    closeAuction,
    isLoading,
    error,
  };
}

