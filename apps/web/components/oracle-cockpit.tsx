"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, formatPct, formatUsd } from "../lib/api";
import { AssetDetailPanel } from "./asset-detail-panel";

type Provider = {
  provider: string;
  status: string;
  message: string;
};

type OracleCard = {
  id: string;
  title: string;
  summary: string;
  whyItMatters: string;
  sourceType: string;
  sourceName: string;
  sourceCredibility: number;
  affectedCountries: string[];
  affectedSectors: string[];
  affectedAssets: string[];
  direction: string;
  urgencyScore: number;
  confidenceScore: number;
  marketImpactScore: number;
  geoRiskScore: number;
  timeHorizon: string;
  suggestedAction: string;
  majorityReport?: string | null;
  contrarianView?: string | null;
  createdAt: string;
};

type Signal = {
  id: string;
  sourceType: string;
  sourceName: string;
  publishedAt?: string | null;
  ingestedAt: string;
  title: string;
  summary?: string | null;
  category?: string | null;
  sentiment: string;
  urgencyScore: number;
  confidenceScore: number;
  marketImpactScore: number;
  geoRiskScore: number;
  crowdingScore?: number | null;
  divergenceScore?: number | null;
  affectedAssets: string[];
  affectedSectors: string[];
  suggestedAction: string;
  timeHorizon: string;
  userAlertRequired: boolean;
};

type Asset = {
  symbol: string;
  name: string;
  assetClass: string;
  sector?: string;
  region?: string;
  price: number;
  changePercent24h: number;
  volume?: number;
  marketCap?: number;
  provider: string;
};

const heatmapFilters = [
  ["all", "ALL"],
  ["equity", "AI / SEMIS"],
  ["etf", "MEGA TECH"],
  ["commodity", "ENERGY"],
  ["forex", "MACRO"],
  ["crypto", "CRYPTO"],
  ["index", "INDICES"]
] as const;

export function OracleCockpit() {
  const [leftTab, setLeftTab] = useState<"oracle" | "leaders" | "news">("oracle");
  const [filter, setFilter] = useState("all");
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>();
  const [deployAmount, setDeployAmount] = useState("");
  const [horizon, setHorizon] = useState("3 yr");
  const [strategy, setStrategy] = useState("Balanced");

  const oracle = useQuery({
    queryKey: ["oracle-latest"],
    queryFn: () => apiFetch<{ oracleCards: OracleCard[]; signals: Signal[]; providers: Provider[]; refreshIntervalMs: number; policy: string }>("/oracle/latest"),
    refetchInterval: 60_000
  });

  const leaders = useQuery({
    queryKey: ["signals-leaders"],
    queryFn: () => apiFetch<{ signals: Signal[] }>("/signals/leaders"),
    refetchInterval: 60_000
  });

  const news = useQuery({
    queryKey: ["signals-news"],
    queryFn: () => apiFetch<{ signals: Signal[] }>("/signals/news"),
    refetchInterval: 60_000
  });

  const heatmap = useQuery({
    queryKey: ["terminal-heatmap", filter],
    queryFn: () => apiFetch<{ assets: Asset[]; errors: Array<{ symbol: string; message: string }> }>(`/heatmap?filter=${filter}`),
    refetchInterval: 60_000
  });

  const cards = oracle.data?.oracleCards ?? [];
  const assets = heatmap.data?.assets ?? [];
  const groupedHeatmap = useGroupedAssets(assets);
  const strongest = [...assets].sort((a, b) => b.changePercent24h - a.changePercent24h)[0];
  const advancing = assets.filter((asset) => asset.changePercent24h >= 0).length;
  const watchlist = assets.slice(0, 7);
  const activeSignals = cards.slice(0, 4);

  return (
    <div className="terminal-workspace">
      <aside className="terminal-left">
        <div className="terminal-tabs">
          <button className={leftTab === "oracle" ? "active" : ""} onClick={() => setLeftTab("oracle")}>Oracle</button>
          <button className={leftTab === "leaders" ? "active" : ""} onClick={() => setLeftTab("leaders")}>Leaders</button>
          <button className={leftTab === "news" ? "active" : ""} onClick={() => setLeftTab("news")}>News</button>
        </div>
        {leftTab === "oracle" && (
          <div className="terminal-left-body">
            <div className="oracle-summary-card">
              <span>AI Oracle</span>
              {oracle.isLoading && <p>Loading stored Oracle intelligence.</p>}
              {oracle.isError && <p className="down">{(oracle.error as Error).message}</p>}
              {!oracle.isLoading && !oracle.isError && cards.length === 0 && <p>No Oracle cards yet. Configure OpenAI and signal providers, then run ingestion.</p>}
              {cards[0] && (
                <>
                  <p>{cards[0].summary}</p>
                  <div className="confidence-line"><span>Confidence</span><i style={{ width: `${scoreNumber(cards[0].confidenceScore)}%` }} /><b>{scoreNumber(cards[0].confidenceScore)}%</b></div>
                  <div className="mini-stat-grid">
                    <div><span>Impact</span><b>{scoreNumber(cards[0].marketImpactScore)}%</b></div>
                    <div><span>Geo Risk</span><b>{scoreNumber(cards[0].geoRiskScore)}%</b></div>
                    <div><span>Urgency</span><b>{scoreNumber(cards[0].urgencyScore)}%</b></div>
                    <div><span>Action</span><b>{prettyAction(cards[0].suggestedAction)}</b></div>
                  </div>
                </>
              )}
            </div>
            <SignalStack title="First Mover Signals" count={activeSignals.length}>
              {activeSignals.length === 0 ? <EmptyTerminalLine text="No first-mover Oracle cards have been stored yet." /> : activeSignals.map((card) => (
                <OracleRailCard key={card.id} card={card} />
              ))}
            </SignalStack>
            <SignalStack title="Provider Health" count={(oracle.data?.providers ?? []).length}>
              {(oracle.data?.providers ?? []).length === 0 ? <EmptyTerminalLine text="No provider health records yet." /> : oracle.data!.providers.map((provider) => (
                <div className="provider-health-row" key={provider.provider}>
                  <span className={`terminal-dot ${provider.status}`} />
                  <b>{prettyProvider(provider.provider)}</b>
                  <em>{provider.status === "missing_config" ? "Missing configuration" : provider.status}</em>
                </div>
              ))}
            </SignalStack>
          </div>
        )}
        {leftTab === "leaders" && (
          <div className="terminal-left-body">
            <SignalStack title="Today Monitor" count={leaders.data?.signals.length ?? 0}>
              {leaders.isLoading && <EmptyTerminalLine text="Loading leader statements." />}
              {leaders.isError && <EmptyTerminalLine text={(leaders.error as Error).message} />}
              {leaders.data?.signals.length === 0 && <EmptyTerminalLine text="No leader-post records yet. Configure X or a compliant leader-feed provider." />}
              {leaders.data?.signals.map((signal) => <SignalRailItem key={signal.id} signal={signal} />)}
            </SignalStack>
          </div>
        )}
        {leftTab === "news" && (
          <div className="terminal-left-body">
            <SignalStack title="Geopolitical Intelligence" count={news.data?.signals.length ?? 0}>
              {news.isLoading && <EmptyTerminalLine text="Loading news signals." />}
              {news.isError && <EmptyTerminalLine text={(news.error as Error).message} />}
              {news.data?.signals.length === 0 && <EmptyTerminalLine text="No news signals are stored yet. GDELT ingestion will populate this when available." />}
              {news.data?.signals.map((signal) => <SignalRailItem key={signal.id} signal={signal} />)}
            </SignalStack>
          </div>
        )}
      </aside>

      <main className="terminal-main">
        <div className="terminal-section-head">
          <div>
            <h1><span />Global Market Heatmap by Industry</h1>
            <p>Understand what is moving worldwide by sector. Every tile is backed by configured provider data.</p>
          </div>
          <div className="terminal-filter-row">
            {heatmapFilters.map(([key, label]) => (
              <button key={key} className={filter === key ? "active" : ""} onClick={() => setFilter(key)}>{label}</button>
            ))}
          </div>
        </div>

        {heatmap.isLoading && <TerminalState title="Loading live heatmap" body="Querying configured market providers through the backend." />}
        {heatmap.isError && <TerminalState title="Live market data unavailable" body={(heatmap.error as Error).message} danger />}
        {heatmap.data && assets.length === 0 && <TerminalState title="Live market data unavailable" body="Check provider configuration. OmniSignal will not draw substitute heatmap tiles." />}

        <div className="terminal-heatmap-scroll">
          {groupedHeatmap.map(([group, groupAssets]) => {
            const average = avg(groupAssets.map((asset) => asset.changePercent24h));
            return (
              <section className="terminal-heatmap-cluster" key={group}>
                <div className="cluster-head">
                  <b><span />{group}</b>
                  <p>{clusterComment(group)}</p>
                  <em className={average >= 0 ? "healthy" : "down"}>{formatPct(average)}</em>
                </div>
                <div className="terminal-tile-grid">
                  {groupAssets.map((asset, index) => (
                    <button
                      key={`${asset.provider}-${asset.symbol}`}
                      className={`terminal-asset-tile ${asset.changePercent24h >= 0 ? "up" : "down"} ${index === 0 ? "large" : ""}`}
                      onClick={() => setSelectedAsset(asset)}
                    >
                      <div>
                        <b>{asset.symbol}</b>
                        <span>{asset.name}</span>
                      </div>
                      <strong>{formatPct(asset.changePercent24h)}</strong>
                      <small>{asset.assetClass}</small>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <div className="terminal-bottom-read">
          <div><b>AI Market Read</b><p>{assets.length ? `World pulse: ${advancing}/${assets.length} assets are green. ${strongest ? `Strongest: ${strongest.symbol} ${formatPct(strongest.changePercent24h)}.` : ""}` : "No live market pulse is available yet."}</p></div>
          <div><b>Capital Flow</b><p>{strongest ? `${strongest.symbol} is leading the configured feed. Watch whether breadth expands beyond the leader.` : "Capital flow appears after market providers return live tiles."}</p></div>
          <div><b>Portfolio Advice</b><p>Connect a wallet to map Oracle signals to saved portfolio exposure.</p></div>
        </div>
      </main>

      <aside className="terminal-right">
        <div className="quick-deploy">
          <span>Quick Deploy</span>
          <label>
            <b>{deployAmount ? formatUsd(Number(deployAmount)) : "Simulation Amount"}</b>
            <input inputMode="decimal" aria-label="USD simulation amount" value={deployAmount} onChange={(event) => setDeployAmount(event.target.value)} />
          </label>
          <div className="horizon-row">
            {["1 yr", "3 yr", "5 yr"].map((item) => <button key={item} className={horizon === item ? "active" : ""} onClick={() => setHorizon(item)}>{item}</button>)}
          </div>
          <div className="strategy-list">
            {["Conservative", "Balanced", "Aggressive"].map((item) => <button key={item} className={strategy === item ? "active" : ""} onClick={() => setStrategy(item)}><i />{item}</button>)}
          </div>
          <button className="primary-btn" disabled={!deployAmount}>Run Full Simulation</button>
        </div>
        <div className="watchlist-panel">
          <h3>Watchlist</h3>
          {watchlist.length === 0 && <EmptyTerminalLine text="Watchlist fills from live heatmap assets." />}
          {watchlist.map((asset) => (
            <button key={`${asset.provider}-${asset.symbol}`} onClick={() => setSelectedAsset(asset)}>
              <div><b>{asset.symbol}</b><span>{asset.name}</span></div>
              <div><strong>{formatUsd(asset.price)}</strong><em className={asset.changePercent24h >= 0 ? "healthy" : "down"}>{formatPct(asset.changePercent24h)}</em></div>
            </button>
          ))}
        </div>
      </aside>

      <footer className="terminal-footer">
        <span><i />Provider data only</span>
        <span><i />Oracle cards stored by backend</span>
        <span><i />Simulation before execution</span>
      </footer>

      <AssetDetailPanel asset={selectedAsset} onClose={() => setSelectedAsset(undefined)} />
    </div>
  );
}

function SignalStack({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="signal-stack">
      <h2><span />{title}<em>{count ? `${count} items` : "0 items"}</em></h2>
      <div>{children}</div>
    </section>
  );
}

function OracleRailCard({ card }: { card: OracleCard }) {
  return (
    <article className="rail-card">
      <div className="tag-row">
        <span>{prettySource(card.sourceType)}</span>
        <b className={card.urgencyScore >= 0.7 ? "urgent-tag" : "medium-tag"}>{scoreNumber(card.urgencyScore)}%</b>
      </div>
      <h3>{card.title}</h3>
      <p>{card.summary}</p>
      <div className="rail-tags">
        {card.affectedAssets.slice(0, 3).map((asset) => <span key={asset}>{asset}</span>)}
        {card.affectedSectors.slice(0, 2).map((sector) => <span key={sector}>{sector}</span>)}
      </div>
    </article>
  );
}

function SignalRailItem({ signal }: { signal: Signal }) {
  return (
    <article className="rail-card compact">
      <div className="tag-row">
        <span>{signal.category ?? prettySource(signal.sourceType)}</span>
        <b className={signal.urgencyScore >= 0.7 ? "urgent-tag" : "medium-tag"}>{scoreNumber(signal.confidenceScore)}%</b>
      </div>
      <h3>{signal.title}</h3>
      <p>{signal.summary ?? "Signal stored without AI summary."}</p>
      <div className="rail-tags">
        {signal.affectedAssets.slice(0, 3).map((asset) => <span key={asset}>{asset}</span>)}
      </div>
    </article>
  );
}

function EmptyTerminalLine({ text }: { text: string }) {
  return <p className="empty-terminal-line">{text}</p>;
}

function TerminalState({ title, body, danger }: { title: string; body: string; danger?: boolean }) {
  return (
    <div className={`terminal-state-card ${danger ? "danger" : ""}`}>
      <b>{title}</b>
      <p>{body}</p>
    </div>
  );
}

function useGroupedAssets(assets: Asset[]) {
  return useMemo(() => {
    const map = new Map<string, Asset[]>();
    assets.forEach((asset) => {
      const group = normalizeSector(asset.sector ?? asset.assetClass);
      map.set(group, [...(map.get(group) ?? []), asset]);
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [assets]);
}

function normalizeSector(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("semi") || lower.includes("tech") || lower.includes("ai")) return "AI / Semiconductors";
  if (lower.includes("energy") || lower.includes("commodity")) return "Energy / Commodities";
  if (lower.includes("financial") || lower.includes("bank")) return "Financials / Banks";
  if (lower.includes("crypto")) return "Crypto";
  if (lower.includes("forex") || lower.includes("currency")) return "Macro / Currencies";
  if (lower.includes("index")) return "Global Indices";
  return value;
}

function clusterComment(group: string) {
  if (group.includes("AI")) return "AI infrastructure and policy sensitivity.";
  if (group.includes("Energy")) return "Energy and geopolitical hedge sleeve.";
  if (group.includes("Crypto")) return "Digital assets and liquidity beta.";
  if (group.includes("Financial")) return "Rates, credit, and funding pressure.";
  return "Live provider-backed market cluster.";
}

function prettyProvider(provider: string) {
  return provider.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function prettySource(source: string) {
  const labels: Record<string, string> = {
    x_post: "Leader",
    news: "News",
    social: "Social",
    prediction_market: "PolyDelta",
    market_data: "Market",
    macro: "Macro",
    portfolio: "Portfolio"
  };
  return labels[source] ?? prettyProvider(source);
}

function prettyAction(action: string) {
  return action.replace(/_/g, " ");
}

function scoreNumber(value: number) {
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

function avg(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
