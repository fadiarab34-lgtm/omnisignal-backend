"use client";

import { ConnectWalletButton } from "./connect-wallet-button";
import { useWalletStore } from "../stores/wallet-store";

export function WalletGate({ children }: { children: React.ReactNode }) {
  const address = useWalletStore((state) => state.address);
  const error = useWalletStore((state) => state.error);
  if (!address) {
    return (
      <div className="panel">
        <div className="state">
          <div>
            <strong>Connect your wallet to view portfolios.</strong>
            <p>Portfolio records, allocations, AI nudges, trading tickets, and the portfolio universe are hidden until signed wallet verification succeeds.</p>
            <div style={{ marginTop: 16 }}><ConnectWalletButton /></div>
            {error && <p className="down" style={{ marginTop: 12 }}>{error}</p>}
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
