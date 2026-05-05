"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { apiFetch, formatPct } from "../lib/api";
import { AssetDetailPanel } from "./asset-detail-panel";

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

const filters = [
  ["all", "All"],
  ["equity", "Equities"],
  ["crypto", "Crypto"],
  ["commodity", "Commodities"],
  ["forex", "Forex"],
  ["index", "Indices"],
  ["perp", "Perps"]
] as const;

type Provider = {
  provider: string;
  status: string;
  message: string;
};

type Signal = {
  id: string;
  headline: string;
  summary: string;
  symbol?: string | null;
  createdAt: string;
};

export function MarketHeatmap() {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Asset | undefined>();
  const heatmap = useQuery({
    queryKey: ["heatmap", filter],
    queryFn: () => apiFetch<{ assets: Asset[]; errors: Array<{ symbol: string; message: string }> }>(`/market/heatmap?filter=${filter}`),
    refetchInterval: 60_000
  });
  const providers = useQuery({
    queryKey: ["market-providers-status"],
    queryFn: () => apiFetch<{ providers: Provider[] }>("/health/providers"),
    refetchInterval: 60_000
  });
  const signals = useQuery({
    queryKey: ["latest-signals"],
    queryFn: () => apiFetch<{ signals: Signal[] }>("/signals/latest"),
    refetchInterval: 60_000
  });
  const ranked = useMemo(() => {
    const assets = heatmap.data?.assets ?? [];
    const sortedMetric = [...assets].sort((a, b) => (b.marketCap ?? b.volume ?? 0) - (a.marketCap ?? a.volume ?? 0));
    return assets.map((asset) => ({ ...asset, rank: sortedMetric.findIndex((item) => item.symbol === asset.symbol) }));
  }, [heatmap.data?.assets]);
  const grouped = useMemo(() => {
    const map = new Map<string, typeof ranked>();
    ranked.forEach((asset) => {
      const key = asset.sector ?? asset.assetClass;
      map.set(key, [...(map.get(key) ?? []), asset]);
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [ranked]);
  const providerSummary = providers.data?.providers ?? [];
  const liveCount = heatmap.data?.assets.length ?? 0;
  const warningCount = heatmap.data?.errors.length ?? 0;

  return (
    <div className="intel-terminal">
      <aside className="oracle-column">
        <div className="oracle-tabs">
          <span className="active">Oracle</span>
          <span>Providers</span>
          <span>Signals</span>
        </div>
        <div className="oracle-wrap">
          <div className="oracle-hero">
            <div className="oracle-badge"><span className="live-dot" />AI Oracle</div>
            <p>
              OmniSignal is reading live provider data through the backend. Select a heatmap tile to run
              structured OpenAI analysis against that asset, candles, events, and portfolio context.
            </p>
            <div className="oracle-stat-grid">
              <div><span>Live tiles</span><b>{liveCount}</b></div>
              <div><span>Warnings</span><b className={warningCount ? "degraded" : "healthy"}>{warningCount}</b></div>
            </div>
          </div>
          <div className="oracle-card">
            <div className="oracle-card-head">Provider Health</div>
            {providers.isLoading && <p className="panel-sub">Checking providers.</p>}
            {providers.isError && <p className="down">{(providers.error as Error).message}</p>}
            {providerSummary.slice(0, 6).map((provider) => (
              <div className="provider-row" key={provider.provider}>
                <span>{provider.provider}</span>
                <b className={provider.status}>{provider.status === "missing_config" ? "Missing config" : provider.status}</b>
              </div>
            ))}
          </div>
          <div className="oracle-card">
            <div className="oracle-card-head">Stored AI Signals</div>
            {signals.isLoading && <p className="panel-sub">Loading stored signals.</p>}
            {signals.isError && <p className="down">{(signals.error as Error).message}</p>}
            {signals.data?.signals.length === 0 && <p className="panel-sub">No AI signals have been stored yet.</p>}
            {signals.data?.signals.slice(0, 4).map((signal) => (
              <div className="signal-row" key={signal.id}>
                <b>{signal.headline}</b>
                <p>{signal.summary}</p>
                {signal.symbol && <span>{signal.symbol}</span>}
              </div>
            ))}
          </div>
        </div>
      </aside>
      <section className="marketmap-wrap">
        <div className="marketmap-head">
          <div>
            <div className="marketmap-title">Global Market Heatmap by Industry</div>
            <div className="marketmap-sub">Every tile is rendered from backend provider data. Missing providers show unavailable states instead of sample prices.</div>
          </div>
          <div className="marketmap-tabs">
            {filters.map(([key, label]) => <button key={key} className={`hm-filter ${filter === key ? "on" : ""}`} onClick={() => setFilter(key)}>{label}</button>)}
          </div>
        </div>
        {heatmap.isLoading && <div className="state terminal-state"><strong>Loading live market data</strong>Querying configured market providers through the backend.</div>}
        {heatmap.isError && <div className="state terminal-state"><strong>Live market data unavailable</strong>{(heatmap.error as Error).message}</div>}
        {heatmap.data && (
          <>
            <div className="marketmap-grid">
              {grouped.map(([group, assets]) => {
                const average = assets.reduce((sum, asset) => sum + asset.changePercent24h, 0) / Math.max(assets.length, 1);
                return (
                  <div className="market-industry" key={group}>
                    <div className="market-industry-head">
                      <div className="market-industry-title"><span />{group}</div>
                      <div className={average >= 0 ? "healthy" : "down"}>{formatPct(average)}</div>
                    </div>
                    <div className="market-sector-grid">
                      {assets.map((asset) => {
                        const direction = asset.changePercent24h > 0.05 ? "market-bull" : asset.changePercent24h < -0.05 ? "market-bear" : "market-flat";
                        const span = asset.rank === 0 ? "market-size-xl" : asset.rank > 0 && asset.rank < 5 ? "market-size-lg" : "market-size-sm";
                        return (
                          <button key={`${asset.provider}-${asset.symbol}`} className={`market-tile ${direction} ${span}`} onClick={() => setSelected(asset)}>
                            <div>
                              <div className="market-ticker">{asset.symbol}</div>
                              <div className="market-name">{asset.name}</div>
                            </div>
                            <div>
                              <div className="market-change">{formatPct(asset.changePercent24h)}</div>
                              <div className="market-meta"><span>{asset.assetClass}</span><span>{asset.provider}</span></div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="marketmap-footer">
              <div><b>Live Market Read</b><p>{liveCount} provider-backed tiles loaded for the current filter.</p></div>
              <div><b>Provider Coverage</b><p>{warningCount ? `${warningCount} symbols returned provider warnings.` : "No provider warnings returned for visible tiles."}</p></div>
              <div><b>AI Action</b><p>Select a tile, then run real AI analysis from the asset panel.</p></div>
            </div>
            {heatmap.data.errors.length > 0 && (
              <div className="nudge warning compact-nudge">
                <b>Partial provider coverage</b>
                <p>{heatmap.data.errors.slice(0, 3).map((error) => `${error.symbol}: ${error.message}`).join(" - ")}</p>
              </div>
            )}
          </>
        )}
      </section>
      <AssetDetailPanel asset={selected} />
    </div>
  );
}
