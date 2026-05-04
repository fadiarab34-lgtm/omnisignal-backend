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
  const [amountUsd, setAmountUsd] = useState("1000");
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
  const biggest = useMemo(() => {
    const positions = portfolio.data?.portfolio.positions ?? [];
    return {
      winner: [...positions].sort((a, b) => b.dailyChangePercent - a.dailyChangePercent)[0],
      drag: [...positions].sort((a, b) => a.dailyChangePercent - b.dailyChangePercent)[0]
    };
  }, [portfolio.data?.portfolio.positions]);

  return (
    <WalletGate>
      {portfolio.isLoading && <div className="panel"><div className="state"><strong>Loading universe</strong>Refreshing portfolio positions with live prices.</div></div>}
      {portfolio.isError && <div className="panel"><div className="state"><strong>Universe unavailable</strong>{(portfolio.error as Error).message}</div></div>}
      {portfolio.data?.portfolio && (
        <div className="universe-shell">
          <aside className="panel">
            <div className="panel-head"><div><div className="panel-title">{portfolio.data.portfolio.name}</div><div className="panel-sub">Simulation Mode · live-priced positions</div></div></div>
            <div className="panel-body asset-panel">
              <div className="metric"><span>Total</span><strong>{formatUsd(portfolio.data.portfolio.totalValue)}</strong></div>
              <div className="metric"><span>Daily Change</span><strong className={portfolio.data.portfolio.dailyChangePercent >= 0 ? "healthy" : "down"}>{formatUsd(portfolio.data.portfolio.dailyChangeAmount)} · {formatPct(portfolio.data.portfolio.dailyChangePercent)}</strong></div>
              <div className="metric"><span>Biggest Winner</span><strong>{biggest.winner ? `${biggest.winner.symbol} ${formatPct(biggest.winner.dailyChangePercent)}` : "N/A"}</strong></div>
              <div className="metric"><span>Biggest Drag</span><strong>{biggest.drag ? `${biggest.drag.symbol} ${formatPct(biggest.drag.dailyChangePercent)}` : "N/A"}</strong></div>
              <div className="signal-feed">
                {portfolio.data.portfolio.aiNudges.slice(0, 3).map((nudge) => <div className={`nudge ${nudge.severity}`} key={nudge.id}><b>{nudge.title}</b><p>{nudge.message}</p></div>)}
              </div>
            </div>
          </aside>
          <section className="universe-stage">
            <Link className="icon-btn close-link" href={`/portal/portfolio/${id}`} title="Close universe"><X size={17} /></Link>
            {portfolio.data.portfolio.positions.length === 0 ? (
              <div className="state"><strong>No universe nodes</strong>Add real positions to this portfolio before opening the 3D universe.</div>
            ) : (
              <Canvas camera={{ position: [0, 0, 9], fov: 48 }}>
                <ambientLight intensity={0.7} />
                <pointLight position={[5, 5, 5]} intensity={1.2} color="#58a6ff" />
                {portfolio.data.portfolio.positions.map((position, index) => (
                  <Node key={position.id} position={position} index={index} total={portfolio.data!.portfolio.positions.length} selected={selected?.id === position.id} onSelect={() => setSelectedSymbol(position.symbol)} />
                ))}
              </Canvas>
            )}
          </section>
          <aside className="panel">
            <div className="panel-head"><div><div className="panel-title">{selected?.symbol ?? "No asset"}</div><div className="panel-sub">{selected?.name ?? "Select a node"}</div></div></div>
            <div className="panel-body asset-panel">
              <div className="voice-bar">
                <span className="voice-dot" />
                <span>{voice.message}</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {voice.state === "live" ? <button className="secondary-btn" onClick={voice.stop}>Stop Voice</button> : <button className="primary-btn" onClick={() => voice.start({ route: "portfolio-universe", selectedSymbol: selected?.symbol })}>Start Real Voice</button>}
              </div>
              {selected && (
                <>
                  <div className="metric-row">
                    <div className="metric"><span>Price</span><strong>{formatUsd(selected.currentPrice)}</strong></div>
                    <div className="metric"><span>Allocation</span><strong>{selected.allocationPercent.toFixed(2)}%</strong></div>
                    <div className="metric"><span>Day</span><strong className={selected.dailyChangePercent >= 0 ? "healthy" : "down"}>{formatPct(selected.dailyChangePercent)}</strong></div>
                  </div>
                  <div className="chart-box">{candles.data ? <AssetChart candles={candles.data.candles} /> : candles.isError ? <div className="state"><strong>Chart unavailable</strong>{(candles.error as Error).message}</div> : <div className="state"><strong>Loading chart</strong>Fetching real candles.</div>}</div>
                  <div className="field"><label>Simulation amount USD</label><input value={amountUsd} onChange={(event) => setAmountUsd(event.target.value)} /></div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="primary-btn" onClick={() => simulate.mutate("buy")} disabled={simulate.isPending}>Buy More</button>
                    <button className="danger-btn" onClick={() => simulate.mutate("sell")} disabled={simulate.isPending}>Sell</button>
                    <Link className="secondary-btn" href={`/portal/trading?symbol=${encodeURIComponent(selected.symbol)}&side=buy`}>Prepare Trade Ticket</Link>
                  </div>
                  <button className="secondary-btn" onClick={() => reset.mutate()} disabled={reset.isPending}>Reset Simulation</button>
                  {(simulate.isError || reset.isError) && <div className="nudge urgent"><b>Simulation unavailable</b><p>{((simulate.error ?? reset.error) as Error).message}</p></div>}
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </WalletGate>
  );
}

function Node({ position, index, total, selected, onSelect }: { position: Position; index: number; total: number; selected: boolean; onSelect: () => void }) {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2;
  const radius = 3.2;
  const size = 0.32 + Math.min(1.3, position.allocationPercent / 35);
  const color = position.dailyChangePercent >= 0 ? "#3fb950" : "#f85149";
  return (
    <group position={[Math.cos(angle) * radius, Math.sin(angle) * radius, Math.sin(angle * 1.7) * 0.8]} onClick={onSelect}>
      <mesh scale={selected ? size * 1.16 : size}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={selected ? 0.55 : 0.22} roughness={0.35} />
      </mesh>
      <Text position={[0, -1.35 * size, 0]} fontSize={0.22} color="#e6edf3" anchorX="center" anchorY="middle">{position.symbol}</Text>
    </group>
  );
}
