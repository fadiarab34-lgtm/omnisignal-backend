import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ProviderStatusValue } from "@prisma/client";
import { ProviderUnavailableError } from "@omnisignal/shared";

const candlesQuerySchema = z.object({
  symbol: z.string().min(1),
  interval: z.string().default("1day"),
  range: z.enum(["1D", "1W", "1M", "3M", "1Y"]).default("1M"),
  assetClass: z.enum(["equity", "crypto", "forex", "commodity", "index", "etf", "perp"]).optional()
});

export async function registerMarketRoutes(app: FastifyInstance) {
  app.get("/market/quote/:symbol", async (request) => {
    const params = z.object({ symbol: z.string().min(1) }).parse(request.params);
    return app.services.marketData.getQuote(params.symbol);
  });

  app.post("/market/quotes", async (request) => {
    const body = z.object({ symbols: z.array(z.string().min(1)).min(1).max(50) }).parse(request.body);
    return { assets: await app.services.marketData.getBatchQuotes(body.symbols) };
  });

  app.get("/market/candles", async (request) => {
    const query = candlesQuerySchema.parse(request.query);
    return { candles: await app.services.marketData.getCandles(query.symbol, query.interval, query.range, query.assetClass) };
  });

  app.get("/market/heatmap", async (request) => {
    const query = z.object({
      filter: z.string().default("all"),
      metric: z.enum(["marketCap", "volume", "portfolioExposure"]).default("marketCap"),
      colorMode: z.enum(["performance", "volatility", "aiRisk", "geopoliticalImpact", "volume"]).default("performance"),
      symbols: z.string().optional()
    }).parse(request.query);
    const assetClass = query.filter === "all" || query.filter === "portfolio"
      ? query.filter
      : z.enum(["equity", "crypto", "forex", "commodity", "index", "etf", "perp"]).parse(query.filter);
    const heatmap = await app.services.marketData.getHeatmapData({
      assetClass,
      metric: query.metric,
      colorMode: query.colorMode,
      symbols: query.symbols?.split(",").filter(Boolean)
    });
    return heatmap;
  });

  app.get("/market/movers", async (request) => {
    const query = z.object({ assetClass: z.enum(["equity", "crypto", "forex", "commodity", "index", "etf", "perp"]).optional() }).parse(request.query);
    return { assets: await app.services.marketData.getMarketMovers(query.assetClass) };
  });

  app.get("/market/providers/status", async () => {
    const statuses = await app.services.marketData.getProviderStatus();
    await Promise.all(statuses.map((status) => app.services.prisma.providerStatus.upsert({
      where: { provider: status.provider },
      update: {
        status: status.status as ProviderStatusValue,
        message: status.message,
        latencyMs: status.latencyMs,
        lastCheckedAt: new Date(status.lastCheckedAt)
      },
      create: {
        provider: status.provider,
        status: status.status as ProviderStatusValue,
        message: status.message,
        latencyMs: status.latencyMs,
        lastCheckedAt: new Date(status.lastCheckedAt)
      }
    })));
    return { providers: statuses };
  });

  app.get("/market/crypto", async () => {
    try {
      return { assets: await app.services.marketData.getCryptoData() };
    } catch (error) {
      if (error instanceof ProviderUnavailableError) throw error;
      throw new ProviderUnavailableError("coinGecko", error instanceof Error ? error.message : "Crypto data unavailable", "down");
    }
  });
}
