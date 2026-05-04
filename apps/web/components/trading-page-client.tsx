"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { apiFetch, formatPct, formatUsd } from "../lib/api";
import { WalletGate } from "./wallet-gate";

type OrderIntent = {
  id: string;
  symbol: string;
  side: string;
  orderType: string;
  amountUsd?: number;
  quantity?: number;
  estimatedPrice: number;
  estimatedFees: number;
  estimatedSlippage: number;
  status: string;
  mode: string;
  createdAt: string;
};

export function TradingPageClient() {
  const search = useSearchParams();
  const queryClient = useQueryClient();
  const [symbol, setSymbol] = useState(search.get("symbol") ?? "BTC-PERP");
  const [side, setSide] = useState(search.get("side") ?? "buy");
  const [orderType, setOrderType] = useState("market");
  const [mode, setMode] = useState("simulation");
  const [amountUsd, setAmountUsd] = useState("100");
  const [intent, setIntent] = useState<OrderIntent | undefined>();
  const orders = useQuery({
    queryKey: ["orders"],
    queryFn: () => apiFetch<{ orders: OrderIntent[] }>("/trading/orders")
  });
  const estimate = useMutation({
    mutationFn: () => apiFetch<{ estimate: { estimatedPrice: number; estimatedFees: number; estimatedSlippage: number; quantity: number; warnings: string[] } }>("/trading/estimate", {
      method: "POST",
      body: JSON.stringify({ symbol, side, orderType, amountUsd: Number(amountUsd), mode })
    })
  });
  const createIntent = useMutation({
    mutationFn: () => apiFetch<{ orderIntent: OrderIntent }>("/trading/order-intent", {
      method: "POST",
      body: JSON.stringify({ symbol, side, orderType, amountUsd: Number(amountUsd), mode })
    }),
    onSuccess: (data) => {
      setIntent(data.orderIntent);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    }
  });
  const confirmTestnet = useMutation({
    mutationFn: () => apiFetch("/trading/confirm-testnet", {
      method: "POST",
      body: JSON.stringify({ orderIntentId: intent?.id })
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] })
  });

  return (
    <WalletGate>
      <div className="terminal-grid">
        <section className="panel">
          <div className="panel-head"><div><div className="panel-title">Order Ticket</div><div className="panel-sub">AI and voice can prepare tickets. Real orders require visual confirmation here.</div></div></div>
          <div className="panel-body asset-panel">
            <div className="form-grid">
              <div className="field"><label>Symbol</label><input value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} /></div>
              <div className="field"><label>Side</label><select value={side} onChange={(event) => setSide(event.target.value)}><option value="buy">Buy</option><option value="sell">Sell</option></select></div>
              <div className="field"><label>Order Type</label><select value={orderType} onChange={(event) => setOrderType(event.target.value)}><option value="market">Market</option><option value="limit">Limit</option></select></div>
              <div className="field"><label>Mode</label><select value={mode} onChange={(event) => setMode(event.target.value)}><option value="simulation">Simulation</option><option value="testnet">Hyperliquid Testnet</option><option value="mainnet">Mainnet</option></select></div>
              <div className="field"><label>Amount USD</label><input value={amountUsd} onChange={(event) => setAmountUsd(event.target.value)} /></div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="secondary-btn" onClick={() => estimate.mutate()} disabled={estimate.isPending}>Estimate</button>
              <button className="primary-btn" onClick={() => createIntent.mutate()} disabled={createIntent.isPending}>Create Order Intent</button>
            </div>
            {estimate.data?.estimate && (
              <div className="metric-row">
                <div className="metric"><span>Estimated Entry</span><strong>{formatUsd(estimate.data.estimate.estimatedPrice)}</strong></div>
                <div className="metric"><span>Estimated Fees</span><strong>{formatUsd(estimate.data.estimate.estimatedFees)}</strong></div>
                <div className="metric"><span>Slippage</span><strong>{formatPct(estimate.data.estimate.estimatedSlippage)}</strong></div>
              </div>
            )}
            {intent && (
              <div className="nudge warning">
                <b>Visual confirmation required</b>
                <p>{intent.symbol} · {intent.side} · {intent.mode} · estimated entry {formatUsd(intent.estimatedPrice)} · fees {formatUsd(intent.estimatedFees)}</p>
                {intent.mode === "testnet" && <button className="primary-btn" style={{ marginTop: 10 }} onClick={() => confirmTestnet.mutate()} disabled={confirmTestnet.isPending}>Confirm Testnet Trade</button>}
                {intent.mode === "mainnet" && <p className="down" style={{ marginTop: 10 }}>Mainnet confirmation is disabled unless backend safety configuration explicitly enables it.</p>}
              </div>
            )}
            {[estimate.error, createIntent.error, confirmTestnet.error].filter(Boolean).map((error, index) => <div className="nudge urgent" key={index}><b>Trading action unavailable</b><p>{(error as Error).message}</p></div>)}
          </div>
        </section>
        <aside className="panel">
          <div className="panel-head"><div><div className="panel-title">Order History</div><div className="panel-sub">Stored order intents and execution responses.</div></div></div>
          <div className="panel-body signal-feed">
            {orders.isLoading && <div className="state"><strong>Loading orders</strong>Reading wallet-linked records.</div>}
            {orders.isError && <div className="state"><strong>Orders unavailable</strong>{(orders.error as Error).message}</div>}
            {orders.data?.orders.length === 0 && <div className="state"><strong>No orders yet.</strong>Create an order intent to store a ticket.</div>}
            {orders.data?.orders.map((order) => <div className="nudge" key={order.id}><b>{order.side.toUpperCase()} {order.symbol}</b><p>{order.mode} · {order.status} · {formatUsd(order.estimatedPrice)}</p></div>)}
          </div>
        </aside>
      </div>
    </WalletGate>
  );
}
