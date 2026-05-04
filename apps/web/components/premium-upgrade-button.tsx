"use client";

import { Crown } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, formatUsd } from "../lib/api";
import { useWalletStore } from "../stores/wallet-store";

type PaymentIntent = {
  id: string;
  walletAddress: string;
  amountUsd: number;
  amountToken: string;
  amountBaseUnits: string;
  chainId: string;
  chainName: string;
  tokenSymbol: string;
  tokenAddress: string;
  tokenDecimals: number;
  treasuryAddress: string;
  expiresAt: string;
  subscriptionDays: number;
};

type Receipt = { status?: string | number } | null;

export function PremiumUpgradeButton({ compact = false }: { compact?: boolean }) {
  const { token, address, connect, connecting } = useWalletStore();
  const queryClient = useQueryClient();
  const upgrade = useMutation({
    mutationFn: async () => {
      if (!window.ethereum) throw new Error("MetaMask was not detected.");
      const intent = await apiFetch<{ paymentIntent: PaymentIntent }>("/billing/payment-intent", { method: "POST", body: JSON.stringify({}) });
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: toHexChainId(intent.paymentIntent.chainId) }] });
      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{
          from: address,
          to: intent.paymentIntent.tokenAddress,
          data: erc20TransferData(intent.paymentIntent.treasuryAddress, intent.paymentIntent.amountBaseUnits)
        }]
      }) as string;
      await waitForReceipt(txHash);
      return apiFetch("/billing/confirm-wallet-payment", {
        method: "POST",
        body: JSON.stringify({ paymentId: intent.paymentIntent.id, txHash })
      });
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ["premium-subscription"] });
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
    }
  });

  async function handleClick() {
    if (!token) {
      await connect();
      return;
    }
    upgrade.mutate();
  }

  return (
    <button className={compact ? "wallet-btn premium" : "primary-btn"} onClick={handleClick} disabled={connecting || upgrade.isPending}>
      <Crown size={15} />
      {upgrade.isPending ? "Waiting for wallet" : compact ? "Premium $25" : `Upgrade Premium ${formatUsd(25)}`}
    </button>
  );
}

function erc20TransferData(to: string, amountBaseUnits: string) {
  const method = "a9059cbb";
  const address = to.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  const amount = BigInt(amountBaseUnits).toString(16).padStart(64, "0");
  return `0x${method}${address}${amount}`;
}

function toHexChainId(chainId: string) {
  return chainId.startsWith("0x") ? chainId : `0x${Number(chainId).toString(16)}`;
}

async function waitForReceipt(txHash: string) {
  if (!window.ethereum) return;
  for (let i = 0; i < 60; i += 1) {
    const receipt = await window.ethereum.request({ method: "eth_getTransactionReceipt", params: [txHash] }) as Receipt;
    if (receipt) return receipt;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}
