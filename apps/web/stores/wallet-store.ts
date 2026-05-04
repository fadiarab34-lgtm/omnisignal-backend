"use client";

import { create } from "zustand";
import { apiFetch } from "../lib/api";

type EthereumProvider = {
  request(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

type WalletState = {
  address?: string;
  chainId?: string;
  token?: string;
  error?: string;
  connecting: boolean;
  hydrated: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  hydrate: () => void;
  setWallet: (address?: string, chainId?: string) => void;
};

export const useWalletStore = create<WalletState>((set, get) => ({
  connecting: false,
  hydrated: false,
  hydrate() {
    if (typeof window === "undefined") return;
    set({
      token: window.localStorage.getItem("omnisignal.jwt") ?? undefined,
      address: window.localStorage.getItem("omnisignal.wallet") ?? undefined,
      chainId: window.localStorage.getItem("omnisignal.chainId") ?? undefined,
      hydrated: true
    });
  },
  setWallet(address, chainId) {
    set({ address, chainId });
  },
  async connect() {
    if (!window.ethereum) {
      set({ error: "MetaMask was not detected. Install MetaMask and refresh OmniSignal.", connecting: false });
      return;
    }
    set({ connecting: true, error: undefined });
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
      const address = accounts[0];
      if (!address) throw new Error("No account returned by MetaMask.");
      const chainId = await window.ethereum.request({ method: "eth_chainId" }) as string;
      const nonce = await apiFetch<{ message: string }>("/auth/wallet/nonce?address=" + encodeURIComponent(address));
      const signature = await window.ethereum.request({ method: "personal_sign", params: [nonce.message, address] }) as string;
      const verified = await apiFetch<{ token: string; wallet: { address: string; chainId?: string } }>("/auth/wallet/verify", {
        method: "POST",
        body: JSON.stringify({ address, signature, chainId })
      });
      window.localStorage.setItem("omnisignal.jwt", verified.token);
      window.localStorage.setItem("omnisignal.wallet", verified.wallet.address);
      if (verified.wallet.chainId) window.localStorage.setItem("omnisignal.chainId", verified.wallet.chainId);
      set({ token: verified.token, address: verified.wallet.address, chainId: verified.wallet.chainId, connecting: false, error: undefined });
    } catch (error) {
      set({ connecting: false, error: error instanceof Error ? error.message : "Wallet signature was rejected or failed." });
    }
  },
  disconnect() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("omnisignal.jwt");
      window.localStorage.removeItem("omnisignal.wallet");
      window.localStorage.removeItem("omnisignal.chainId");
    }
    set({ token: undefined, address: undefined, chainId: undefined });
  }
}));
