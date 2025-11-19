export default function DropCard({ drop }) {
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <img src={drop.image} alt={drop.title} style={{ height: 140, objectFit: "cover" }} />
      <div className="meta">
        <div className="title">{drop.title}</div>
        <div className="sub">{drop.subtitle}</div>
      </div>
    </div>
  );
}