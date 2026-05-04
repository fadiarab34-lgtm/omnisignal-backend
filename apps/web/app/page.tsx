import Link from "next/link";

export default function HomePage() {
  return (
    <div className="page-shell landing">
      <header className="landing-header">
        <Link href="/" className="brand"><span className="brand-dot" />OmniSignal</Link>
        <nav className="landing-nav">
          <Link href="/portal/intelligence">Intelligence</Link>
          <Link href="/portal/portfolio">Portfolio</Link>
          <Link href="/portal/settings">Status</Link>
        </nav>
        <Link href="/portal" className="cta">Open Portal</Link>
      </header>
      <section className="hero">
        <div className="hero-canvas" />
        <div className="hero-orbit" />
        <div className="hero-content">
          <span className="eyebrow"><span className="brand-dot" />Institutional signal terminal</span>
          <h1>AI market intelligence for <span>wallet-gated portfolios</span>.</h1>
          <p>
            OmniSignal connects live provider data, signed MetaMask sessions, real portfolio records,
            OpenAI analysis, OpenAI Realtime voice, and Hyperliquid safety-gated order flows.
          </p>
          <div className="hero-actions">
            <Link href="/portal/intelligence" className="primary-btn">Open Intelligence</Link>
            <Link href="/portal/portfolio" className="secondary-btn">Connect Portfolio</Link>
          </div>
          <div className="trust-strip">
            <span>No production data substitutes</span>
            <span>Server-side provider keys</span>
            <span>Visual confirmation for trades</span>
          </div>
        </div>
      </section>
    </div>
  );
}
