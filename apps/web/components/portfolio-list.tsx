"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { apiFetch, formatPct, formatUsd } from "../lib/api";
import { useWalletStore } from "../stores/wallet-store";
import { ConnectWalletButton } from "./connect-wallet-button";

type Portfolio = {
  id: string;
  name: string;
  mode: string;
  totalValue: number;
  dailyChangePercent: number;
  dailyChangeAmount: number;
  riskScore: number | null;
  positions: Array<{ symbol: string; allocationPercent: number }>;
};

export function PortfolioList() {
  const [name, setName] = useState("");
  const address = useWalletStore((state) => state.address);
  const error = useWalletStore((state) => state.error);
  const queryClient = useQueryClient();
  const portfolios = useQuery({
    queryKey: ["portfolios"],
    queryFn: () => apiFetch<{ portfolios: Portfolio[] }>("/portfolio"),
    enabled: Boolean(address)
  });
  const create = useMutation({
    mutationFn: () => apiFetch<{ portfolio: Portfolio }>("/portfolio", {
      method: "POST",
      body: JSON.stringify({ name: name.trim(), mode: "simulation" })
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["portfolios"] })
  });

  if (!address) {
    return (
      <div className="portfolio-terminal">
        <aside className="portfolio-rail">
          <h2>My Portfolios</h2>
          <div className="wallet-mini-state">
            <div className="lock-icon">Lock</div>
            <b>Wallet not connected</b>
            <p>Connect MetaMask to unlock saved portfolios.</p>
            <ConnectWalletButton />
          </div>
        </aside>
        <main className="portfolio-empty-main">
          <div className="portfolio-empty-card">
            <div className="lock-icon large">Lock</div>
            <h1>Connect wallet to view portfolios</h1>
            <p>Your portfolio list, allocations, pending trades, AI analysis, and immersive universe stay hidden until MetaMask is connected.</p>
            <ConnectWalletButton />
            {error && <p className="down">{error}</p>}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="portfolio-terminal">
      <aside className="portfolio-rail">
        <div className="portfolio-rail-head">
          <h2>My Portfolios</h2>
          <button onClick={() => create.mutate()} disabled={create.isPending || !name.trim()}>+ New</button>
        </div>
        <div className="portfolio-create-inline">
          <label>New simulation</label>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        {portfolios.isLoading && <p className="empty-terminal-line">Loading wallet-linked portfolios.</p>}
        {portfolios.isError && <p className="empty-terminal-line">{(portfolios.error as Error).message}</p>}
        {portfolios.data?.portfolios.map((portfolio) => (
          <Link key={portfolio.id} href={`/portal/portfolio/${portfolio.id}`} className="portfolio-rail-item">
            <b>{portfolio.name}</b>
            <span>{formatUsd(portfolio.totalValue)} <em className={portfolio.dailyChangePercent >= 0 ? "healthy" : "down"}>{formatPct(portfolio.dailyChangePercent)}</em></span>
          </Link>
        ))}
      </aside>
      <main className="portfolio-list-main">
        {portfolios.data?.portfolios.length === 0 && (
          <div className="portfolio-empty-card">
            <h1>No portfolio yet.</h1>
            <p>Create a simulated portfolio record owned by this verified wallet. No holdings appear until you add real positions backed by provider prices.</p>
            <div className="portfolio-create-wide">
              <input value={name} onChange={(event) => setName(event.target.value)} />
              <button className="primary-btn" onClick={() => create.mutate()} disabled={create.isPending || !name.trim()}>Create simulated portfolio</button>
            </div>
            {create.isError && <p className="down">{(create.error as Error).message}</p>}
          </div>
        )}
        {Boolean(portfolios.data?.portfolios.length) && (
          <div className="portfolio-card-grid">
            {portfolios.data!.portfolios.map((portfolio) => (
              <Link href={`/portal/portfolio/${portfolio.id}`} className="portfolio-terminal-card" key={portfolio.id}>
                <div>
                  <span>{portfolio.mode}</span>
                  <h2>{portfolio.name}</h2>
                  <p>{portfolio.positions.length} positions</p>
                </div>
                <div className="portfolio-card-metrics">
                  <div><span>Value</span><b>{formatUsd(portfolio.totalValue)}</b></div>
                  <div><span>Day</span><b className={portfolio.dailyChangePercent >= 0 ? "healthy" : "down"}>{formatPct(portfolio.dailyChangePercent)}</b></div>
                  <div><span>Risk</span><b>{portfolio.riskScore === null ? "N/A" : portfolio.riskScore.toFixed(0)}</b></div>
                </div>
                <p>Top holdings: {portfolio.positions.slice(0, 4).map((position) => `${position.symbol} ${position.allocationPercent.toFixed(1)}%`).join(" / ") || "No positions yet"}</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
