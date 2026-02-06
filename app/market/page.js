"use client";
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import Sidebar from "../../components/Sidebar";
import RightRail from "../../components/RightRail";
import ControlsBar from "../../components/ControlsBar";
import AssetCard from "../../components/AssetCard";
import HeroCarousel from "../../components/HeroCarousel";
import TokenCarousel from "../../components/TokenCarousel";
import TokenCard from "../../components/TokenCard";
import MobileCollections from "../../components/MobileCollections";
import Sparkline from "../../components/Sparkline";
import { useEffect, useState } from "react";
import trendingData from "../../trending.json";

// Initial fallback tokens (used until live data loads or if fetch fails)
const initialTokens = [
  {
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTJDn0ojTITvcdAzMsfBMJaZC4STaDHzduleQ&s",
    name: "Ethereum",
    symbol: "ETH",
    price: 2800.5,
    change: 2.3,
    spark: [2750, 2780, 2820, 2790, 2810, 2800],
  },
  {
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRaSEEUJQPS_ARZeaL2PTiA5K0qDjwFzMoVQA&s",
    name: "Bitcoin",
    symbol: "BTC",
    price: 43500.25,
    change: -1.1,
    spark: [44050, 43900, 43780, 43620, 43480, 43500],
  },
  {
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTsIsJL3zRgUrkD3yE3lD7LK0wZWSiRyY1GVg&s",
    name: "Solana",
    symbol: "SOL",
    price: 98.42,
    change: 4.8,
    spark: [92, 93.5, 95.2, 97.1, 98.9, 98.4],
  },
  {
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSswKRfheiyB5QHc0BgZ8oh5ErqyaX0M_ewbA&s",
    name: "Base",
    symbol: "BASE",
    price: 0.8543,
    change: -0.7,
    spark: [0.86, 0.858, 0.855, 0.852, 0.853, 0.854],
  },
  {
    image: "https://picsum.photos/seed/arb/120/120",
    name: "Arbitrum",
    symbol: "ARB",
    price: 1.7321,
    change: 1.9,
    spark: [1.69, 1.7, 1.72, 1.71, 1.74, 1.73],
  },
];

// `mockTokens` state and market fetch are initialized inside the component
// to comply with React Hooks rules (hooks must be called from component body).

export default function MarketPage() {
  const [featured, setFeatured] = useState([]);
  const [newListings, setNewListings] = useState([]);
  const [newListingsLoading, setNewListingsLoading] = useState(true);
  const [heroBanners, setHeroBanners] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [trendingRange, setTrendingRange] = useState("24h");
  const trustedBy = ["base", "Barbie", "Paris", "Ubisoft", "FOX Deportes", "rekt", "UFC", "Universal", "Hot Wheels", "LEDGER"];

  // Token strip state: start with fallback, then attempt to load live prices
  const [tokens, setTokens] = useState(initialTokens);

  // Fetch live token market data from CoinGecko and update displayed tokens.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const ids = ["ethereum", "bitcoin", "solana", "base", "arbitrum"].join(",");
        const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&sparkline=true`;
        const res = await fetch(url);
        const data = await res.json().catch(() => []);
        if (!Array.isArray(data) || data.length === 0) return;

        const tokens = data.map((t) => ({
          image: t.image,
          name: t.name,
          symbol: (t.symbol || "").toUpperCase(),
          price: t.current_price,
          change: t.price_change_percentage_24h_in_currency ?? t.price_change_percentage_24h ?? 0,
          spark: (t.sparkline_in_7d?.price ?? []).slice(-6),
        }));

        if (!cancelled && tokens.length) setTokens(tokens);
      } catch (err) {
        console.error("Error fetching token market data:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/assets");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        const list = Array.isArray(data.assets) ? data.assets : [];
        if (!cancelled) setFeatured(list.slice(0, 6));
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setNewListingsLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/assets?listed=true&limit=12");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        const list = Array.isArray(data.assets) ? data.assets : [];
        if (!cancelled) setNewListings(list);
      } catch {
        if (!cancelled) setNewListings([]);
      } finally {
        if (!cancelled) setNewListingsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/hero-banners?limit=5");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        const list = Array.isArray(data.banners) ? data.banners : [];
        if (!cancelled) setHeroBanners(list);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const formatCompactUSD = (value) => {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) return "$0";
    const abs = Math.abs(n);
    if (abs >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
    if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
    return `$${Math.round(n).toLocaleString()}`;
  };

  const formatFloorUSD = (value) => {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) return "$0";
    if (Math.abs(n) >= 10_000) return formatCompactUSD(n);
    return `$${Math.round(n).toLocaleString()}`;
  };

  const formatPct = (value) => {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) return "—";
    const sign = n > 0 ? "+" : "";
    return `${sign}${n.toFixed(1)}%`;
  };

  return (
    <>
      <NavBar />
      <ControlsBar />
      <div className="container" style={{ paddingTop: 12 }}>
        <div className={`layout ${expanded ? "expanded" : "collapsed"}`}>
          <Sidebar expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
          <main>
            <HeroCarousel items={heroBanners} />
            <div style={{ marginTop: 14 }}>
              <div className="desktop-only">
                <div className="token-strip">
                  {tokens.slice(0, 4).map((t) => (
                    <TokenCard key={t.symbol} token={t} />
                  ))}
                </div>
              </div>
              <div className="mobile-only">
                <TokenCarousel tokens={tokens} intervalMs={5000} />
              </div>
            </div>
            <MobileCollections />

            <div className="section">
              <h2>Featured Collections</h2>
              {featured.length === 0 ? (
                <div style={{ color: "var(--muted)" }}>No featured NFTs yet</div>
              ) : (
                <div className="grid">
                  {featured.map((a) => (
                    <AssetCard key={`featured-${a.contractAddress}-${a.tokenId}`} asset={a} />
                  ))}
                </div>
              )}
            </div>

            <div className="section">
              <h2>New Listings</h2>
              {newListingsLoading ? (
                <div style={{ color: "var(--muted)" }}>Loading new listings...</div>
              ) : newListings.length === 0 ? (
                <div style={{ color: "var(--muted)" }}>No new listings yet</div>
              ) : (
                <div className="grid">
                  {newListings.map((a) => (
                    <AssetCard key={`new-${a.contractAddress}-${a.tokenId}`} asset={a} />
                  ))}
                </div>
              )}
            </div>

            <div className="section trending">
              <div className="trending-header">
                <h2>Trending</h2>
                <div className="trending-controls">
                  <button className="btn trending-list-btn">List collection</button>
                  <div className="trending-ranges" role="tablist" aria-label="Trending range">
                    {["1h", "6h", "24h", "7d", "30d"].map((r) => (
                      <button
                        key={r}
                        type="button"
                        className={`trending-range-btn${trendingRange === r ? " active" : ""}`}
                        onClick={() => setTrendingRange(r)}
                        aria-selected={trendingRange === r}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="trending-scroll">
                <div className="trending-table">
                  <div className="trending-row trending-head">
                    <div className="tr-cell collection">Collection</div>
                    <div className="tr-right tr-cell floor">Floor</div>
                    <div className="tr-right tr-cell change">FL. CH {trendingRange}</div>
                    <div className="tr-right tr-cell offer">Top offer</div>
                    <div className="tr-right tr-cell sales">Sales 24h</div>
                    <div className="tr-right tr-cell owners">Owners</div>
                    <div className="tr-right tr-cell listed">Listed</div>
                    <div className="tr-right tr-cell volume">Volume {trendingRange}</div>
                    <div className="tr-right tr-cell spark">Floor {trendingRange}</div>
                  </div>

                  {trendingData.map((row, idx) => {
                    const change = row?.changeByRangePct?.[trendingRange];
                    const isUp = typeof change === "number" && change >= 0;
                    const volume = row?.volumeByRangeUsd?.[trendingRange];
                    const spark = row?.sparklineByRange?.[trendingRange] || row?.sparklineByRange?.["24h"] || [];

                    return (
                      <div key={row.name} className="trending-row trending-body">
                        <div className="tr-collection tr-cell collection">
                          <div className="tr-rank">{idx + 1}</div>
                          <div className="tr-collection-meta">
                            <div className="tr-collection-name">
                              <span className="tr-collection-text">{row.name}</span>
                              {row.verified ? <span className="tr-verified" aria-label="Verified" /> : null}
                            </div>
                          </div>
                        </div>

                        <div className="tr-right tr-cell floor">
                          <div className="tr-metric-label">Floor</div>
                          <div className="tr-metric-value">{formatFloorUSD(row.floorUsd)}</div>
                        </div>
                        <div className={`tr-right tr-cell change tr-change ${isUp ? "up" : "down"}`}>
                          <div className="tr-metric-label">FL. CH {trendingRange}</div>
                          <div className="tr-metric-value">{formatPct(change)}</div>
                        </div>
                        <div className="tr-right tr-cell offer">
                          <div className="tr-metric-label">Top offer</div>
                          <div className="tr-metric-value">{formatFloorUSD(row.topOfferUsd)}</div>
                        </div>
                        <div className="tr-right tr-cell sales">
                          <div className="tr-metric-label">Sales 24h</div>
                          <div className="tr-metric-value">{Number(row.sales24h || 0).toLocaleString()}</div>
                        </div>
                        <div className="tr-right tr-cell owners">
                          <div className="tr-metric-label">Owners</div>
                          <div className="tr-metric-value">{Number(row.owners || 0).toLocaleString()}</div>
                        </div>
                        <div className="tr-right tr-cell listed">
                          <div className="tr-metric-label">Listed</div>
                          <div className="tr-metric-value">{typeof row.listedPct === "number" ? `${row.listedPct.toFixed(1)}%` : "—"}</div>
                        </div>
                        <div className="tr-right tr-cell volume">
                          <div className="tr-metric-label">Volume {trendingRange}</div>
                          <div className="tr-metric-value">{formatCompactUSD(volume)}</div>
                        </div>
                        <div className="tr-right tr-cell spark">
                          <div className="tr-metric-label">Floor {trendingRange}</div>
                          <span className={`tr-spark ${isUp ? "up" : "down"}`}>
                            <Sparkline data={spark} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="section trusted">
              <h2 className="trusted-title">Trusted by</h2>
              <div className="trusted-grid" aria-label="Trusted by">
                {trustedBy.map((brand) => (
                  <div key={brand} className="trusted-card">
                    <div className="trusted-logo" aria-label={brand}>
                      {brand}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
          <RightRail />
        </div>
      </div>
      <Footer />
    </>
  );  
}

