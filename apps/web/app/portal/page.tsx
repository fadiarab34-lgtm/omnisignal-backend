import Link from "next/link";

export default function PortalHome() {
  return (
    <div className="card-grid">
      <Link className="portfolio-card" href="/portal/intelligence">
        <h3>Global Intelligence</h3>
        <p className="panel-sub">Live heatmap, provider-backed asset detail, charts, news events, and AI analysis.</p>
      </Link>
      <Link className="portfolio-card" href="/portal/portfolio">
        <h3>Wallet Portfolio</h3>
        <p className="panel-sub">Requires signed MetaMask verification. No portfolios appear until authenticated.</p>
      </Link>
      <Link className="portfolio-card" href="/portal/trading">
        <h3>Trading Controls</h3>
        <p className="panel-sub">Order intents, estimates, Hyperliquid testnet confirmation, and mainnet safety gates.</p>
      </Link>
      <Link className="portfolio-card" href="/portal/settings">
        <h3>Provider Status</h3>
        <p className="panel-sub">Database, Redis, OpenAI, market providers, Hyperliquid, and AI voice readiness.</p>
      </Link>
    </div>
  );
}
