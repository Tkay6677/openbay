export default function Sparkline({ data = [], up = true, color = null }) {
  const w = 120, h = 36, pad = 2;

  const arr = Array.isArray(data) && data.length ? data : [0, 0, 0, 0, 0, 0];
  const max = Math.max(...arr);
  const min = Math.min(...arr);
  const range = max - min || 1;

  const step = (w - pad * 2) / (arr.length - 1 || 1);
  const points = arr.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");

  const strokeColor = color || (up ? "#16a34a" : "#ef4444");

  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={strokeColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
