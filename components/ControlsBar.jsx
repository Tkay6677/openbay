export default function ControlsBar() {
  return (
    <div className="container">
      <div className="controls">
          <div className="nav-filters desktop-only" aria-label="Chains">
                      <button type="button" className="nav-pill active">
                        All
                      </button>
                      <button type="button" className="nav-pill">
                        Ethereum
                      </button>
                      <button type="button" className="nav-pill">
                        Base
                      </button>
                      <button type="button" className="nav-pill">
                        MegaETH
                      </button>
                      <button type="button" className="nav-pill">
                        CMS
                      </button>
                      <button type="button" className="nav-pill">
                        More ▾
                      </button>
                    </div>
        
        <div className="row">
          {/* <div className="chain-icons">
            <span className="chain c-eth" aria-label="Ethereum" />
            <span className="chain c-poly" aria-label="Polygon" />
            <span className="chain c-arb" aria-label="Arbitrum" />
            <span className="chain c-avax" aria-label="Avalanche" />
            <span className="chain c-bsc" aria-label="BSC" />
          </div> */}
          <div className="controls-spacer" />
          <div className="toggle" role="tablist" aria-label="Type toggle">
            <button className="active" aria-selected>NFTs</button>
            <button>Tokens</button>
          </div>
          <button className="btn">View all</button>
        </div>
      </div>
    </div>
  );
}
