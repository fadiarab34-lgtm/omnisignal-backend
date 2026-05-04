"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import { useWalletStore } from "../stores/wallet-store";
import { PremiumSubscriptionPanel } from "./premium-subscription-panel";

type Provider = {
  provider: string;
  status: string;
  message: string;
  latencyMs?: number;
  lastCheckedAt: string;
};

export function SettingsStatus() {
  const wallet = useWalletStore();
  const status = useQuery({
    queryKey: ["provider-status"],
    queryFn: () => apiFetch<{ providers: Provider[] }>("/health/providers"),
    refetchInterval: 60_000
  });
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <PremiumSubscriptionPanel />
      <section className="panel">
        <div className="panel-head"><div><div className="panel-title">Wallet</div><div className="panel-sub">MetaMask signed session state.</div></div></div>
        <div className="panel-body">
          <div className="metric-row">
            <div className="metric"><span>Address</span><strong>{wallet.address ?? "Disconnected"}</strong></div>
            <div className="metric"><span>Chain</span><strong>{wallet.chainId ?? "N/A"}</strong></div>
            <div className="metric"><span>Session</span><strong>{wallet.token ? "Verified" : "Not verified"}</strong></div>
          </div>
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><div className="panel-title">Provider Health</div><div className="panel-sub">The UI shows provider failures instead of substituting data.</div></div></div>
        <div className="panel-body">
          {status.isLoading && <div className="state"><strong>Checking providers</strong>Running backend health checks.</div>}
          {status.isError && <div className="state"><strong>Status unavailable</strong>{(status.error as Error).message}</div>}
          {status.data && (
            <div className="status-grid">
              {status.data.providers.map((provider) => (
                <div className="status-card" key={provider.provider}>
                  <strong>{provider.provider}</strong>
                  <div className={provider.status}>{provider.status === "missing_config" ? "Missing configuration" : provider.status === "down" ? "Provider unavailable" : provider.status}</div>
                  <p className="panel-sub">{provider.message}</p>
                  {provider.latencyMs !== undefined && <p className="panel-sub">{provider.latencyMs}ms</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
