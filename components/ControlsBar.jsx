export default function ControlsBar() {
  return (
    <div className="container">
      <div className="controls">
        <div className="row chip-scroll">
          <button className="pill active">All</button>
          <button className="pill active">Gaming</button>
          <button className="pill active">Art</button>
          <button className="pill active">PFPs</button>
          <button className="pill active">More</button>
        </div>
        <div className="row">
          {/* <div className="chain-icons">
            <span className="chain c-eth" aria-label="Ethereum" />
            <span className="chain c-poly" aria-label="Polygon" />
            <span className="chain c-arb" aria-label="Arbitrum" />
            <span className="chain c-avax" aria-label="Avalanche" />
            <span className="chain c-bsc" aria-label="BSC" />
          </div> */}
          <div style={{ flex: 1 }} />
          <div className="toggle" role="tablist" aria-label="Type toggle">
            <button className="active" aria-selected>NFTs</button>
            <button>Tokens</button>
          </div>
          <button className="btn" style={{ marginLeft: 10 }}>View all</button>
        </div>
      </div>
    </div>
  );
}