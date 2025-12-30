"use client";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import Sidebar from "../components/Sidebar";
import RightRail from "../components/RightRail";
import ControlsBar from "../components/ControlsBar";
import AssetCard from "../components/AssetCard";
import HeroCarousel from "../components/HeroCarousel";
import MobileCollections from "../components/MobileCollections";
import MobileDrawer from "../components/MobileDrawer";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [heroBanners, setHeroBanners] = useState([]);
  const [expanded, setExpanded] = useState(false);

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

  return (
    <>
      <NavBar />
      <ControlsBar />
      <div className="container" style={{ paddingTop: 12 }}>
        <div className={`layout ${expanded ? "expanded" : "collapsed"}`}>
          <Sidebar expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
          <main>
            <HeroCarousel items={heroBanners} />
            <MobileCollections />

            <div className="section">
              <h2>Featured Collections</h2>
              {featured.length === 0 ? (
                <div style={{ color: "var(--muted)" }}>No featured NFTs yet</div>
              ) : (
                <>
                  <div className="desktop-only">
                    <div className="grid">
                      {featured.map((a) => (
                        <AssetCard key={`featured-${a.contractAddress}-${a.tokenId}`} asset={a} />
                      ))}
                    </div>
                  </div>
                  <div className="mobile-only">
                    <div className="h-scroll">
                      {featured.map((a) => (
                        <AssetCard key={`featured-${a.contractAddress}-${a.tokenId}`} asset={a} />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </main>
          <RightRail />
        </div>
      </div>
      <MobileDrawer />
      <Footer />
    </>
  );
}
