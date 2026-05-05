"use client";

import { Canvas } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { apiFetch, formatPct, formatUsd } from "../lib/api";
import { useRealtimeVoice } from "../lib/use-realtime-voice";
import { AssetChart } from "./asset-chart";
import { WalletGate } from "./wallet-gate";

type Position = {
  id: string;
  symbol: string;
  name: string;
  assetClass: string;
  quantity: number;
  currentPrice: number;
  marketValue: number;
  allocationPercent: number;
  unrealizedPnl: number;
  dailyChangePercent: number;
};

type Portfolio = {
  id: string;
  name: string;
  mode: string;
  totalValue: number;
  dailyChangeAmount: number;
  dailyChangePercent: number;
  riskScore: number | null;
  positions: Position[];
  aiNudges: Array<{ id: string; severity: string; title: string; message: string }>;
};

export function PortfolioUniverse({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const [selectedSymbol, setSelectedSymbol] = useState<string | undefined>();
  const [amountUsd, setAmountUsd] = useState("");
  const portfolio = useQuery({
    queryKey: ["portfolio", id],
    queryFn: () => apiFetch<{ portfolio: Portfolio }>(`/portfolio/${id}`),
    refetchInterval: 60_000
  });
  const selected = portfolio.data?.portfolio.positions.find((position) => position.symbol === selectedSymbol) ?? portfolio.data?.portfolio.positions[0];
  const candles = useQuery({
    queryKey: ["universe-candles", selected?.symbol],
    enabled: Boolean(selected),
    queryFn: () => apiFetch<{ candles: Array<{ timestamp: string; open: number; high: number; low: number; close: number }> }>(`/market/candles?symbol=${encodeURIComponent(selected!.symbol)}&assetClass=${selected!.assetClass}&range=1M&interval=1day`)
  });
  const simulate = useMutation({
    mutationFn: (side: "buy" | "sell") => apiFetch(`/portfolio/${id}/simulate`, {
      method: "POST",
      body: JSON.stringify({ changes: [{ symbol: selected?.symbol, side, amountUsd: Number(amountUsd) }] })
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["portfolio", id] })
  });
  const reset = useMutation({
    mutationFn: () => apiFetch(`/portfolio/${id}/reset-simulation`, { method: "POST", body: JSON.stringify({}) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["portfolio", id] })
  });
  const voice = useRealtimeVoice(id);
  const activeNudge = portfolio.data?.portfolio.aiNudges[0];
  const biggest = useMemo(() => {
    const positions = portfolio.data?.portfolio.positions ?? [];
    return [...positions].sort((a, b) => b.allocationPercent - a.allocationPercent)[0];
  }, [portfolio.data?.portfolio.positions]);

  return (
    <WalletGate>
      {portfolio.isLoading && <div className="portfolio-empty-card"><h1>Loading universe</h1><p>Refreshing portfolio positions with live prices.</p></div>}
      {portfolio.isError && <div className="portfolio-empty-card"><h1>Universe unavailable</h1><p>{(portfolio.error as Error).message}</p></div>}
      {portfolio.data?.portfolio && (
        <div className="universe-page">
          <header className="universe-command-bar">
            <div className="universe-value-card">
              <span>Your Portfolio</span>
              <b>{formatUsd(portfolio.data.portfolio.totalValue)}</b>
              <em className={portfolio.data.portfolio.dailyChangePercent >= 0 ? "healthy" : "down"}>{formatPct(portfolio.data.portfolio.dailyChangePercent)} projected</em>
            </div>
            <div className="universe-title">
              <h1><span />Immersive Portfolio Universe <em>· {portfolio.data.portfolio.name}</em></h1>
              <p>3D view for this portfolio. Click a node to inspect allocation, buy/sell actions, geopolitical impact and prediction analysis.</p>
            </div>
            <div className="universe-live-signal">
              <span /> <b>Live AI Signals</b>
              <p>{activeNudge ? activeNudge.message : "No stored AI nudge for this portfolio yet."}</p>
            </div>
            <Link className="universe-close" href={`/portal/portfolio/${id}`} title="Close universe"><X size={16} /></Link>
          </header>
          <main className="universe-main">
            <div className="universe-voice-bubble">
              <button className="voice-orb" onClick={() => voice.state === "live" ? voice.stop() : voice.start({ route: "portfolio-universe", selectedSymbol: selected?.symbol })} />
              <div>{selected ? `${selected.symbol} selected. Inspect allocation, scenarios and simulation actions.` : voice.message}</div>
            </div>
            <section className="universe-canvas">
              {portfolio.data.portfolio.positions.length === 0 ? (
                <div className="state"><strong>No universe nodes</strong>Add real positions to this portfolio before opening the 3D universe.</div>
              ) : (
                <Canvas camera={{ position: [0, 0, 10], fov: 46 }}>
                  <ambientLight intensity={0.65} />
                  <pointLight position={[3, 4, 5]} intensity={1.25} color="#58a6ff" />
                  <pointLight position={[-4, -3, 3]} intensity={0.7} color="#bc8cff" />
                  <mesh position={[0, 0, 0]}>
                    <sphereGeometry args={[0.08, 24, 24]} />
                    <meshStandardMaterial color="#9ee8ff" emissive="#58a6ff" emissiveIntensity={1.2} />
                  </mesh>
                  {portfolio.data.portfolio.positions.map((position, index) => (
                    <Node key={position.id} position={position} index={index} total={portfolio.data!.portfolio.positions.length} selected={selected?.id === position.id} onSelect={() => setSelectedSymbol(position.symbol)} />
                  ))}
                </Canvas>
              )}
            </section>
            <div className="universe-controls"><button onClick={() => reset.mutate()} disabled={reset.isPending}>Reset</button><button>Rotate: On</button><span>Scroll to zoom · drag to rotate · click node to inspect</span></div>
            {selected && (
              <aside className="universe-asset-panel">
                <div className="universe-price-card">
                  <span>Price Action</span>
                  <h2>{selected.symbol}</h2>
                  <b>{formatUsd(selected.currentPrice)}</b>
                  <em className={selected.dailyChangePercent >= 0 ? "healthy" : "down"}>{formatPct(selected.dailyChangePercent)}</em>
                </div>
                <div className="universe-chart-card">{candles.data ? <AssetChart candles={candles.data.candles} /> : candles.isError ? <div className="state"><strong>Chart unavailable</strong>{(candles.error as Error).message}</div> : <div className="state"><strong>Loading chart</strong>Fetching real candles.</div>}</div>
                <div className="universe-detail-section">
                  <span>Allocation</span>
                  <p>{selected.allocationPercent.toFixed(2)}% of portfolio <b>{formatUsd(selected.marketValue)}</b></p>
                  <i><span style={{ width: `${Math.min(100, selected.allocationPercent)}%` }} /></i>
                </div>
                <div className="universe-detail-section">
                  <span>AI Signal</span>
                  <p>{activeNudge?.message ?? "Run portfolio analysis to store an AI signal for this universe."}</p>
                </div>
                <div className="field"><label>Simulation amount USD</label><input value={amountUsd} onChange={(event) => setAmountUsd(event.target.value)} /></div>
                <div className="universe-action-row">
                  <button className="primary-btn" onClick={() => simulate.mutate("buy")} disabled={simulate.isPending || !amountUsd || !selected}>Buy More</button>
                  <button className="danger-btn" onClick={() => simulate.mutate("sell")} disabled={simulate.isPending || !amountUsd || !selected}>Sell / Reduce</button>
                </div>
                <div className="universe-mini-metrics">
                  <div><span>Portfolio Value</span><b>{formatUsd(portfolio.data.portfolio.totalValue)}</b></div>
                  <div><span>Largest Node</span><b>{biggest?.symbol ?? "N/A"}</b></div>
                </div>
              </aside>
            )}
          </main>
        </div>
      )}
    </WalletGate>
  );
}

function Node({ position, index, total, selected, onSelect }: { position: Position; index: number; total: number; selected: boolean; onSelect: () => void }) {
  const sector = sectorVector(position.assetClass);
  const localIndex = index + 1;
  const angle = (index / Math.max(total, 1)) * Math.PI * 2;
  const radius = 1.4 + Math.min(3.2, position.allocationPercent / 9);
  const size = 0.24 + Math.min(0.95, position.allocationPercent / 42);
  const color = nodeColor(position.assetClass, position.dailyChangePercent);
  return (
    <group position={[sector[0] + Math.cos(angle) * radius * 0.28 * localIndex / Math.max(total, 2), sector[1] + Math.sin(angle) * radius * 0.22 * localIndex / Math.max(total, 2), sector[2]]} onClick={onSelect}>
      <mesh scale={selected ? size * 1.25 : size}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={selected ? 0.75 : 0.32} roughness={0.35} transparent opacity={0.72} />
      </mesh>
      <Text position={[0, 0, 0.72]} fontSize={0.22} color="#e6edf3" anchorX="center" anchorY="middle">{position.symbol}</Text>
      <Text position={[0, -0.32, 0.72]} fontSize={0.11} color={position.dailyChangePercent >= 0 ? "#55e6a5" : "#ff6f7e"} anchorX="center" anchorY="middle">{formatPct(position.dailyChangePercent)}</Text>
    </group>
  );
}

function sectorVector(assetClass: string): [number, number, number] {
  if (assetClass === "crypto") return [-1.8, 1.45, 0.25];
  if (assetClass === "commodity") return [-2.6, -0.95, 0.1];
  if (assetClass === "forex") return [2.5, 1.2, -0.15];
  if (assetClass === "index" || assetClass === "etf") return [2.1, -1.2, 0.15];
  return [1.1, -2.15, 0];
}

function nodeColor(assetClass: string, change: number) {
  if (assetClass === "crypto") return "#55e6a5";
  if (assetClass === "commodity") return "#e0b33f";
  if (assetClass === "forex") return "#f05fa6";
  if (change < 0) return "#ff6f7e";
  return "#58a6ff";
}
