import Sparkline from "./Sparkline";

export default function TokenCard({ token }) {
  const up = token.change >= 0;
  return (
    <div className="token-card">
      <div className="head">
        <img src={token.image} alt={token.name} />
        <div>
          <div className="name">{token.name}</div>
          <div className="sub">{token.symbol}</div>
        </div>
      </div>
      <Sparkline data={token.spark} />
      <div className="price-row">
        <span>${token.price.toFixed(4)}</span>
        <span className={`delta ${up ? "up" : "down"}`}>{up ? "+" : ""}{token.change.toFixed(1)}%</span>
      </div>
    </div>
  );
}