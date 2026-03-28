export default function ControlsBar() {
  return (
    <div className="container">
      <div className="controls">
          <div className="nav-filters desktop-only" aria-label="Major coins">
            <a className="nav-pill active" href="/market">All</a>
            <a className="nav-pill" href="https://www.coingecko.com/en/coins/bitcoin" target="_blank" rel="noopener noreferrer">BTC</a>
            <a className="nav-pill" href="https://www.coingecko.com/en/coins/ethereum" target="_blank" rel="noopener noreferrer">ETH</a>
            <a className="nav-pill" href="https://www.coingecko.com/en/coins/binancecoin" target="_blank" rel="noopener noreferrer">BNB</a>
            <a className="nav-pill" href="https://www.coingecko.com/en/coins/tether" target="_blank" rel="noopener noreferrer">USDT</a>
            <a className="nav-pill" href="https://www.coingecko.com/en/coins/usd-coin" target="_blank" rel="noopener noreferrer">USDC</a>
            <a className="nav-pill" href="https://www.coingecko.com/en/coins/xrp" target="_blank" rel="noopener noreferrer">XRP</a>
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
