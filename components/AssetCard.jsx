"use client";
import Link from "next/link";
import { NFT_PLACEHOLDER_SRC } from "../lib/utils";

export default function AssetCard({ asset }) {
  const href = `/asset/${asset.contractAddress}/${asset.tokenId}`;
  const name = asset?.name || `NFT #${asset?.tokenId ?? ""}`;
  const image = asset?.image || NFT_PLACEHOLDER_SRC;
  return (
    <Link href={href} className="card nft-card" aria-label={`${name} details`}>
      <img
        src={image}
        alt={name}
        loading="lazy"
        onError={(e) => {
          e.currentTarget.src = NFT_PLACEHOLDER_SRC;
        }}
      />
      <div className="meta">
        <div className="title">{name}</div>
        <div className="sub">{asset.collection}</div>
        <div className="price">
          <span>Price</span>
          <span>{asset.priceEth} ETH</span>
        </div>
      </div>
    </Link>
  );
}
