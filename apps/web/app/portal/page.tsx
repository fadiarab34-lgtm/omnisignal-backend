import Link from "next/link";

export default function PortalHome() {
  return (
    <div className="portal-command">
      <section className="portal-command-hero">
        <div>
          <div className="section-badge">OmniSignal Portal</div>
          <h1>Live intelligence, wallet portfolios, and safety-gated trading.</h1>
          <p>
            Use the command center to open the global heatmap, verify your wallet, create real database-backed
            portfolios, check premium status, and prepare order tickets through the backend.
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
          <span>01 · Intelligence</span>
          <h3>Global Heatmap</h3>
          <p>Provider-backed tiles, asset detail, real candles, stored events, and OpenAI analysis.</p>
        </Link>
        <Link className="command-card" href="/portal/portfolio">
          <span>02 · Wallet</span>
          <h3>Portfolio Engine</h3>
          <p>Hidden until MetaMask signs a nonce. Portfolios are real records owned by the verified wallet.</p>
        </Link>
        <Link className="command-card" href="/portal/trading">
          <span>03 · Execution</span>
          <h3>Trading Controls</h3>
          <p>Order estimates, intents, Hyperliquid testnet confirmation, and mainnet kill-switch gates.</p>
        </Link>
        <Link className="command-card" href="/portal/settings">
          <span>04 · Status</span>
          <h3>Providers & Premium</h3>
          <p>Database, Redis, OpenAI, market providers, wallet subscription, and Telegram AI readiness.</p>
        </Link>
      </div>
    </div>
  );
}
