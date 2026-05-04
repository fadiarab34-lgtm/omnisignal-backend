import { describe, expect, it } from "vitest";
import type { MarketConnector } from "./base";
import { MarketDataService } from "./market-data-service";

const connector = (provider: string, price: number): MarketConnector => ({
  provider,
  isConfigured: () => true,
  getQuote: async (symbol, hint) => ({
    symbol,
    name: hint?.name ?? symbol,
    assetClass: hint?.assetClass ?? "equity",
    price,
    changePercent24h: 1.2,
    timestamp: new Date().toISOString(),
    provider
  }),
  health: async () => ({
    provider,
    status: "healthy",
    lastCheckedAt: new Date().toISOString(),
    message: "ok"
  })
});

describe("MarketDataService", () => {
  it("normalizes heatmap assets from configured providers", async () => {
    const service = new MarketDataService({
      connectors: {
        twelveData: connector("twelveData", 100),
        coinGecko: connector("coinGecko", 200),
        hyperliquid: connector("hyperliquid", 300)
      }
    });
    const heatmap = await service.getHeatmapData({ assetClass: "crypto" });
    expect(heatmap.assets.length).toBeGreaterThan(0);
    expect(heatmap.assets.every((asset) => asset.price > 0)).toBe(true);
  });
});
