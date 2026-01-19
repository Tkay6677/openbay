import { ethers } from "ethers";

const nftPlaceholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#121826"/><stop offset="1" stop-color="#0c1016"/></linearGradient></defs><rect width="800" height="800" fill="url(#g)"/><rect x="40" y="40" width="720" height="720" rx="60" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.10)" stroke-width="4"/><text x="400" y="420" text-anchor="middle" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial" font-size="72" fill="rgba(255,255,255,0.55)" font-weight="800">NFT</text></svg>`;
export const NFT_PLACEHOLDER_SRC = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(nftPlaceholderSvg)}`;

/**
 * Convert price between ETH and wei
 */
export function formatPrice(price, toWei = false) {
  if (!price) return "0";
  try {
    if (toWei) {
      return ethers.utils.parseEther(price.toString());
    } else {
      // If already a BigNumber, format it
      if (price && (price._hex || price._isBigNumber)) {
        return ethers.utils.formatEther(price);
      }
      // Handle string or number
      if (typeof price === "string" && price.includes(".")) {
        return price;
      }
      // Try to format if it's a hex string or number
      try {
        return ethers.utils.formatEther(price.toString());
      } catch {
        return price.toString();
      }
    }
  } catch (error) {
    console.error("Error formatting price:", error);
    return "0";
  }
}

/**
 * Shorten wallet address for display
 * Example: 0x1234...5678
 */
export function truncateAddress(address, startChars = 6, endChars = 4) {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Calculate time remaining for listing/auction
 */
export function getTimeRemaining(endTimestamp) {
  if (!endTimestamp) return 'Unknown';
  
  const now = new Date().getTime();
  const end = new Date(endTimestamp).getTime();
  const timeLeft = end - now;

  if (timeLeft <= 0) return 'Ended';

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Validate image file before upload
 */
export function validateImageFile(file) {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload JPG, PNG, GIF, or WebP');
  }

  if (file.size > maxSize) {
    throw new Error('File too large. Maximum size is 10MB');
  }

  return true;
}

/**
 * Parse and handle common transaction errors
 */
export function handleTransactionError(error) {
  const errorMessage = error?.message || error?.toString() || '';
  
  if (errorMessage.includes('user rejected') || errorMessage.includes('User rejected')) {
    return 'Transaction was cancelled';
  } else if (errorMessage.includes('insufficient funds')) {
    return 'Insufficient funds for transaction';
  } else if (errorMessage.includes('gas required exceeds')) {
    return 'Transaction would fail. Please check your inputs';
  } else if (errorMessage.includes('execution reverted')) {
    return 'Transaction failed. Please check your inputs and try again';
  } else {
    return errorMessage || 'Transaction failed. Please try again';
  }
}

/**
 * Filter NFTs by category, price range, etc.
 */
export function filterNFTs(nfts, filters) {
  if (!nfts || !Array.isArray(nfts)) return [];
  
  return nfts.filter(nft => {
    // Filter by category
    if (filters.category && filters.category !== 'all') {
      if (nft.metadata?.properties?.category !== filters.category) return false;
    }

    // Filter by price range
    if (filters.minPrice) {
      const nftPrice = parseFloat(nft.price || 0);
      if (nftPrice < filters.minPrice) return false;
    }
    if (filters.maxPrice) {
      const nftPrice = parseFloat(nft.price || 0);
      if (nftPrice > filters.maxPrice) return false;
    }

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const name = nft.metadata?.name?.toLowerCase() || '';
      const description = nft.metadata?.description?.toLowerCase() || '';
      if (!name.includes(query) && !description.includes(query)) return false;
    }

    return true;
  });
}

