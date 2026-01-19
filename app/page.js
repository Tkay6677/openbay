import Link from "next/link";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";

const stats = [
  { label: "24h Volume", value: "$2.4M" },
  { label: "Active Traders", value: "18,402" },
  { label: "Collections", value: "1,120" },
  { label: "NFTs Listed", value: "72,009" },
];

export default function LandingPage() {
  return (
    <>
      <NavBar variant="landing" />
      <main className="landing">
        <section className="landing-hero">
          <div className="container landing-hero-inner">
            <div>
              <div className="landing-eyebrow">Cosmos NFT Marketplace</div>
              <h1 className="landing-title">
                Discover, collect, and trade <strong>Cosmos NFTs</strong>
              </h1>
              <p className="landing-subtitle">
                A fast, modern marketplace experience—built for creators and collectors across the Cosmos ecosystem.
              </p>
              <div className="landing-cta">
                <Link href="/market" className="btn primary">
                  Launch Marketplace
                </Link>
                <Link href="/explore" className="btn landing-btn-secondary">
                  Explore collections
                </Link>
              </div>

              <div className="landing-stats" aria-label="Marketplace stats">
                {stats.map((s) => (
                  <div key={s.label} className="landing-stat">
                    <div className="landing-stat-label">{s.label}</div>
                    <div className="landing-stat-value">{s.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="landing-hero-card">
              <div className="landing-card-glow" aria-hidden />
              <div className="landing-nft-card" aria-label="Featured NFT">
                <div className="landing-nft-media">
                  <img src="https://i.audiomack.com/harmora/16363094-1.webp" alt="Featured Cosmos NFT artwork" loading="lazy" />
                  <div className="landing-nft-overlay" aria-hidden />
                  <div className="landing-nft-badges" aria-hidden>
                    <span className="landing-nft-badge featured">Featured</span>
                    <span className="landing-nft-badge live">Live</span>
                  </div>
                </div>
                <div className="landing-nft-meta">
                  <div className="landing-nft-title">Celestial Drift</div>
                  <div className="landing-nft-creator">
                    <span className="landing-nft-avatar" aria-hidden />
                    <span className="landing-nft-creator-text">
                      by <strong>Cosmos Originals</strong>
                    </span>
                  </div>
                  <div className="landing-nft-row">
                    <span className="landing-nft-pill">Cosmos Originals</span>
                    <span className="landing-nft-price">
                      <strong>24.5</strong> ATOM
                    </span>
                  </div>
                  <div className="landing-nft-row">
                    <span style={{ color: "rgba(255, 255, 255, 0.55)" }}>#0142</span>
                    <span style={{ color: "rgba(255, 255, 255, 0.55)" }}>1/1</span>
                  </div>
                  <div className="landing-nft-actions">
                    <Link href="/market" className="btn primary landing-nft-action">
                      View in Marketplace
                    </Link>
                    <Link href="/explore" className="btn landing-btn-secondary landing-nft-action">
                      View Collections
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section">
          <div className="container">
            <div className="landing-section-head">
              <h2>Everything you need to start</h2>
              <p>Mint new NFTs, list instantly, and keep track of activity and offers.</p>
            </div>
            <div className="landing-feature-grid">
              <div className="landing-feature-card">
                <div className="landing-feature-top">
                  <div className="landing-feature-icon" aria-hidden>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="landing-feature-text">
                    <h3>Mint in minutes</h3>
                    <p>Create NFTs with on-chain metadata and flexible supply options.</p>
                  </div>
                </div>
              </div>
              <div className="landing-feature-card">
                <div className="landing-feature-top">
                  <div className="landing-feature-icon" aria-hidden>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M7 7h14l-2 7H9L7 7Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                      <path d="M7 7L5 3H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M9 21a1 1 0 100-2 1 1 0 000 2Z" fill="currentColor" />
                      <path d="M18 21a1 1 0 100-2 1 1 0 000 2Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div className="landing-feature-text">
                    <h3>List and trade</h3>
                    <p>Buy now listings, offers, and a clean checkout flow with wallet support.</p>
                  </div>
                </div>
              </div>
              <div className="landing-feature-card">
                <div className="landing-feature-top">
                  <div className="landing-feature-icon" aria-hidden>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M4 18l6-6 4 4 6-8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path d="M20 8V4h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="landing-feature-text">
                    <h3>Track performance</h3>
                    <p>View floor movement, collection stats, and activity in one place.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section">
          <div className="container">
            <div className="landing-cta-panel">
              <div className="landing-cta-panel-left">
                <div className="landing-cta-panel-badge">Get started</div>
                <div className="landing-cta-panel-title">Ready to explore Cosmos NFTs?</div>
                <div className="landing-cta-panel-sub">Browse trending collections and discover your next favorite drop.</div>
              </div>
              <div className="landing-cta">
                <Link href="/market" className="btn primary">
                  Launch Marketplace
                </Link>
                <Link href="/mint" className="btn landing-btn-secondary">
                  Create an NFT
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
