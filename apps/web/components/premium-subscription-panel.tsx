"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch, formatUsd, shortAddress } from "../lib/api";
import { useWalletStore } from "../stores/wallet-store";
import { PremiumUpgradeButton } from "./premium-upgrade-button";

type SubscriptionResponse = {
  subscription: {
    premium: boolean;
    plan: "free" | "premium";
    maxPortfolios: number;
    maxNudges: number;
    liveUpdates: boolean;
    messagingAi: boolean;
    expiresAt?: string;
  };
  payments: {
    id: string;
    amountUsd: number;
    amountToken: number;
    tokenSymbol: string;
    status: string;
    txHash: string | null;
    confirmedAt: string | null;
    createdAt: string;
  }[];
};

export function PremiumSubscriptionPanel() {
  const wallet = useWalletStore();
  const subscription = useQuery({
    queryKey: ["premium-subscription", wallet.address],
    queryFn: () => apiFetch<SubscriptionResponse>("/billing/subscription"),
    enabled: Boolean(wallet.token),
    refetchInterval: 30_000
  });
  const telegramLink = useMutation({
    mutationFn: () => apiFetch<{ code: string; telegramUrl: string; expiresAt: string }>("/messaging/telegram/link-code", { method: "POST", body: JSON.stringify({}) }),
    onSuccess(data) {
      window.open(data.telegramUrl, "_blank", "noopener,noreferrer");
    }
  });

  if (!wallet.token) {
    return (
      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Premium Subscription</div>
            <div className="panel-sub">Connect and sign with MetaMask before upgrading.</div>
          </div>
          <PremiumUpgradeButton />
        </div>
        <div className="panel-body">
          <div className="state"><strong>Wallet required</strong>Premium is stored against the wallet that pays on-chain.</div>
        </div>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <div className="panel-title">Premium Subscription</div>
          <div className="panel-sub">Payment goes from MetaMask to the OmniSignal treasury wallet, then the backend verifies it on-chain.</div>
        </div>
        <PremiumUpgradeButton />
      </div>
      <div className="panel-body">
        {subscription.isLoading && <div className="state"><strong>Loading subscription</strong>Checking this wallet on OmniSignal.</div>}
        {subscription.isError && <div className="state"><strong>Subscription unavailable</strong>{(subscription.error as Error).message}</div>}
        {subscription.data && (
          <div style={{ display: "grid", gap: 14 }}>
            <div className="metric-row">
              <div className="metric"><span>Wallet</span><strong>{shortAddress(wallet.address)}</strong></div>
              <div className="metric"><span>Plan</span><strong>{subscription.data.subscription.premium ? "Premium" : "Free"}</strong></div>
              <div className="metric"><span>Expires</span><strong>{subscription.data.subscription.expiresAt ? new Date(subscription.data.subscription.expiresAt).toLocaleDateString() : "N/A"}</strong></div>
            </div>
            <div className="status-grid">
              <div className="status-card"><strong>{subscription.data.subscription.maxPortfolios}</strong><div className="healthy">Portfolios</div><p className="panel-sub">Free includes one. Premium unlocks more.</p></div>
              <div className="status-card"><strong>{subscription.data.subscription.maxNudges}</strong><div className="healthy">AI nudges</div><p className="panel-sub">More nudges can be created for portfolio changes.</p></div>
              <div className="status-card">
                <strong>{subscription.data.subscription.messagingAi ? "Enabled" : "Premium"}</strong>
                <div className="healthy">Telegram AI</div>
                <p className="panel-sub">Premium wallets can link messaging AI.</p>
                {subscription.data.subscription.messagingAi && (
                  <button className="secondary-btn" style={{ marginTop: 10, width: "100%" }} onClick={() => telegramLink.mutate()} disabled={telegramLink.isPending}>
                    {telegramLink.isPending ? "Creating link" : "Link Telegram"}
                  </button>
                )}
                {telegramLink.isError && <p className="down">{(telegramLink.error as Error).message}</p>}
              </div>
            </div>
            <div className="status-grid">
              {subscription.data.payments.length === 0 && <div className="status-card"><strong>No wallet payments yet</strong><p className="panel-sub">Confirmed on-chain payments will appear here.</p></div>}
              {subscription.data.payments.map((payment) => (
                <div className="status-card" key={payment.id}>
                  <strong>{formatUsd(payment.amountUsd)}</strong>
                  <div className={payment.confirmedAt ? "healthy" : "degraded"}>{payment.confirmedAt ? "Confirmed" : payment.status}</div>
                  <p className="panel-sub">{payment.amountToken} {payment.tokenSymbol}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
