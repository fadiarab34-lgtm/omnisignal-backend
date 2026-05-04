import type { MarketAsset, MarketCandle, ProviderHealth } from "@omnisignal/shared";
import { ProviderUnavailableError } from "@omnisignal/shared";
import { assertConfigured, fetchJson, providerHealth, requireNumber, toNumber, validatedAsset, validatedCandles } from "./base";
import type { ConnectorQuoteHint, MarketConnector } from "./base";

export class AlphaVantageConnector implements MarketConnector {
  readonly provider = "alphaVantage";
  private readonly baseUrl: string;

  constructor(private readonly options: { apiKey?: string; baseUrl?: string }) {
    this.baseUrl = options.baseUrl ?? "https://www.alphavantage.co/query";
  }

  isConfigured(): boolean {
    return Boolean(this.options.apiKey);
  }

  async getQuote(symbol: string, hint: ConnectorQuoteHint = {}): Promise<MarketAsset> {
    assertConfigured(this.provider, this.isConfigured());
    const url = new URL(this.baseUrl);
    url.searchParams.set("function", "GLOBAL_QUOTE");
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("apikey", this.options.apiKey!);
    const raw = await fetchJson(this.provider, url.toString());
    const quote = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>)["Global Quote"] as Record<string, unknown> | undefined : undefined;
    if (!quote || Object.keys(quote).length === 0) throw new ProviderUnavailableError(this.provider, `No Alpha Vantage quote for ${symbol}`, "degraded");
    return validatedAsset({
      symbol,
      name: hint.name ?? symbol,
      assetClass: hint.assetClass ?? "equity",
      sector: hint.sector,
      region: hint.region,
      price: requireNumber(this.provider, "05. price", quote["05. price"]),
      changePercent24h: toNumber(String(quote["10. change percent"] ?? "").replace("%", "")) ?? 0,
      changeAbs: toNumber(quote["09. change"]),
      volume: toNumber(quote["06. volume"]),
      timestamp: new Date().toISOString(),
      provider: this.provider
    });
  }

  async getCandles(symbol: string, _interval: string, range: string): Promise<MarketCandle[]> {
    assertConfigured(this.provider, this.isConfigured());
    const url = new URL(this.baseUrl);
    url.searchParams.set("function", range === "1D" ? "TIME_SERIES_INTRADAY" : "TIME_SERIES_DAILY_ADJUSTED");
    url.searchParams.set("symbol", symbol);
    if (range === "1D") url.searchParams.set("interval", "15min");
    url.searchParams.set("outputsize", range === "1Y" ? "full" : "compact");
    url.searchParams.set("apikey", this.options.apiKey!);
    const raw = await fetchJson(this.provider, url.toString());
    if (typeof raw !== "object" || raw === null) throw new ProviderUnavailableError(this.provider, `No Alpha Vantage candles for ${symbol}`, "degraded");
    const data = raw as Record<string, Record<string, Record<string, unknown>>>;
    const key = Object.keys(data).find((item) => item.startsWith("Time Series"));
    if (!key || !data[key]) throw new ProviderUnavailableError(this.provider, `No Alpha Vantage time series for ${symbol}`, "degraded");
    const rows = Object.entries(data[key]).slice(0, range === "1D" ? 96 : range === "1W" ? 7 : range === "1M" ? 31 : range === "3M" ? 93 : 366).reverse();
    return validatedCandles(rows.map(([timestamp, item]) => ({
      symbol,
      timestamp: new Date(timestamp).toISOString(),
      open: requireNumber(this.provider, "open", item["1. open"]),
      high: requireNumber(this.provider, "high", item["2. high"]),
      low: requireNumber(this.provider, "low", item["3. low"]),
      close: requireNumber(this.provider, "close", item["4. close"] ?? item["5. adjusted close"]),
      volume: toNumber(item["6. volume"] ?? item["5. volume"]),
      provider: this.provider
    })));
  }

  async health(): Promise<ProviderHealth> {
    if (!this.isConfigured()) return providerHealth(this.provider, "missing_config", "Missing ALPHA_VANTAGE_API_KEY");
    const started = Date.now();
    try {
      await this.getQuote("SPY", { name: "SPDR S&P 500 ETF", assetClass: "etf" });
      return providerHealth(this.provider, "healthy", "Alpha Vantage endpoint reachable", Date.now() - started);
    } catch (error) {
      return providerHealth(this.provider, error instanceof ProviderUnavailableError ? error.status : "down", error instanceof Error ? error.message : "Alpha Vantage health check failed", Date.now() - started);
    }
  }
}
