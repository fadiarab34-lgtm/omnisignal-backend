"use client";

import { Wallet } from "lucide-react";
import { useWalletStore } from "../stores/wallet-store";
import { shortAddress } from "../lib/api";

export function ConnectWalletButton() {
  const { address, connecting, connect, disconnect } = useWalletStore();
  if (address) {
    return (
      <button className="wallet-btn connected" onClick={disconnect} title="Disconnect wallet">
        <Wallet size={15} />
        {shortAddress(address)}
      </button>
    );
  }
  return (
    <button className="wallet-btn" onClick={connect} disabled={connecting}>
      <Wallet size={15} />
      {connecting ? "Awaiting Signature" : "Connect Wallet"}
    </button>
  );
}
