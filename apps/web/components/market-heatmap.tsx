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

export function MarketHeatmap() {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Asset | undefined>();
  const heatmap = useQuery({
    queryKey: ["heatmap", filter],
    queryFn: () => apiFetch<{ assets: Asset[]; errors: Array<{ symbol: string; message: string }> }>(`/market/heatmap?filter=${filter}`),
    refetchInterval: 60_000
  });
  const ranked = useMemo(() => {
    const assets = heatmap.data?.assets ?? [];
    const sortedMetric = [...assets].sort((a, b) => (b.marketCap ?? b.volume ?? 0) - (a.marketCap ?? a.volume ?? 0));
    return assets.map((asset) => ({ ...asset, rank: sortedMetric.findIndex((item) => item.symbol === asset.symbol) }));
  }, [heatmap.data?.assets]);

  return (
    <div className="terminal-grid">
      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Global Market Heatmap</div>
            <div className="panel-sub">Tiles render only from backend provider data. Missing providers show an unavailable state.</div>
          </div>
          <div className="filters">
            {filters.map(([key, label]) => <button key={key} className={`chip ${filter === key ? "active" : ""}`} onClick={() => setFilter(key)}>{label}</button>)}
          </div>
        </div>
        {heatmap.isLoading && <div className="state"><strong>Loading live market data</strong>Querying configured market providers through the backend.</div>}
        {heatmap.isError && <div className="state"><strong>Live market data unavailable</strong>{(heatmap.error as Error).message}</div>}
        {heatmap.data && (
          <>
            <div className="heatmap-grid">
              {ranked.map((asset) => {
                const direction = asset.changePercent24h > 0.05 ? "hm-up" : asset.changePercent24h < -0.05 ? "hm-down" : "hm-flat";
                const span = asset.rank === 0 ? "hm-span-3" : asset.rank > 0 && asset.rank < 5 ? "hm-span-2" : "";
                return (
                  <button key={`${asset.provider}-${asset.symbol}`} className={`hm-tile ${direction} ${span}`} onClick={() => setSelected(asset)}>
                    <div>
                      <div className="hm-symbol">{asset.symbol}</div>
                      <div className="hm-name">{asset.name}</div>
                    </div>
                    <div>
                      <div className="hm-change">{formatPct(asset.changePercent24h)}</div>
                      <div className="hm-name">{asset.sector ?? asset.assetClass} · {asset.provider}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            {heatmap.data.errors.length > 0 && (
              <div className="panel-body">
                <div className="nudge warning">
                  <b>Partial provider coverage</b>
                  <p>{heatmap.data.errors.slice(0, 3).map((error) => `${error.symbol}: ${error.message}`).join(" · ")}</p>
                </div>
              </div>
            )}
          </>
        )}
      </section>
      <AssetDetailPanel asset={selected} />
    </div>
  );
}
