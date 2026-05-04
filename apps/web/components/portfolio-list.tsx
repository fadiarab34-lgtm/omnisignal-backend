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
  dailyChangePercent: number;
  dailyChangeAmount: number;
  riskScore: number | null;
  positions: Array<{ symbol: string; allocationPercent: number }>;
};

export function PortfolioList() {
  const [name, setName] = useState("Simulation Portfolio");
  const queryClient = useQueryClient();
  const portfolios = useQuery({
    queryKey: ["portfolios"],
    queryFn: () => apiFetch<{ portfolios: Portfolio[] }>("/portfolio")
  });
  const create = useMutation({
    mutationFn: () => apiFetch<{ portfolio: Portfolio }>("/portfolio", {
      method: "POST",
      body: JSON.stringify({ name, mode: "simulation" })
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["portfolios"] })
  });

  return (
    <WalletGate>
      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Wallet Portfolios</div>
            <div className="panel-sub">Only database records owned by the verified wallet appear here.</div>
          </div>
        </div>
        <div className="panel-body">
          {portfolios.isLoading && <div className="state"><strong>Loading portfolios</strong>Reading wallet-linked database records.</div>}
          {portfolios.isError && <div className="state"><strong>Portfolio unavailable</strong>{(portfolios.error as Error).message}</div>}
          {portfolios.data?.portfolios.length === 0 && (
            <div className="state">
              <div>
                <strong>No portfolio yet.</strong>
                <p>Create a simulation portfolio, then add positions backed by live prices.</p>
                <div className="form-grid" style={{ marginTop: 16 }}>
                  <div className="field"><label>Name</label><input value={name} onChange={(event) => setName(event.target.value)} /></div>
                  <button className="primary-btn" onClick={() => create.mutate()} disabled={create.isPending}>Create simulated portfolio</button>
                </div>
                {create.isError && <p className="down">{(create.error as Error).message}</p>}
              </div>
            </div>
          )}
          {Boolean(portfolios.data?.portfolios.length) && (
            <>
              <div className="form-grid" style={{ marginBottom: 14 }}>
                <div className="field"><label>New simulation portfolio</label><input value={name} onChange={(event) => setName(event.target.value)} /></div>
                <button className="primary-btn" onClick={() => create.mutate()} disabled={create.isPending}>Create</button>
              </div>
              <div className="card-grid">
                {portfolios.data!.portfolios.map((portfolio) => (
                  <Link href={`/portal/portfolio/${portfolio.id}`} className="portfolio-card" key={portfolio.id}>
                    <div>
                      <h3>{portfolio.name}</h3>
                      <p className="panel-sub">{portfolio.mode} · {portfolio.positions.length} positions</p>
                    </div>
                    <div className="metric-row">
                      <div className="metric"><span>Total</span><strong>{formatUsd(portfolio.totalValue)}</strong></div>
                      <div className="metric"><span>Day</span><strong className={portfolio.dailyChangePercent >= 0 ? "healthy" : "down"}>{formatPct(portfolio.dailyChangePercent)}</strong></div>
                      <div className="metric"><span>Risk</span><strong>{portfolio.riskScore === null ? "N/A" : portfolio.riskScore.toFixed(0)}</strong></div>
                    </div>
                    <div className="panel-sub">Top holdings: {portfolio.positions.slice(0, 3).map((position) => `${position.symbol} ${position.allocationPercent.toFixed(1)}%`).join(" · ") || "No positions"}</div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </WalletGate>
  );
}
