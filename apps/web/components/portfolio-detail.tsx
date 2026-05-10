"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { apiFetch, formatPct, formatUsd } from "../lib/api";
import { useWalletStore } from "../stores/wallet-store";
import { ConnectWalletButton } from "./connect-wallet-button";

type PortfolioSummary = {
  id: string;
  name: string;
  mode: string;
  totalValue: number;
  dailyChangePercent: number;
  positions: Array<{ symbol: string; allocationPercent: number }>;
};

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
  const address = useWalletStore((state) => state.address);
  const queryClient = useQueryClient();
  const [symbol, setSymbol] = useState("");
  const [assetClass, setAssetClass] = useState("equity");
  const [quantity, setQuantity] = useState("");
  const [avgCost, setAvgCost] = useState("");

  const portfolios = useQuery({
    queryKey: ["portfolios"],
    queryFn: () => apiFetch<{ portfolios: PortfolioSummary[] }>("/portfolio"),
    enabled: Boolean(address)
  });
  const portfolio = useQuery({
    queryKey: ["portfolio", id],
    queryFn: () => apiFetch<{ portfolio: Portfolio }>(`/portfolio/${id}`),
    enabled: Boolean(address)
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
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
    }
  });
  const analysis = useMutation({
    mutationFn: () => apiFetch("/ai/analyze/portfolio", { method: "POST", body: JSON.stringify({ portfolioId: id }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["portfolio", id] })
  });

  const data = portfolio.data?.portfolio;
  const groups = useMemo(() => groupPositions(data?.positions ?? []), [data?.positions]);

  if (!address) {
    return (
      <div className="portfolio-terminal">
        <aside className="portfolio-rail"><h2>My Portfolios</h2><div className="wallet-mini-state"><div className="lock-icon"><LockKeyhole size={22} /></div><b>Wallet not connected</b><p>Connect MetaMask to unlock saved portfolios.</p><ConnectWalletButton /></div></aside>
        <main className="portfolio-empty-main"><div className="portfolio-empty-card"><div className="lock-icon large"><LockKeyhole size={28} /></div><h1>Connect wallet to view portfolios</h1><p>Your portfolio list, allocations, pending trades, AI analysis and universe stay hidden until MetaMask is connected.</p><ConnectWalletButton /></div></main>
      </div>
    );
  }

  return (
    <div className="portfolio-terminal detail">
      <aside className="portfolio-rail">
        <div className="portfolio-rail-head"><h2>My Portfolios</h2></div>
        {portfolios.data?.portfolios.map((item) => (
          <Link key={item.id} href={`/portal/portfolio/${item.id}`} className={`portfolio-rail-item ${item.id === id ? "active" : ""}`}>
            <b>{item.name}</b>
            <span>{formatUsd(item.totalValue)} <em className={item.dailyChangePercent >= 0 ? "healthy" : "down"}>{formatPct(item.dailyChangePercent)}</em></span>
          </Link>
        ))}
      </aside>
      <main className="portfolio-detail-main">
        {portfolio.isLoading && <div className="portfolio-empty-card"><h1>Loading portfolio</h1><p>Refreshing positions with live provider prices.</p></div>}
        {portfolio.isError && <div className="portfolio-empty-card"><h1>Portfolio unavailable</h1><p>{(portfolio.error as Error).message}</p></div>}
        {data && (
          <>
            <div className="portfolio-title-row">
              <h1>{data.name}</h1>
              <div>
                <button className="secondary-btn" onClick={() => analysis.mutate()} disabled={analysis.isPending}>Analyze risk</button>
                <Link className="primary-btn" href={`/portal/portfolio/${id}/universe`}>Open Universe</Link>
              </div>
            </div>
            <div className="portfolio-metric-strip">
              <Metric label="Value" value={formatUsd(data.totalValue)} tone="blue" />
              <Metric label="Daily Change" value={formatPct(data.dailyChangePercent)} tone={data.dailyChangePercent >= 0 ? "green" : "red"} />
              <Metric label="Risk Score" value={data.riskScore === null ? "N/A" : data.riskScore.toFixed(0)} tone="amber" />
              <Metric label="Positions" value={String(data.positions.length)} tone="plain" />
              <Metric label="Mode" value={data.mode} tone="plain" />
            </div>

            <section className="portfolio-graph-card">
              <div className="terminal-card-head"><b><span />Portfolio Graph</b><em>Database positions only</em></div>
              {data.positions.length === 0 ? <div className="portfolio-empty-inline">No graph nodes yet. Add live-priced positions first.</div> : <PortfolioBubbleGraph positions={data.positions} />}
            </section>

            <section className="universe-callout">
              <div><b><span />Immersive Portfolio Universe</b><p>Open the dedicated 3D universe inside OmniSignal. The platform header stays visible, and you can close back into this portfolio anytime.</p></div>
              <Link href={`/portal/portfolio/${id}/universe`}>Open Universe</Link>
            </section>

            <section className="terminal-card">
              <div className="terminal-card-head"><b><span />AI Nudges</b><em>{data.aiNudges.length} stored</em></div>
              {data.aiNudges.length === 0 ? <div className="portfolio-empty-inline">No AI nudges have been generated for this portfolio yet.</div> : data.aiNudges.slice(0, 4).map((nudge) => (
                <article className={`proposal-row ${nudge.severity}`} key={nudge.id}>
                  <h3>{nudge.title}</h3>
                  <p>{nudge.message}</p>
                  <div>{nudge.linkedSymbols.map((item) => <span key={item}>{item}</span>)}</div>
                </article>
              ))}
            </section>

            <section className="terminal-card">
              <div className="terminal-card-head"><b>Positions - {groups.length} categories</b></div>
              {data.positions.length === 0 ? <div className="portfolio-empty-inline">No positions yet. Add a position below to generate allocations and universe nodes.</div> : (
                <div className="terminal-position-table">
                  {groups.map((group) => (
                    <div className="position-category" key={group.name}>
                      <div><i style={{ background: group.color }} /><b>{group.name}</b><p>{group.positions.map((position) => `${position.symbol} ${position.allocationPercent.toFixed(1)}%`).join(" / ")}</p></div>
                      <strong>{formatUsd(group.total)}</strong>
                      <em>{group.allocation.toFixed(1)}%</em>
                      <Link href={`/portal/trading?symbol=${encodeURIComponent(group.positions[0]!.symbol)}&side=buy`}>Buy</Link>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="terminal-card">
              <div className="terminal-card-head"><b>Add Position</b><em>Backend validates with live quote</em></div>
              <div className="add-position-grid">
                <input aria-label="Symbol" value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} />
                <select value={assetClass} onChange={(event) => setAssetClass(event.target.value)}>
                  <option value="equity">Equity</option>
                  <option value="etf">ETF</option>
                  <option value="crypto">Crypto</option>
                  <option value="forex">Forex</option>
                  <option value="commodity">Commodity</option>
                  <option value="index">Index</option>
                  <option value="perp">Perp</option>
                </select>
                <input aria-label="Quantity" inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
                <input aria-label="Average cost" inputMode="decimal" value={avgCost} onChange={(event) => setAvgCost(event.target.value)} />
                <button className="primary-btn" onClick={() => add.mutate()} disabled={add.isPending}>Add</button>
              </div>
              {add.isError && <p className="down">{(add.error as Error).message}</p>}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "blue" | "green" | "red" | "amber" | "plain" }) {
  return <div className={`portfolio-strip-metric ${tone}`}><span>{label}</span><b>{value}</b></div>;
}

function PortfolioBubbleGraph({ positions }: { positions: Portfolio["positions"] }) {
  return (
    <div className="bubble-graph">
      <div className="bubble-node center">Portfolio</div>
      {positions.map((position, index) => {
        const angle = (index / Math.max(positions.length, 1)) * Math.PI * 2;
        const size = Math.max(34, Math.min(92, 34 + position.allocationPercent));
        const left = 50 + Math.cos(angle) * 23;
        const top = 50 + Math.sin(angle) * 26;
        return (
          <div
            className={`bubble-node ${position.dailyChangePercent >= 0 ? "up" : "down"}`}
            key={position.id}
            style={{ width: size, height: size, left: `${left}%`, top: `${top}%` }}
          >
            <b>{position.symbol}</b>
            <span>{formatPct(position.dailyChangePercent)}</span>
          </div>
        );
      })}
    </div>
  );
}

function groupPositions(positions: Portfolio["positions"]) {
  const colors = ["#3b82f6", "#fb923c", "#d6a93c", "#9aa4ad", "#8b48e8", "#b68cff", "#60a5fa"];
  const map = new Map<string, Portfolio["positions"]>();
  positions.forEach((position) => {
    const key = categoryName(position.assetClass);
    map.set(key, [...(map.get(key) ?? []), position]);
  });
  return [...map.entries()].map(([name, group], index) => ({
    name,
    positions: group,
    color: colors[index % colors.length],
    total: group.reduce((sum, position) => sum + position.marketValue, 0),
    allocation: group.reduce((sum, position) => sum + position.allocationPercent, 0)
  }));
}

function categoryName(assetClass: string) {
  if (assetClass === "crypto") return "Crypto";
  if (assetClass === "commodity") return "Energy / Commodities";
  if (assetClass === "forex") return "Cash / Currencies";
  if (assetClass === "index") return "Global Indices";
  if (assetClass === "etf") return "ETFs";
  return "US Equities";
}
