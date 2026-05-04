import type { MarketAsset, ProviderHealth } from "@omnisignal/shared";
import { ProviderUnavailableError } from "@omnisignal/shared";
import { fetchJson, providerHealth, requireNumber, toNumber, validatedAsset } from "./base";
import type { ConnectorQuoteHint, MarketConnector } from "./base";

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  USDC: "usd-coin",
  USDT: "tether"
};

export class CoinGeckoConnector implements MarketConnector {
  readonly provider = "coinGecko";
  private readonly baseUrl: string;

  constructor(private readonly options: { apiKey?: string; baseUrl?: string }) {
    this.baseUrl = options.baseUrl ?? "https://api.coingecko.com/api/v3";
  }

  isConfigured(): boolean {
    return true;
  }

  async getQuote(symbol: string, hint: ConnectorQuoteHint = {}): Promise<MarketAsset> {
    const [asset] = await this.getBatchQuotes([symbol], { [symbol]: hint });
    if (!asset) throw new ProviderUnavailableError(this.provider, `No CoinGecko quote for ${symbol}`, "degraded");
    return asset;
  }

  async getBatchQuotes(symbols: string[], hints: Record<string, ConnectorQuoteHint> = {}): Promise<MarketAsset[]> {
    const idBySymbol = new Map<string, string>();
    for (const symbol of symbols) {
      const id = COINGECKO_IDS[symbol.replace("-USD", "").toUpperCase()];
      if (!id) throw new ProviderUnavailableError(this.provider, `CoinGecko symbol ${symbol} is not mapped. Add an explicit id before requesting it.`, "degraded");
      idBySymbol.set(symbol, id);
    }
    const url = new URL(`${this.baseUrl}/simple/price`);
    url.searchParams.set("ids", [...idBySymbol.values()].join(","));
    url.searchParams.set("vs_currencies", "usd");
    url.searchParams.set("include_market_cap", "true");
    url.searchParams.set("include_24hr_vol", "true");
    url.searchParams.set("include_24hr_change", "true");
    url.searchParams.set("include_last_updated_at", "true");
    const raw = await fetchJson(this.provider, url.toString(), {
      headers: this.options.apiKey ? { "x-cg-demo-api-key": this.options.apiKey, "x-cg-pro-api-key": this.options.apiKey } : undefined
    });
    if (typeof raw !== "object" || raw === null) throw new ProviderUnavailableError(this.provider, "CoinGecko price response was not usable.", "degraded");
    const data = raw as Record<string, Record<string, unknown>>;
    return symbols.map((symbol) => {
      const id = idBySymbol.get(symbol)!;
      const row = data[id];
      if (!row) throw new ProviderUnavailableError(this.provider, `No CoinGecko price for ${symbol}`, "degraded");
      const clean = symbol.replace("-USD", "").toUpperCase();
      const hint = hints[symbol] ?? {};
      const updated = toNumber(row.last_updated_at);
      return validatedAsset({
        symbol: clean,
        name: hint.name ?? clean,
        assetClass: "crypto",
        sector: hint.sector ?? "Crypto",
        region: hint.region ?? "Global",
        price: requireNumber(this.provider, "usd", row.usd),
        changePercent24h: toNumber(row.usd_24h_change) ?? 0,
        volume: toNumber(row.usd_24h_vol),
        marketCap: toNumber(row.usd_market_cap),
        timestamp: updated ? new Date(updated * 1000).toISOString() : new Date().toISOString(),
        provider: this.provider
      });
    });
  }

  async getCryptoData(): Promise<MarketAsset[]> {
    return this.getBatchQuotes(Object.keys(COINGECKO_IDS));
  }

  async health(): Promise<ProviderHealth> {
    const started = Date.now();
    try {
      await this.getQuote("BTC", { name: "Bitcoin" });
      return providerHealth(this.provider, "healthy", this.options.apiKey ? "CoinGecko endpoint reachable with configured key" : "CoinGecko public endpoint reachable", Date.now() - started);
    } catch (error) {
      return providerHealth(this.provider, error instanceof ProviderUnavailableError ? error.status : "down", error instanceof Error ? error.message : "CoinGecko health check failed", Date.now() - started);
    }
  }
}
