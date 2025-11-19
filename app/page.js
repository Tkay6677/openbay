"use client";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import Sidebar from "../components/Sidebar";
import RightRail from "../components/RightRail";
import ControlsBar from "../components/ControlsBar";
import TokenCard from "../components/TokenCard";
import AssetCard from "../components/AssetCard";
import DropCard from "../components/DropCard";
import WeeklySales from "../components/WeeklySales";
import HeroCarousel from "../components/HeroCarousel";
import MobileCollections from "../components/MobileCollections";
import MobileDrawer from "../components/MobileDrawer";
import TokenCarousel from "../components/TokenCarousel";
import { assets, heroBanners, tokens, drops, weeklySales } from "../lib/sampleData";
import { useState } from "react";

export default function HomePage() {
  const featured = assets.slice(0, 6);
  const [expanded, setExpanded] = useState(false);
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
              <h2>Top Movers Today</h2>
              <div className="desktop-only">
                <div className="token-grid">
                  {tokens.map((t, i) => (
                    <TokenCard key={i} token={t} />
                  ))}
                </div>
              </div>
              <div className="mobile-only">
                <TokenCarousel tokens={tokens} />
              </div>
            </div>

            <div className="section">
              <h2>Featured Collections</h2>
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
            </div>

            <div className="section">
              <h2>Featured Drops</h2>
              <div className="desktop-only">
                <div className="grid">
                  {drops.slice(0, 4).map((d, i) => (
                    <DropCard key={i} drop={d} />
                  ))}
                </div>
              </div>
              <div className="mobile-only">
                <div className="h-scroll">
                  {drops.slice(0, 4).map((d, i) => (
                    <DropCard key={i} drop={d} />
                  ))}
                </div>
              </div>
            </div>

            <div className="section">
              <h2>Highest Weekly Sales</h2>
              <WeeklySales data={weeklySales} />
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