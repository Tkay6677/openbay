import Link from "next/link";

export default function AssetCard({ asset }) {
  const href = `/asset/${asset.contractAddress}/${asset.tokenId}`;
  return (
    <Link href={href} className="card" aria-label={`${asset.name} details`}>
      <img src={asset.image} alt={asset.name} loading="lazy" />
      <div className="meta">
        <div className="title">{asset.name}</div>
        <div className="sub">{asset.collection}</div>
        <div className="price">
          <span>Price</span>
          <span>{asset.priceEth} ETH</span>
        </div>
      </div>
    </Link>
  );
}