import Link from "next/link";
import { MarketTape } from "../components/market-tape";

export default function HomePage() {
  return (
    <div className="page-shell landing landing-prototype">
      <header className="landing-header">
        <Link href="/" className="brand"><span className="brand-dot" />OmniSignal</Link>
        <nav className="landing-nav">
          <a href="#signals">Signals</a>
          <a href="#wallet">MetaMask</a>
          <a href="#pricing">Pricing</a>
          <a href="#contact">Contact</a>
        </nav>
        <Link href="/portal" className="cta">Get Started</Link>
      </header>
      <main>
        <section className="hero prototype-hero">
          <div className="hero-canvas" />
          <div className="hero-visual" aria-hidden="true">
            <div className="signal-earth">
              <span className="earth-signal earth-signal-a" />
              <span className="earth-signal earth-signal-b" />
              <span className="earth-signal earth-signal-c" />
              <span className="earth-orbit earth-orbit-a" />
              <span className="earth-orbit earth-orbit-b" />
              <span className="earth-pulse earth-pulse-a" />
              <span className="earth-pulse earth-pulse-b" />
              <span className="earth-pulse earth-pulse-c" />
            </div>
          </div>
          <div className="hero-content">
            <span className="eyebrow"><span className="live-dot" />OmniSignal · AI first-mover portfolio engine</span>
            <h1>Build a smarter <span>portfolio.</span></h1>
            <p>
              Create wallet-linked portfolios, scan live global markets, ask the AI for structured analysis,
              and prepare safety-gated Hyperliquid testnet order intents from one command center.
            </p>
            <div className="hero-actions">
              <Link href="/portal" className="primary-btn">Get Started</Link>
              <a href="#signals" className="secondary-btn">How It Works</a>
              <a href="#pricing" className="secondary-btn">Pricing</a>
            </div>
            <div className="hero-metrics">
              <div><b>Create</b><span>Wallet-linked portfolios</span></div>
              <div><b>Analyze</b><span>Live provider-backed signals</span></div>
              <div><b>Act</b><span>Visual trade confirmation only</span></div>
            </div>
            <div className="trust-strip">
              <span>No production data substitutes</span>
              <span>MetaMask signed sessions</span>
              <span>Premium unlocks more portfolios</span>
            </div>
          </div>
        </section>

        <section className="landing-band dark">
          <MarketTape />
        </section>

        <section className="landing-band money-section" id="signals">
          <div className="money-layout">
            <div className="money-copy">
              <div className="section-badge">Signal Stack</div>
              <h2>From world event to portfolio action.</h2>
              <p>
                OmniSignal is built around a live loop: market data, wallet-authenticated portfolios,
                AI analysis, portfolio nudges, and user-confirmed order tickets.
              </p>
              <div className="money-kpis">
                <div><b>Detect</b><span>Heatmap, events, provider health</span></div>
                <div><b>Score</b><span>Structured OpenAI analysis</span></div>
                <div><b>Approve</b><span>Simulation or testnet ticket</span></div>
              </div>
              <div className="money-actions">
                <Link className="primary-btn" href="/portal/intelligence">Open Intelligence</Link>
                <Link className="secondary-btn" href="/portal/portfolio">Create Portfolio</Link>
              </div>
            </div>
            <div className="stack-grid compact">
              <div className="stack-card"><div className="stack-kicker">01 · Intelligence</div><h3>Global heatmap</h3><p>Tiles come from configured market providers through the backend. If providers fail, the UI shows the failure.</p></div>
              <div className="stack-card"><div className="stack-kicker">02 · Portfolio</div><h3>Wallet-gated records</h3><p>No portfolio appears until MetaMask signs a backend nonce and the session is verified.</p></div>
              <div className="stack-card"><div className="stack-kicker">03 · AI</div><h3>Structured analysis</h3><p>OpenAI outputs are validated before rendering and stored as signals or nudges when relevant.</p></div>
              <div className="stack-card"><div className="stack-kicker">04 · Trading</div><h3>Confirmation first</h3><p>AI can prepare an order ticket. Real trading cannot execute without visual confirmation and backend validation.</p></div>
            </div>
          </div>
        </section>

        <section className="landing-band wallet-section" id="wallet">
          <div className="wallet-layout">
            <div className="wallet-copy">
              <div className="section-badge">MetaMask Connection</div>
              <h2>Your wallet stays yours.</h2>
              <p>
                OmniSignal verifies wallet ownership with a signed nonce. It never asks for a seed phrase
                and never stores private keys.
              </p>
              <p>
                Portfolio pages remain locked until the wallet session is verified. Premium is also stored
                against the wallet that pays on-chain.
              </p>
              <div className="wallet-actions">
                <Link href="/portal/portfolio">Connect Wallet</Link>
                <Link href="/portal/settings">Premium Status</Link>
              </div>
            </div>
            <div className="wallet-steps">
              <div><b>1</b><h3>Connect MetaMask</h3><p>The browser requests the account through the real EIP-1193 provider.</p></div>
              <div><b>2</b><h3>Sign nonce</h3><p>The backend verifies the signature and creates a secure wallet session.</p></div>
              <div><b>3</b><h3>Create portfolio</h3><p>New portfolios are database records owned by the verified wallet.</p></div>
              <div><b>4</b><h3>Simulate or ticket</h3><p>Simulations use live prices. Trading uses backend order intents.</p></div>
            </div>
          </div>
        </section>

        <section className="landing-band pricing-section" id="pricing">
          <div className="section-center">
            <div className="section-badge">Pricing</div>
            <h2>Start free. Upgrade by wallet.</h2>
            <p>Premium payments go from MetaMask to the OmniSignal treasury wallet, then the backend verifies the on-chain transfer and unlocks the paying wallet.</p>
          </div>
          <div className="pricing-grid">
            <div className="plan">
              <div className="plan-name">Freemium</div>
              <div className="plan-price">$0 <span>/ month</span></div>
              <p className="plan-desc">For trying the platform with strict limits.</p>
              <ul>
                <li>1 portfolio</li>
                <li>Limited nudges</li>
                <li>Provider-backed market data when configured</li>
                <li>Wallet verification required</li>
              </ul>
              <Link href="/portal" className="plan-btn secondary-btn">Get Started Free</Link>
            </div>
            <div className="plan highlighted">
              <div className="plan-badge">Wallet Premium</div>
              <div className="plan-name">Premium</div>
              <div className="plan-price">$25 <span>/ month</span></div>
              <p className="plan-desc">Unlocks the active OmniSignal intelligence layer for the paying wallet.</p>
              <ul>
                <li>More saved portfolios</li>
                <li>More AI portfolio nudges</li>
                <li>Live update entitlements</li>
                <li>Telegram AI link when configured</li>
                <li>On-chain payment verification</li>
              </ul>
              <Link href="/portal/settings" className="plan-btn primary-btn">Start Premium</Link>
            </div>
          </div>
        </section>

        <section className="landing-band contact-section" id="contact">
          <div className="section-center">
            <div className="section-badge">Contact</div>
            <h2>Ready to use the terminal?</h2>
            <p>Open the portal, connect MetaMask, and configure providers in the backend environment for real market data, AI, voice, and trading flows.</p>
            <div className="hero-actions">
              <Link href="/portal" className="primary-btn">Open Portal</Link>
              <Link href="/portal/settings" className="secondary-btn">View Status</Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
