"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, formatPct, formatUsd } from "../lib/api";
import { AssetDetailPanel } from "./asset-detail-panel";

type Provider = { provider: string; status: string; message: string; lastCheckedAt?: string };
type OracleCard = {
  id: string;
  title: string;
  summary: string;
  whyItMatters: string;
  sourceType: string;
  sourceName: string;
  sourceUrl?: string | null;
  sourceCredibility: number;
  publishedAt?: string | null;
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
  portfolioExposure?: number | null;
  marketAlreadyPricing?: boolean | null;
  predictionDivergence?: number | null;
  crowdingScore?: number | null;
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
type Asset = { symbol: string; name: string; assetClass: string; sector?: string; region?: string; price: number; changePercent24h: number; volume?: number; marketCap?: number; provider: string };

const heatmapFilters = [["all", "All"], ["equity", "Equities"], ["crypto", "Crypto"], ["commodity", "Commodities"], ["forex", "Forex"], ["index", "Indices"], ["perp", "Perps"]] as const;
const lanes = [
  { key: "geo", label: "Geo Risk", path: "/signals/geo" },
  { key: "leaders", label: "Leader Posts", path: "/signals/leaders" },
  { key: "social", label: "Herd Signal", path: "/signals/social" },
  { key: "prediction", label: "PolyDelta", path: "/signals/prediction-markets" }
] as const;

export function OracleCockpit() {
  const [filter, setFilter] = useState("all");
  const [activeLane, setActiveLane] = useState<(typeof lanes)[number]["key"]>("geo");
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>();
  const [selectedCard, setSelectedCard] = useState<OracleCard | undefined>();
  const lane = lanes.find((item) => item.key === activeLane) ?? lanes[0];

  const oracle = useQuery({
    queryKey: ["oracle-latest"],
    queryFn: () => apiFetch<{ oracleCards: OracleCard[]; signals: Signal[]; providers: Provider[]; refreshIntervalMs: number; policy: string }>("/oracle/latest"),
    refetchInterval: 60_000
  });
  const laneSignals = useQuery({
    queryKey: ["oracle-lane", lane.path],
    queryFn: () => apiFetch<{ signals: Signal[] }>(lane.path),
    refetchInterval: 60_000
  });
  const heatmap = useQuery({
    queryKey: ["oracle-heatmap", filter],
    queryFn: () => apiFetch<{ assets: Asset[]; errors: Array<{ symbol: string; message: string }> }>(`/heatmap?filter=${filter}`),
    refetchInterval: 60_000
  });

  const cards = oracle.data?.oracleCards ?? [];
  const signals = oracle.data?.signals ?? [];
  const providers = oracle.data?.providers ?? [];
  const assets = heatmap.data?.assets ?? [];
  const grouped = useGroupedAssets(assets);
  const urgent = cards.filter((card) => card.urgencyScore >= 0.7).length;
  const geo = cards.filter((card) => card.geoRiskScore >= 0.65).length;
  const providerWarnings = providers.filter((provider) => provider.status !== "healthy");

  return (
    <div className="oracle-cockpit">
      <header className="oracle-command">
        <div className="oracle-command-copy">
          <div className="oracle-kicker"><span />AI Oracle Pool</div>
          <h1>Global intelligence desk for market-moving events.</h1>
          <p>OmniSignal ingests real news, leader posts, social velocity, prediction-market feeds, macro data, market movement, and portfolio exposure. Missing providers stay visible.</p>
        </div>
        <div className="oracle-command-grid">
          <Metric label="Oracle cards" value={cards.length} tone="blue" />
          <Metric label="Urgent" value={urgent} tone={urgent ? "red" : "blue"} />
          <Metric label="Geo risk" value={geo} tone={geo ? "amber" : "blue"} />
          <Metric label="Live tiles" value={assets.length} tone="cyan" />
        </div>
      </header>

      <section className="oracle-cockpit-grid">
        <aside className="oracle-left-rail">
          <PanelTitle title="Oracle Status" subtitle="Every card is stored backend intelligence." />
          {oracle.isLoading && <StateBlock title="Loading Oracle Pool" body="Checking stored intelligence and provider health." />}
          {oracle.isError && <StateBlock title="Oracle unavailable" body={(oracle.error as Error).message} danger />}
          {!oracle.isLoading && !oracle.isError && cards.length === 0 && <StateBlock title="No Oracle cards yet" body="Run ingestion or configure OpenAI plus at least one signal provider. The system will not create substitute intelligence." />}
          <div className="provider-strip">
            {providers.map((provider) => <div className="provider-chip" key={provider.provider}><span className={`provider-dot ${provider.status}`} /><div><b>{prettyProvider(provider.provider)}</b><small>{provider.status === "missing_config" ? "Missing configuration" : provider.status}</small></div></div>)}
            {!providers.length && !oracle.isLoading && <p className="oracle-muted">No provider health records have been stored yet.</p>}
          </div>
          {providerWarnings.length > 0 && <div className="oracle-warning"><span>{providerWarnings.length} intelligence provider needs configuration or recovery.</span></div>}
        </aside>

        <main className="oracle-main-deck">
          <div className="oracle-section-head"><div><span className="oracle-section-label">Live Intelligence Cards</span><h2>What matters before the market fully reacts</h2></div><div className="oracle-refresh">Refresh cycle: {formatRefresh(oracle.data?.refreshIntervalMs)}</div></div>
          <div className="oracle-card-grid">
            {cards.slice(0, 8).map((card) => <button className={`oracle-intel-card ${card.direction}`} key={card.id} onClick={() => setSelectedCard(card)}><div className="oracle-card-topline"><span>{prettySource(card.sourceType)}</span><b>{score(card.urgencyScore)} urgency</b></div><h3>{card.title}</h3><p>{card.summary}</p><div className="oracle-score-row"><Score label="Impact" value={card.marketImpactScore} /><Score label="Geo" value={card.geoRiskScore} /><Score label="Conf" value={card.confidenceScore} /></div><div className="oracle-tags">{card.affectedAssets.slice(0, 4).map((asset) => <span key={asset}>{asset}</span>)}{card.affectedSectors.slice(0, 2).map((sector) => <span key={sector}>{sector}</span>)}</div><div className="oracle-action-row"><span>{card.suggestedAction}</span><span>{card.timeHorizon.replace("_", " ")}</span></div></button>)}
          </div>
          {cards.length === 0 && signals.length > 0 && <div className="raw-signal-bank"><PanelTitle title="Normalized Signals Stored" subtitle="OpenAI Oracle cards are pending or unavailable." />{signals.slice(0, 5).map((signal) => <SignalRow key={signal.id} signal={signal} />)}</div>}
        </main>

        <aside className="oracle-right-rail">
          <PanelTitle title="Majority vs Contrarian" subtitle="Consensus and divergence views from the selected card." />
          {selectedCard ? <div className="oracle-debate"><div><span>Majority Report</span><p>{selectedCard.majorityReport || "No majority report was returned for this card."}</p></div><div><span>Contrarian View</span><p>{selectedCard.contrarianView || "No contrarian view was returned for this card."}</p></div><div><span>Why it matters</span><p>{selectedCard.whyItMatters}</p></div></div> : <StateBlock title="Select an Oracle card" body="The right rail will separate consensus from the contrarian interpretation." />}
        </aside>
      </section>

      <section className="signal-lanes">
        <div className="lane-tabs">{lanes.map((item) => <button className={item.key === activeLane ? "active" : ""} key={item.key} onClick={() => setActiveLane(item.key)}>{item.label}</button>)}</div>
        <div className="lane-body">
          {laneSignals.isLoading && <StateBlock title={`Loading ${lane.label}`} body="Reading stored signals from the backend." />}
          {laneSignals.isError && <StateBlock title={`${lane.label} unavailable`} body={(laneSignals.error as Error).message} danger />}
          {!laneSignals.isLoading && !laneSignals.isError && laneSignals.data?.signals.length === 0 && <StateBlock title={`${lane.label} has no live records yet`} body="Configure the matching provider or wait for the next ingestion cycle. No substitute signals are shown." />}
          {laneSignals.data?.signals.map((signal) => <SignalRow key={signal.id} signal={signal} />)}
        </div>
      </section>

      <section className="industry-heatmap">
        <div className="oracle-section-head"><div><span className="oracle-section-label">Global Industry Heatmap</span><h2>Assets grouped by sector, colored by real provider performance</h2></div><div className="heatmap-filter-row">{heatmapFilters.map(([key, label]) => <button key={key} className={filter === key ? "active" : ""} onClick={() => setFilter(key)}>{label}</button>)}</div></div>
        {heatmap.isLoading && <StateBlock title="Loading live heatmap" body="Querying configured market providers through the backend." />}
        {heatmap.isError && <StateBlock title="Live market data unavailable" body={(heatmap.error as Error).message} danger />}
        {heatmap.data && assets.length === 0 && <StateBlock title="No heatmap tiles available" body="Live market data unavailable. Check provider configuration." />}
        <div className="industry-board">{grouped.map(([group, groupAssets]) => <div className="industry-cluster" key={group}><div className="industry-cluster-head"><b>{group}</b><span>{formatPct(avg(groupAssets.map((asset) => asset.changePercent24h)))}</span></div><div className="industry-tile-grid">{groupAssets.map((asset) => <button key={`${asset.provider}-${asset.symbol}`} className={`industry-tile ${asset.changePercent24h > 0.05 ? "up" : asset.changePercent24h < -0.05 ? "down" : "flat"}`} onClick={() => setSelectedAsset(asset)}><div><b>{asset.symbol}</b><small>{asset.name}</small></div><div><strong>{formatPct(asset.changePercent24h)}</strong><span>{formatUsd(asset.price)}</span></div></button>)}</div></div>)}</div>
        {heatmap.data && heatmap.data.errors.length > 0 && <div className="oracle-warning heatmap-warning"><span>{heatmap.data.errors.slice(0, 3).map((error) => `${error.symbol}: ${error.message}`).join(" - ")}</span></div>}
      </section>

      <AssetDetailPanel asset={selectedAsset} />
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "blue" | "cyan" | "amber" | "red" }) { return <div className={`oracle-metric ${tone}`}><span>{label}</span><b>{value}</b></div>; }
function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) { return <div className="panel-title"><div><b>{title}</b><span>{subtitle}</span></div></div>; }
function StateBlock({ title, body, danger }: { title: string; body: string; danger?: boolean }) { return <div className={`oracle-state ${danger ? "danger" : ""}`}><div><b>{title}</b><p>{body}</p></div></div>; }
function SignalRow({ signal }: { signal: Signal }) { return <div className={`signal-lane-row ${signal.sentiment}`}><div><span>{prettySource(signal.sourceType)} - {signal.category ?? "uncategorized"}</span><b>{signal.title}</b><p>{signal.summary || "Stored signal has no AI summary yet."}</p></div><div className="signal-lane-metrics"><Score label="Urg" value={signal.urgencyScore} /><Score label="Impact" value={signal.marketImpactScore} /><Score label="Geo" value={signal.geoRiskScore} /></div><div className="oracle-tags">{signal.affectedAssets.slice(0, 4).map((asset) => <span key={asset}>{asset}</span>)}{signal.affectedSectors.slice(0, 3).map((sector) => <span key={sector}>{sector}</span>)}</div></div>; }
function Score({ label, value }: { label: string; value: number }) { return <div className="mini-score"><span>{label}</span><b>{score(value)}</b></div>; }
function useGroupedAssets(assets: Asset[]) { return useMemo(() => { const map = new Map<string, Asset[]>(); assets.forEach((asset) => { const group = normalizeSector(asset.sector ?? asset.assetClass); map.set(group, [...(map.get(group) ?? []), asset]); }); return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)); }, [assets]); }
function normalizeSector(value: string) { const lower = value.toLowerCase(); if (lower.includes("tech") || lower.includes("semi")) return "AI and Semiconductors"; if (lower.includes("crypto")) return "Crypto"; if (lower.includes("energy") || lower.includes("commodity")) return "Energy and Commodities"; if (lower.includes("forex")) return "Currencies"; if (lower.includes("index")) return "Global Indices"; return value; }
function prettyProvider(provider: string) { return provider.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function prettySource(source: string) { const labels: Record<string, string> = { x_post: "Leader Post", news: "News", social: "Social Velocity", prediction_market: "PolyDelta", market_data: "Market Data", macro: "Macro", portfolio: "Portfolio" }; return labels[source] ?? prettyProvider(source); }
function formatRefresh(value?: number) { return value ? `${Math.round(value / 60_000)} min` : "not scheduled"; }
function score(value: number) { return `${Math.round(value * 100)}`; }
function avg(values: number[]) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0; }
