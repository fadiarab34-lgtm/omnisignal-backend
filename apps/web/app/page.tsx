import Link from "next/link";
import { MarketTape } from "../components/market-tape";

export default function HomePage() {
  return (
    <div className="page-shell landing landing-prototype">
      <header className="landing-header">
        <Link href="/" className="brand"><span className="brand-dot" />OmniSignal</Link>
        <nav className="landing-nav">
          <a href="#signals">Oracle</a>
          <a href="#geo">Geo Risk</a>
          <a href="#wallet">MetaMask</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <Link href="/portal/intelligence" className="cta">Open Oracle</Link>
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
            <span className="eyebrow"><span className="live-dot" />AI geopolitical market intelligence cockpit</span>
            <h1>Know what matters <span>before markets fully react.</span></h1>
            <p>
              OmniSignal reads global news, leader statements, social velocity, prediction-market divergence,
              macro pressure, live market movement, and wallet exposure through one AI Oracle Pool.
            </p>
            <div className="hero-actions">
              <Link href="/portal/intelligence" className="primary-btn">Open AI Oracle</Link>
              <Link href="/portal/portfolio" className="secondary-btn">Connect Portfolio</Link>
              <a href="#signals" className="secondary-btn">Signal Stack</a>
            </div>
            <div className="hero-metrics">
              <div><b>Oracle</b><span>Ranks real-world catalysts</span></div>
              <div><b>Geo Risk</b><span>Maps events to assets</span></div>
              <div><b>PolyDelta</b><span>Flags probability gaps</span></div>
            </div>
            <div className="trust-strip">
              <span>No invented intelligence cards</span>
              <span>Real provider or unavailable state</span>
              <span>Simulation before execution</span>
            </div>
          </div>
        </section>

        <section className="landing-band dark">
          <MarketTape />
        </section>

        <section className="landing-band money-section" id="signals">
          <div className="money-layout">
            <div className="money-copy">
              <div className="section-badge">AI Oracle Pool</div>
              <h2>From world event to first-mover signal.</h2>
              <p>
                The Oracle Pool takes fresh signals from compliant providers, normalizes them, deduplicates
                related stories, scores urgency, and turns market-moving events into actionable intelligence cards.
              </p>
              <div className="money-kpis">
                <div><b>Detect</b><span>News, leaders, social, macro</span></div>
                <div><b>Interpret</b><span>Why it matters and who is exposed</span></div>
                <div><b>Act</b><span>Watch, hedge, simulate, approve</span></div>
              </div>
              <div className="money-actions">
                <Link className="primary-btn" href="/portal/intelligence">Open Oracle Cockpit</Link>
                <Link className="secondary-btn" href="/portal/settings">Provider Status</Link>
              </div>
            </div>
            <div className="stack-grid compact">
              <div className="stack-card"><div className="stack-kicker">01 - Leader Posts</div><h3>Statement analysis</h3><p>Configured X or compliant leader-feed providers are interpreted for tone, urgency, affected countries, sectors, and assets.</p></div>
              <div className="stack-card"><div className="stack-kicker">02 - Geo Risk</div><h3>Market mapping</h3><p>Conflict, sanctions, elections, export controls, central-bank language, and energy disruptions are mapped to tradable exposure.</p></div>
              <div className="stack-card"><div className="stack-kicker">03 - Herd Signal</div><h3>Crowd behavior</h3><p>Social velocity and narrative acceleration are scored for hype, panic, crowding risk, and contrarian opportunities when configured.</p></div>
              <div className="stack-card"><div className="stack-kicker">04 - PolyDelta</div><h3>Probability divergence</h3><p>Prediction-market probabilities can be compared with asset movement to flag when markets may not be pricing an event fully.</p></div>
            </div>
          </div>
        </section>

        <section className="landing-band wallet-section" id="geo">
          <div className="wallet-layout">
            <div className="wallet-copy">
              <div className="section-badge">Geo Risk Monitor</div>
              <h2>Political risk translated into market exposure.</h2>
              <p>
                OmniSignal is built to explain how global events touch oil, gold, defense, semiconductors,
                currencies, crypto, shipping, airlines, banks, and user portfolios.
              </p>
              <p>
                Each Oracle card separates the majority report from the contrarian view, so the platform does
                not merely repeat headlines or follow the crowd.
              </p>
              <div className="wallet-actions">
                <Link href="/portal/intelligence">View Geo Risk</Link>
                <Link href="/portal/intelligence">Majority vs Contrarian</Link>
              </div>
            </div>
            <div className="wallet-steps">
              <div><b>1</b><h3>What happened?</h3><p>Fresh events are normalized into one signal model with sources, timestamps, entities, and credibility.</p></div>
              <div><b>2</b><h3>Why it matters</h3><p>The Oracle scores urgency, confidence, market impact, geopolitical risk, and crowding or divergence where available.</p></div>
              <div><b>3</b><h3>Who is exposed?</h3><p>Countries, sectors, assets, watchlists, and verified wallet portfolios are connected to the same intelligence card.</p></div>
              <div><b>4</b><h3>What next?</h3><p>The user can watch, hedge, simulate, approve a proposal, or prepare a trade ticket without voice-only execution.</p></div>
            </div>
          </div>
        </section>

        <section className="landing-band wallet-section" id="wallet">
          <div className="wallet-layout">
            <div className="wallet-copy">
              <div className="section-badge">Portfolio Intelligence</div>
              <h2>Your portfolio appears only after wallet verification.</h2>
              <p>
                OmniSignal verifies wallet ownership with a signed nonce. It never asks for a seed phrase
                and never stores private keys.
              </p>
              <p>
                Once connected, Oracle cards can say why an event matters to your holdings, what exposure changed,
                and which simulation should be reviewed before any approval.
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
            <h2>Start free. Unlock deeper intelligence by wallet.</h2>
            <p>Premium payments go from MetaMask to the OmniSignal treasury wallet, then the backend verifies the on-chain transfer and unlocks the paying wallet.</p>
          </div>
          <div className="pricing-grid">
            <div className="plan">
              <div className="plan-name">Freemium</div>
              <div className="plan-price">$0 <span>/ month</span></div>
              <p className="plan-desc">For trying the Oracle with strict limits and visible provider health.</p>
              <ul>
                <li>1 portfolio</li>
                <li>Limited Oracle nudges</li>
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
                <li>More AI Oracle nudges</li>
                <li>More live intelligence updates</li>
                <li>Telegram or WhatsApp AI link when configured</li>
                <li>On-chain payment verification</li>
              </ul>
              <Link href="/portal/settings" className="plan-btn primary-btn">Start Premium</Link>
            </div>
          </div>
        </section>

        <section className="landing-band contact-section" id="contact">
          <div className="section-center">
            <div className="section-badge">Command Center</div>
            <h2>Open the intelligence cockpit.</h2>
            <p>Connect compliant providers in the backend environment to activate real news, leader posts, prediction markets, social velocity, AI Oracle cards, voice, and portfolio exposure.</p>
            <div className="hero-actions">
              <Link href="/portal/intelligence" className="primary-btn">Open AI Oracle</Link>
              <Link href="/portal/settings" className="secondary-btn">View Status</Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
