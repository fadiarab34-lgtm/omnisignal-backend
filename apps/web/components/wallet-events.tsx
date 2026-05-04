"use client";

import { useEffect } from "react";
import { useWalletStore } from "../stores/wallet-store";

export function WalletEvents() {
  const hydrate = useWalletStore((state) => state.hydrate);
  const disconnect = useWalletStore((state) => state.disconnect);
  const setWallet = useWalletStore((state) => state.setWallet);

  useEffect(() => {
    hydrate();
    if (!window.ethereum?.on) return;
    const accountsChanged = (accounts: unknown) => {
      const next = Array.isArray(accounts) ? accounts[0] as string | undefined : undefined;
      if (!next) disconnect();
      else setWallet(next);
    };
    const chainChanged = (chainId: unknown) => {
      setWallet(useWalletStore.getState().address, typeof chainId === "string" ? chainId : undefined);
    };
    const disconnected = () => disconnect();
    window.ethereum.on("accountsChanged", accountsChanged);
    window.ethereum.on("chainChanged", chainChanged);
    window.ethereum.on("disconnect", disconnected);
    return () => {
      window.ethereum?.removeListener?.("accountsChanged", accountsChanged);
      window.ethereum?.removeListener?.("chainChanged", chainChanged);
      window.ethereum?.removeListener?.("disconnect", disconnected);
    };
  }, [disconnect, hydrate, setWallet]);

  return null;
}
