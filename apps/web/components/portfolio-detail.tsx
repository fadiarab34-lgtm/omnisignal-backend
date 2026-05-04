"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { apiFetch, formatPct, formatUsd } from "../lib/api";
import { WalletGate } from "./wallet-gate";

type Portfolio = {
  id: string;
  name: string;
  mode: string;
  totalValue: number;
  dailyChangeAmount: number;
  dailyChangePercent: number;
  riskScore: number | null;
  positions: Array<{
    id: string;
    symbol: string;
    name: string;
    assetClass: string;
    quantity: number;
    avgCost: number;
    currentPrice: number;
    marketValue: number;
    allocationPercent: number;
    unrealizedPnl: number;
    unrealizedPnlPercent: number;
    dailyChangePercent: number;
  }>;
  aiNudges: Array<{ id: string; severity: string; title: string; message: string; linkedSymbols: string[] }>;
};

export function PortfolioDetail({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const [symbol, setSymbol] = useState("");
  const [assetClass, setAssetClass] = useState("equity");
  const [quantity, setQuantity] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const portfolio = useQuery({
    queryKey: ["portfolio", id],
    queryFn: () => apiFetch<{ portfolio: Portfolio }>(`/portfolio/${id}`)
  });
  const add = useMutation({
    mutationFn: () => apiFetch<{ portfolio: Portfolio }>(`/portfolio/${id}/positions`, {
      method: "POST",
      body: JSON.stringify({ symbol, assetClass, quantity: Number(quantity), avgCost: Number(avgCost) })
    }),
    onSuccess: () => {
      setSymbol("");
      setQuantity("");
      setAvgCost("");
      queryClient.invalidateQueries({ queryKey: ["portfolio", id] });
    }
  });
  const analysis = useMutation({
    mutationFn: () => apiFetch("/ai/analyze/portfolio", { method: "POST", body: JSON.stringify({ portfolioId: id }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["portfolio", id] })
  });

  return (
    <WalletGate>
      {portfolio.isLoading && <div className="panel"><div className="state"><strong>Loading portfolio</strong>Refreshing positions with live prices.</div></div>}
      {portfolio.isError && <div className="panel"><div className="state"><strong>Portfolio unavailable</strong>{(portfolio.error as Error).message}</div></div>}
      {portfolio.data?.portfolio && (
        <div style={{ display: "grid", gap: 14 }}>
          <section className="panel">
            <div className="panel-head">
              <div>
                <div className="panel-title">{portfolio.data.portfolio.name}</div>
                <div className="panel-sub">{portfolio.data.portfolio.mode} · values refresh from live provider quotes</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="secondary-btn" onClick={() => analysis.mutate()} disabled={analysis.isPending}>Run AI Analysis</button>
                <Link className="primary-btn" href={`/portal/portfolio/${id}/universe`}>Open Universe</Link>
              </div>
            </div>
            <div className="panel-body">
              <div className="metric-row">
                <div className="metric"><span>Total Value</span><strong>{formatUsd(portfolio.data.portfolio.totalValue)}</strong></div>
                <div className="metric"><span>Daily Change</span><strong className={portfolio.data.portfolio.dailyChangePercent >= 0 ? "healthy" : "down"}>{formatPct(portfolio.data.portfolio.dailyChangePercent)}</strong></div>
                <div className="metric"><span>Risk Score</span><strong>{portfolio.data.portfolio.riskScore === null ? "N/A" : portfolio.data.portfolio.riskScore.toFixed(0)}</strong></div>
              </div>
            </div>
          </section>
          <section className="panel">
            <div className="panel-head"><div><div className="panel-title">Add Position</div><div className="panel-sub">The backend validates the symbol by fetching a live quote before saving.</div></div></div>
            <div className="panel-body">
              <div className="form-grid">
                <div className="field"><label>Symbol</label><input value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} /></div>
                <div className="field"><label>Asset Class</label><select value={assetClass} onChange={(event) => setAssetClass(event.target.value)}><option value="equity">Equity</option><option value="etf">ETF</option><option value="crypto">Crypto</option><option value="forex">Forex</option><option value="commodity">Commodity</option><option value="index">Index</option><option value="perp">Perp</option></select></div>
                <div className="field"><label>Quantity</label><input inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></div>
                <div className="field"><label>Average Cost</label><input inputMode="decimal" value={avgCost} onChange={(event) => setAvgCost(event.target.value)} /></div>
                <button className="primary-btn" onClick={() => add.mutate()} disabled={add.isPending}>Add</button>
              </div>
              {add.isError && <p className="down">{(add.error as Error).message}</p>}
            </div>
          </section>
          <section className="panel">
            <div className="panel-head"><div><div className="panel-title">Positions</div><div className="panel-sub">No row is rendered without a database position and live refreshed price.</div></div></div>
            <div className="panel-body" style={{ overflowX: "auto" }}>
              {portfolio.data.portfolio.positions.length === 0 ? <div className="state"><strong>No positions yet.</strong>Add a position to generate live allocations and universe nodes.</div> : (
                <table className="position-table">
                  <thead><tr><th>Symbol</th><th>Qty</th><th>Price</th><th>Value</th><th>Allocation</th><th>PnL</th><th>Day</th></tr></thead>
                  <tbody>
                    {portfolio.data.portfolio.positions.map((position) => (
                      <tr key={position.id}>
                        <td><strong>{position.symbol}</strong><div className="panel-sub">{position.name}</div></td>
                        <td>{position.quantity.toFixed(6)}</td>
                        <td>{formatUsd(position.currentPrice)}</td>
                        <td>{formatUsd(position.marketValue)}</td>
                        <td>{position.allocationPercent.toFixed(2)}%</td>
                        <td className={position.unrealizedPnl >= 0 ? "healthy" : "down"}>{formatUsd(position.unrealizedPnl)} · {formatPct(position.unrealizedPnlPercent)}</td>
                        <td className={position.dailyChangePercent >= 0 ? "healthy" : "down"}>{formatPct(position.dailyChangePercent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
          {portfolio.data.portfolio.aiNudges.length > 0 && (
            <section className="panel">
              <div className="panel-head"><div><div className="panel-title">AI Nudges</div><div className="panel-sub">Stored nudges generated from analysis and portfolio context.</div></div></div>
              <div className="panel-body signal-feed">
                {portfolio.data.portfolio.aiNudges.slice(0, 3).map((nudge) => <div className={`nudge ${nudge.severity}`} key={nudge.id}><b>{nudge.title}</b><p>{nudge.message}</p></div>)}
              </div>
            </section>
          )}
        </div>
      )}
    </WalletGate>
  );
}
