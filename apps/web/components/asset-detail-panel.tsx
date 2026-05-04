"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { BrainCircuit, ShoppingCart, TrendingDown } from "lucide-react";
import Link from "next/link";
import { apiFetch, formatPct, formatUsd } from "../lib/api";
import { AssetChart } from "./asset-chart";

type Asset = {
  symbol: string;
  name: string;
  assetClass: string;
  price: number;
  changePercent24h: number;
  provider: string;
};

export function AssetDetailPanel({ asset }: { asset?: Asset }) {
  const candles = useQuery({
    queryKey: ["candles", asset?.symbol],
    enabled: Boolean(asset),
    queryFn: () => apiFetch<{ candles: Array<{ timestamp: string; open: number; high: number; low: number; close: number }> }>(`/market/candles?symbol=${encodeURIComponent(asset!.symbol)}&assetClass=${asset!.assetClass}&range=1M&interval=1day`)
  });
  const analysis = useMutation({
    mutationFn: () => apiFetch<{ analysis: { headline: string; summary: string; signal: string; confidence: number; disclaimer: string } }>("/ai/analyze/asset", {
      method: "POST",
      body: JSON.stringify({ symbol: asset?.symbol, assetClass: asset?.assetClass, range: "1M" })
    })
  });

  if (!asset) {
    return (
      <div className="panel asset-panel">
        <div className="panel-head"><div><div className="panel-title">Asset Detail</div><div className="panel-sub">Select a heatmap tile.</div></div></div>
        <div className="state"><strong>No asset selected</strong>Click a live tile to load its provider quote, candles, linked events, and AI analysis.</div>
      </div>
    );
  }

  return (
    <div className="panel asset-panel">
      <div className="panel-head">
        <div>
          <div className="panel-title">{asset.symbol}</div>
          <div className="panel-sub">{asset.name} · {asset.provider}</div>
        </div>
        <span className={asset.changePercent24h >= 0 ? "healthy" : "down"}>{formatPct(asset.changePercent24h)}</span>
      </div>
      <div className="panel-body asset-panel">
        <div className="metric-row">
          <div className="metric"><span>Price</span><strong>{formatUsd(asset.price)}</strong></div>
          <div className="metric"><span>Change</span><strong>{formatPct(asset.changePercent24h)}</strong></div>
          <div className="metric"><span>Class</span><strong>{asset.assetClass}</strong></div>
        </div>
        <div className="chart-box">
          {candles.isLoading ? <div className="state"><strong>Loading candles</strong>Fetching real chart data.</div> : candles.isError ? <div className="state"><strong>Chart unavailable</strong>{(candles.error as Error).message}</div> : <AssetChart candles={candles.data?.candles ?? []} />}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className="secondary-btn" href={`/portal/portfolio?symbol=${encodeURIComponent(asset.symbol)}&assetClass=${asset.assetClass}`}><ShoppingCart size={15} /> Add to portfolio</Link>
          <Link className="secondary-btn" href={`/portal/trading?symbol=${encodeURIComponent(asset.symbol)}&side=buy`}>Buy more</Link>
          <Link className="secondary-btn" href={`/portal/portfolio?simulate=${encodeURIComponent(asset.symbol)}`}>Simulate</Link>
          <Link className="danger-btn" href={`/portal/trading?symbol=${encodeURIComponent(asset.symbol)}&side=sell`}><TrendingDown size={15} /> Reduce</Link>
        </div>
        <button className="primary-btn" onClick={() => analysis.mutate()} disabled={analysis.isPending}>
          <BrainCircuit size={15} /> {analysis.isPending ? "Analyzing" : "Run Real AI Analysis"}
        </button>
        {analysis.isError && <div className="nudge urgent"><b>AI unavailable</b><p>{(analysis.error as Error).message}</p></div>}
        {analysis.data?.analysis && (
          <div className="nudge">
            <b>{analysis.data.analysis.headline}</b>
            <p>{analysis.data.analysis.summary}</p>
            <p style={{ marginTop: 8 }}>Signal: {analysis.data.analysis.signal} · Confidence {(analysis.data.analysis.confidence * 100).toFixed(0)}%</p>
            <p style={{ marginTop: 8 }}>{analysis.data.analysis.disclaimer}</p>
          </div>
        )}
      </div>
    </div>
  );
}
