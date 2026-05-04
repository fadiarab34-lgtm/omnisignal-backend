import { DEFAULT_HEATMAP_UNIVERSE, ProviderUnavailableError } from "@omnisignal/shared";
import type { AssetClass, HeatmapFilters, MarketAsset, MarketCandle, ProviderHealth } from "@omnisignal/shared";
import type { MarketConnector } from "./base";
import { AlphaVantageConnector } from "./alpha-vantage";
import { CoinGeckoConnector } from "./coingecko";
import { FinnhubConnector } from "./finnhub";
import { HyperliquidMarketConnector } from "./hyperliquid-market";
import { TwelveDataConnector } from "./twelve-data";

export type MarketDataServiceOptions = {
  twelveDataApiKey?: string;
  finnhubApiKey?: string;
  coinGeckoApiKey?: string;
  alphaVantageApiKey?: string;
  hyperliquidApiBase?: string;
  hyperliquidWsUrl?: string;
  connectors?: Partial<Record<string, MarketConnector>>;
};

export class MarketDataService {
  readonly connectors: Record<string, MarketConnector>;

  constructor(options: MarketDataServiceOptions) {
    this.connectors = {
      twelveData: options.connectors?.twelveData ?? new TwelveDataConnector({ apiKey: options.twelveDataApiKey }),
      finnhub: options.connectors?.finnhub ?? new FinnhubConnector({ apiKey: options.finnhubApiKey }),
      coinGecko: options.connectors?.coinGecko ?? new CoinGeckoConnector({ apiKey: options.coinGeckoApiKey }),
      alphaVantage: options.connectors?.alphaVantage ?? new AlphaVantageConnector({ apiKey: options.alphaVantageApiKey }),
      hyperliquid: options.connectors?.hyperliquid ?? new HyperliquidMarketConnector({ apiBase: options.hyperliquidApiBase, wsUrl: options.hyperliquidWsUrl })
    };
  }

  async getQuote(symbol: string, hint: { assetClass?: AssetClass; name?: string; sector?: string; region?: string; preferredProvider?: string } = {}): Promise<MarketAsset> {
    const order = this.providerOrder(hint.assetClass, hint.preferredProvider);
    const failures: string[] = [];
    for (const provider of order) {
      const connector = this.connectors[provider];
      if (!connector) continue;
      try {
        return await connector.getQuote(symbol, hint);
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error));
      }
    }
    throw new ProviderUnavailableError("marketData", `No configured provider returned a live quote for ${symbol}. ${failures.join(" | ")}`, "down");
  }

  async getBatchQuotes(symbols: string[]): Promise<MarketAsset[]> {
    const results = await Promise.all(symbols.map((symbol) => this.getQuote(symbol)));
    return results;
  }

  async getCandles(symbol: string, interval: string, range: string, assetClass?: AssetClass): Promise<MarketCandle[]> {
    const failures: string[] = [];
    for (const provider of this.providerOrder(assetClass)) {
      const connector = this.connectors[provider];
      if (!connector?.getCandles) continue;
      try {
        const candles = await connector.getCandles(symbol, interval, range);
        if (candles.length > 0) return candles;
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error));
      }
    }
    throw new ProviderUnavailableError("marketData", `No configured provider returned candles for ${symbol}. ${failures.join(" | ")}`, "down");
  }

  async getMarketMovers(assetClass?: AssetClass): Promise<MarketAsset[]> {
    const heatmap = await this.getHeatmapData({ assetClass: assetClass ?? "all" });
    return [...heatmap.assets].sort((a, b) => Math.abs(b.changePercent24h) - Math.abs(a.changePercent24h)).slice(0, 12);
  }

  async getHeatmapData(filters: HeatmapFilters = {}): Promise<{ assets: MarketAsset[]; errors: Array<{ symbol: string; message: string }> }> {
    const universe = DEFAULT_HEATMAP_UNIVERSE.filter((asset) => {
      if (!filters.assetClass || filters.assetClass === "all") return true;
      if (filters.assetClass === "portfolio") return filters.symbols?.includes(asset.symbol);
      return asset.assetClass === filters.assetClass;
    });
    const settled = await Promise.allSettled(universe.map((asset) => this.getQuote(asset.symbol, asset)));
    const assets: MarketAsset[] = [];
    const errors: Array<{ symbol: string; message: string }> = [];
    settled.forEach((result, index) => {
      const symbol = universe[index]?.symbol ?? "unknown";
      if (result.status === "fulfilled") assets.push(result.value);
      else errors.push({ symbol, message: result.reason instanceof Error ? result.reason.message : String(result.reason) });
    });
    if (assets.length === 0) {
      throw new ProviderUnavailableError("marketData", `Live market data unavailable. Check provider configuration. ${errors.map((error) => `${error.symbol}: ${error.message}`).join(" | ")}`, "down");
    }
    return { assets, errors };
  }

  async getCryptoData(): Promise<MarketAsset[]> {
    const connector = this.connectors.coinGecko as CoinGeckoConnector;
    return connector.getCryptoData();
  }

  async getProviderStatus(): Promise<ProviderHealth[]> {
    return Promise.all(Object.values(this.connectors).map((connector) => connector.health()));
  }

  subscribeLivePrices(_symbols: string[]): never {
    throw new ProviderUnavailableError("marketData", "Provider WebSocket subscription is handled by the API gateway so secrets remain server-side.", "degraded");
  }

  normalizeProviderResponse(_provider: string, raw: unknown): unknown {
    return raw;
  }

  private providerOrder(assetClass?: AssetClass, preferredProvider?: string): string[] {
    const base = assetClass === "crypto"
      ? ["coinGecko", "twelveData", "alphaVantage"]
      : assetClass === "perp"
        ? ["hyperliquid"]
        : assetClass === "forex" || assetClass === "commodity" || assetClass === "index" || assetClass === "etf"
          ? ["twelveData", "alphaVantage", "finnhub"]
          : ["twelveData", "finnhub", "alphaVantage"];
    return preferredProvider ? [preferredProvider, ...base.filter((provider) => provider !== preferredProvider)] : base;
  }
}
