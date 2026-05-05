import Link from "next/link";

export default function PortalHome() {
  return (
    <div className="portal-command">
      <section className="portal-command-hero">
        <div>
          <div className="section-badge">OmniSignal Portal</div>
          <h1>AI Oracle cockpit for geopolitical market signals.</h1>
          <p>
            Start with the Oracle Pool. It reads live signals, ranks geopolitical and social catalysts,
            separates majority report from contrarian view, maps asset impact, and lets you simulate before approval.
          </p>
        </div>
        <div className="portal-command-orbit" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>
      <div className="portal-command-grid">
        <Link className="command-card primary" href="/portal/intelligence">
          <span>01 - Oracle Pool</span>
          <h3>AI Intelligence Desk</h3>
          <p>Oracle cards from real normalized signals: news, geo risk, leader posts, social velocity, PolyDelta, and market data.</p>
        </Link>
        <Link className="command-card" href="/portal/intelligence">
          <span>02 - Geo Risk</span>
          <h3>World Events to Assets</h3>
          <p>Conflicts, sanctions, elections, central banks, export controls, and energy shocks mapped to sectors and tickers.</p>
        </Link>
        <Link className="command-card" href="/portal/portfolio">
          <span>03 - Portfolio Exposure</span>
          <h3>Wallet-Gated Strategy</h3>
          <p>No holdings appear before MetaMask verification. Connected portfolios receive relevant Oracle exposure notes.</p>
        </Link>
        <Link className="command-card" href="/portal/settings">
          <span>04 - Simulation & Approval</span>
          <h3>Provider Status</h3>
          <p>Check database, Redis, OpenAI, market providers, premium wallet unlock, Telegram, and no-fallback data readiness.</p>
        </Link>
      </div>
    </div>
  );
}
