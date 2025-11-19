"use client";
import { useEffect, useMemo, useState } from "react";
import TokenCard from "./TokenCard";

export default function TokenCarousel({ tokens = [], intervalMs = 5000 }) {
  const [index, setIndex] = useState(0);
  const count = tokens.length;
  const current = tokens[index % count];

  useEffect(() => {
    if (!count) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), intervalMs);
    return () => clearInterval(id);
  }, [count, intervalMs]);

  const dots = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);
  const next = () => setIndex((i) => (i + 1) % count);
  const prev = () => setIndex((i) => (i - 1 + count) % count);

  if (!current) return null;

  return (
    <div className="token-carousel">
      <div className="tc-slide">
        <TokenCard token={current} />
      </div>
      <button className="tc-arrow left" aria-label="Previous" onClick={prev}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button className="tc-arrow right" aria-label="Next" onClick={next}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className="tc-dots">
        {dots.map((d) => (
          <button key={d} className={`dot ${d === index ? "active" : ""}`} aria-label={`Go to ${d + 1}`} onClick={() => setIndex(d)} />
        ))}
      </div>
    </div>
  );
}