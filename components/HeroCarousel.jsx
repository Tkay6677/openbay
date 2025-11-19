"use client";
import { useEffect, useMemo, useState } from "react";

export default function HeroCarousel({ items = [], intervalMs = 6000 }) {
  const [index, setIndex] = useState(0);
  const count = items.length;
  const current = items[index % count];

  useEffect(() => {
    if (!count) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), intervalMs);
    return () => clearInterval(id);
  }, [count, intervalMs]);

  const next = () => setIndex((i) => (i + 1) % count);
  const prev = () => setIndex((i) => (i - 1 + count) % count);

  const dots = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);

  if (!current) return null;

  return (
    <div className="carousel">
      <div className="banner">
        <img src={current.image} alt={current.title} />
        <div className="title">{current.title}</div>
        {current.by && <div className="subtitle">{current.by}</div>}
        <button className="arrow left" aria-label="Previous" onClick={prev}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button className="arrow right" aria-label="Next" onClick={next}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="dots">
          {dots.map((d) => (
            <button key={d} aria-label={`Go to ${d + 1}`} className={`dot ${d === index ? "active" : ""}`} onClick={() => setIndex(d)} />
          ))}
        </div>
      </div>
      <div className="stats">
        {current.stats.map((s, i) => (
          <div className="stat" key={i}>
            <div className="label">{s.label}</div>
            <div className="value">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}