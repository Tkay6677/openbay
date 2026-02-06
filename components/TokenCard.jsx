import Sparkline from "./Sparkline";

export default function TokenCard({ token }) {
  const price = Number(token?.price) || 0;
  const change = Number(token?.change) || 0;
  const up = change >= 0;

  // Ensure spark data exists; if not, synthesize a small spark around current price
  const sparkData = Array.isArray(token?.spark) && token.spark.length
    ? token.spark
    : [price * 0.96, price * 0.98, price * 0.97, price * 1.0, price * 1.01, price];

  return (
    <div className="token-card">
      <div className="head">
        <img src={token?.image} alt={token?.name} />
        <div>
          <div className="name">{token?.name}</div>
          <div className="sub">{token?.symbol}</div>
        </div>
      </div>
      <Sparkline data={sparkData} up={up} />
      <div className="price-row">
        <span>${price.toFixed(4)}</span>
        <span className={`delta ${up ? "up" : "down"}`}>{up ? "+" : ""}{change.toFixed(1)}%</span>
      </div>
    </div>
  );
}