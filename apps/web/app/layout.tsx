import type { Metadata } from "next";
import "./globals.css";
import "./oracle.css";
import "./cockpit-polish.css";
import "./watch.css";
import { Providers } from "../components/providers";

export const metadata: Metadata = {
  title: "OmniSignal | Crypto Watch Checkout",
  description: "Buy the Eight White Royal Pop pocket watch with MetaMask and Base USDC."
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
