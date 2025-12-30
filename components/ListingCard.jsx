import Link from "next/link";
import { formatPrice } from "../lib/utils";

export default function ListingCard({ listing }) {
  // Handle both listing objects and transformed asset objects
  const listingId = listing.listingId || listing.id;
  const contractAddress = listing.contractAddress || listing.assetContractAddress;
  const tokenId = listing.tokenId?.toString() || listing.tokenId;
  const name = listing.name || listing.asset?.name || `NFT #${tokenId}`;
  const collection = listing.collection || listing.asset?.collection?.name || "Unknown Collection";
  const image = listing.image || listing.asset?.image || "/placeholder-nft.png";
  const priceEth = listing.priceEth || formatPrice(listing.buyoutPricePerToken || listing.pricePerToken || 0);
  const owner = listing.owner || listing.sellerAddress;

  const href = `/asset/${contractAddress}/${tokenId}?listingId=${listingId}`;

  return (
    <Link href={href} className="card" aria-label={`${name} details`}>
      <img src={image} alt={name} loading="lazy" onError={(e) => {
        e.target.src = "https://via.placeholder.com/400x400?text=NFT";
      }} />
      <div className="meta">
        <div className="title">{name}</div>
        <div className="sub">{collection}</div>
        <div className="price">
          <span>Price</span>
          <span>{priceEth} ETH</span>
        </div>
      </div>
    </Link>
  );
}

