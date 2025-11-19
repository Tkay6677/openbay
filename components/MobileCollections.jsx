import { collections } from "../lib/sampleData";

export default function MobileCollections() {
  return (
    <section className="section mobile-only">
      <div className="card" style={{ overflow: "hidden" }}>
        <div className="rail-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Collection</span>
          <a href="#" className="btn">View all</a>
        </div>
        <div>
          {collections.slice(0, 5).map((c, i) => (
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
    </section>
  );
}