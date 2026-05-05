"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWalletButton } from "./connect-wallet-button";
import { MarketTape } from "./market-tape";

const nav = [
  { href: "/portal/intelligence", label: "Intelligence" },
  { href: "/portal/portfolio", label: "Portfolios" },
  { href: "/portal/geo-risk", label: "Geo Risk" },
  { href: "/portal/herd-signal", label: "Herd Signal" }
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
            return (
              <Link key={item.href} href={item.href} data-active={pathname.startsWith(item.href)}>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="topbar-actions">
          <ConnectWalletButton />
        </div>
      </header>
      <MarketTape compact />
      <main className="portal-main">{children}</main>
    </div>
  );
}
