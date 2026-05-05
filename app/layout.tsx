import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "../apps/web/components/providers";

export const metadata: Metadata = {
  title: "OmniSignal",
  description:
    "AI trading intelligence, live market heatmaps, wallet-gated portfolios, and secure Hyperliquid trading controls."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
