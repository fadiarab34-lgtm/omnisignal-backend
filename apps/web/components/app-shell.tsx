"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BrainCircuit, BriefcaseBusiness, Settings, Tickets } from "lucide-react";
import { ConnectWalletButton } from "./connect-wallet-button";
import { PremiumUpgradeButton } from "./premium-upgrade-button";
import { MarketTape } from "./market-tape";

const nav = [
  { href: "/portal/intelligence", label: "Intelligence", icon: BrainCircuit },
  { href: "/portal/portfolio", label: "Portfolio", icon: BriefcaseBusiness },
  { href: "/portal/trading", label: "Trading", icon: Tickets },
  { href: "/portal/settings", label: "Settings", icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="portal-shell">
      <header className="topbar">
        <Link href="/portal" className="brand">
          <span className="brand-dot" />
          OmniSignal
        </Link>
        <nav className="portal-nav">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} data-active={pathname.startsWith(item.href)}>
                <Icon size={14} /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className="voice-bar" style={{ padding: "7px 10px" }}>
            <Activity size={13} /> Live-first
          </span>
          <PremiumUpgradeButton compact />
          <ConnectWalletButton />
        </div>
      </header>
      <MarketTape compact />
      <main className="portal-main">{children}</main>
    </div>
  );
}
