"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch, formatPct, formatUsd } from "../lib/api";

type TapeAsset = {
  symbol: string;
  name: string;
  price: number;
  changePercent24h: number;
  provider: string;
};

export function MarketTape({ compact = false }: { compact?: boolean }) {
  const heatmap = useQuery({
    queryKey: ["market-tape"],
    queryFn: () => apiFetch<{ assets: TapeAsset[]; errors: Array<{ symbol: string; message: string }> }>("/market/heatmap?filter=all"),
    refetchInterval: 60_000
  });

  if (heatmap.isLoading) {
    return (
      <div className={compact ? "tape-bar compact" : "landing-tape"}>
        <div className="tape-status">Loading live market pulse through backend providers.</div>
      </div>
    );
  }

  if (heatmap.isError || !heatmap.data?.assets.length) {
    return (
      <div className={compact ? "tape-bar compact" : "landing-tape"}>
        <div className="tape-status warning">Live market pulse unavailable. Check provider configuration.</div>
      </div>
    );
  }

  const assets = heatmap.data.assets.slice(0, 14);
  const loop = [...assets, ...assets];

  return (
    <div className={compact ? "tape-bar compact" : "landing-tape"}>
      {!compact && (
        <div className="tape-label">
          <span className="live-dot" />
          Market Pulse Feed
        </div>
      )}
      <div className="tape-viewport">
        <div className="tape-track">
          {loop.map((asset, index) => (
            <span className="tape-item" key={`${asset.provider}-${asset.symbol}-${index}`}>
              <b>{asset.symbol}</b>
              <span>{formatUsd(asset.price)}</span>
              <em className={asset.changePercent24h >= 0 ? "healthy" : "down"}>{formatPct(asset.changePercent24h)}</em>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
