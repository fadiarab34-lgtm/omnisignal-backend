"use client";

import { useWalletStore } from "../stores/wallet-store";
import { shortAddress } from "../lib/api";

export function ConnectWalletButton() {
  const { address, connecting, connect, disconnect } = useWalletStore();
  if (address) {
    return (
      <button className="wallet-btn connected" onClick={disconnect} title="Disconnect wallet">
        MetaMask: {shortAddress(address)}
      </button>
    );
  }
  return (
    <button className="wallet-btn" onClick={connect} disabled={connecting}>
      {connecting ? "Awaiting Signature" : "Connect Wallet"}
    </button>
  );
}
