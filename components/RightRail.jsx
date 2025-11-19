import { collections } from "../lib/sampleData";

export default function RightRail() {
  return (
    <aside className="rail">
      <div className="section-rail">
        <div className="rail-header">Collection</div>
        <div>
          {collections.map((c, i) => (
            <div className="collection-row" key={i}>
              <img src={c.image} alt={c.name} />
              <div>
                <div className="name">{c.name}</div>
                <div className="sub">Floor</div>
              </div>
              <div className="price">
                <div>{c.floor.toFixed(2)} ETH</div>
                <div className={`delta ${c.delta >= 0 ? "up" : "down"}`}>{c.delta >= 0 ? "+" : ""}{c.delta}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}