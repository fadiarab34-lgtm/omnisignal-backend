"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { BrainCircuit, ShoppingCart, TrendingDown, X } from "lucide-react";
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

export function AssetDetailPanel({ asset, onClose }: { asset?: Asset; onClose?: () => void }) {
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
    return null;
  }

  return (
    <div className="asset-modal-backdrop">
      <div className="asset-modal">
        <div className="asset-modal-hero">
          <div>
            <div className="asset-modal-kicker">{asset.assetClass} / {asset.provider}</div>
            <h2>{asset.symbol} <span>{asset.name}</span></h2>
            <div className="asset-modal-price">{formatUsd(asset.price)} <span className={asset.changePercent24h >= 0 ? "healthy" : "down"}>{formatPct(asset.changePercent24h)} today</span></div>
          </div>
          {onClose && <button className="asset-modal-close" onClick={onClose} aria-label="Close asset modal"><X size={16} /></button>}
        </div>
        <div className="asset-modal-grid">
          <div className="asset-modal-left">
            <div className="asset-modal-chart">
              <div className="asset-modal-label">Live style price path</div>
              {candles.isLoading ? <div className="state"><strong>Loading candles</strong>Fetching real chart data.</div> : candles.isError ? <div className="state"><strong>Chart unavailable</strong>{(candles.error as Error).message}</div> : <AssetChart candles={candles.data?.candles ?? []} />}
            </div>
            <div className="asset-modal-stats">
              <div><span>Price</span><b>{formatUsd(asset.price)}</b></div>
              <div><span>Asset Class</span><b>{asset.assetClass}</b></div>
              <div><span>Current Signal</span><b>{asset.changePercent24h > 0 ? "Bullish" : asset.changePercent24h < 0 ? "Bearish" : "Neutral"}</b></div>
            </div>
          </div>
          <div className="asset-modal-right">
            <div className="asset-modal-copy">
              <h3>AI Signal</h3>
              <p>Run real AI analysis to connect this asset to market data, events, and portfolio context.</p>
              <button className="primary-btn" onClick={() => analysis.mutate()} disabled={analysis.isPending}>
                <BrainCircuit size={15} /> {analysis.isPending ? "Analyzing" : "Run Real AI Analysis"}
              </button>
              {analysis.isError && <div className="nudge urgent"><b>AI unavailable</b><p>{(analysis.error as Error).message}</p></div>}
              {analysis.data?.analysis && (
                <div className="asset-ai-result">
                  <b>{analysis.data.analysis.headline}</b>
                  <p>{analysis.data.analysis.summary}</p>
                  <p>Signal: {analysis.data.analysis.signal} · Confidence {(analysis.data.analysis.confidence * 100).toFixed(0)}%</p>
                </div>
              )}
            </div>
            <div className="asset-modal-copy">
              <h3>Actions</h3>
              <div className="asset-modal-actions">
                <Link className="secondary-btn" href={`/portal/portfolio?symbol=${encodeURIComponent(asset.symbol)}&assetClass=${asset.assetClass}`}><ShoppingCart size={15} /> Add to portfolio</Link>
                <Link className="primary-btn" href={`/portal/trading?symbol=${encodeURIComponent(asset.symbol)}&side=buy`}>Buy More</Link>
                <Link className="danger-btn" href={`/portal/trading?symbol=${encodeURIComponent(asset.symbol)}&side=sell`}><TrendingDown size={15} /> Sell / Reduce</Link>
              </div>
              <p>Select an action to simulate impact or prepare a backend-validated ticket.</p>
            </div>
          </div>
        </div>
        <div className="asset-modal-bottom">
          <div>
            <h3>Scenario Stress Test</h3>
            <p>Scenario impact appears after running a portfolio simulation with this asset.</p>
          </div>
          <div>
            <h3>Portfolio Nudge</h3>
            <p>Connect a wallet and open a portfolio to calculate exposure-specific guidance.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
