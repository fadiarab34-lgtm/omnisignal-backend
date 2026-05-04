import type { MarketAsset, MarketCandle, ProviderHealth } from "@omnisignal/shared";
import { ProviderUnavailableError } from "@omnisignal/shared";
import { assertConfigured, fetchJson, providerHealth, requireNumber, toNumber, validatedAsset, validatedCandles } from "./base";
import type { ConnectorQuoteHint, MarketConnector } from "./base";

type TwelveDataOptions = {
  apiKey?: string;
  baseUrl?: string;
};

export class TwelveDataConnector implements MarketConnector {
  readonly provider = "twelveData";
  private readonly baseUrl: string;

  constructor(private readonly options: TwelveDataOptions) {
    this.baseUrl = options.baseUrl ?? "https://api.twelvedata.com";
  }

  isConfigured(): boolean {
    return Boolean(this.options.apiKey);
  }

  async getQuote(symbol: string, hint: ConnectorQuoteHint = {}): Promise<MarketAsset> {
    assertConfigured(this.provider, this.isConfigured());
    const url = new URL(`${this.baseUrl}/quote`);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("apikey", this.options.apiKey!);
    const raw = await fetchJson(this.provider, url.toString());
    if (typeof raw !== "object" || raw === null || "code" in raw) {
      throw new ProviderUnavailableError(this.provider, "Twelve Data quote response did not contain a usable asset.", "degraded");
    }
    const record = raw as Record<string, unknown>;
    const price = requireNumber(this.provider, "close", record.close ?? record.price);
    const previous = toNumber(record.previous_close);
    const changeAbs = toNumber(record.change) ?? (previous ? price - previous : undefined);
    const changePercent = toNumber(record.percent_change) ?? (previous ? ((price - previous) / previous) * 100 : 0);
    return validatedAsset({
      symbol,
      name: String(record.name ?? hint.name ?? symbol),
      assetClass: hint.assetClass ?? "equity",
      sector: hint.sector,
      region: hint.region,
      price,
      changePercent24h: changePercent,
      changeAbs,
      volume: toNumber(record.volume),
      timestamp: new Date().toISOString(),
      provider: this.provider
    });
  }

  async getBatchQuotes(symbols: string[], hints: Record<string, ConnectorQuoteHint> = {}): Promise<MarketAsset[]> {
    assertConfigured(this.provider, this.isConfigured());
    if (symbols.length === 0) return [];
    const url = new URL(`${this.baseUrl}/quote`);
    url.searchParams.set("symbol", symbols.join(","));
    url.searchParams.set("apikey", this.options.apiKey!);
    const raw = await fetchJson(this.provider, url.toString());
    if (symbols.length === 1) return [await this.getQuote(symbols[0]!, hints[symbols[0]!])];
    if (typeof raw !== "object" || raw === null) {
      throw new ProviderUnavailableError(this.provider, "Twelve Data batch quote response was not usable.", "degraded");
    }
    const map = raw as Record<string, Record<string, unknown>>;
    return symbols.map((symbol) => {
      const record = map[symbol];
      if (!record || "code" in record) {
        throw new ProviderUnavailableError(this.provider, `No Twelve Data quote for ${symbol}`, "degraded");
      }
      const hint = hints[symbol] ?? {};
      const price = requireNumber(this.provider, "close", record.close ?? record.price);
      const previous = toNumber(record.previous_close);
      return validatedAsset({
        symbol,
        name: String(record.name ?? hint.name ?? symbol),
        assetClass: hint.assetClass ?? "equity",
        sector: hint.sector,
        region: hint.region,
        price,
        changePercent24h: toNumber(record.percent_change) ?? (previous ? ((price - previous) / previous) * 100 : 0),
        changeAbs: toNumber(record.change) ?? (previous ? price - previous : undefined),
        volume: toNumber(record.volume),
        timestamp: new Date().toISOString(),
        provider: this.provider
      });
    });
  }

  async getCandles(symbol: string, interval: string, range: string): Promise<MarketCandle[]> {
    assertConfigured(this.provider, this.isConfigured());
    const outputsize = range === "1D" ? "96" : range === "1W" ? "168" : range === "1M" ? "180" : range === "3M" ? "260" : "520";
    const url = new URL(`${this.baseUrl}/time_series`);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("interval", interval);
    url.searchParams.set("outputsize", outputsize);
    url.searchParams.set("order", "ASC");
    url.searchParams.set("apikey", this.options.apiKey!);
    const raw = await fetchJson(this.provider, url.toString());
    if (typeof raw !== "object" || raw === null || !Array.isArray((raw as { values?: unknown }).values)) {
      throw new ProviderUnavailableError(this.provider, `No Twelve Data candles for ${symbol}`, "degraded");
    }
    const values = (raw as { values: Array<Record<string, unknown>> }).values;
    return validatedCandles(values.map((item) => ({
      symbol,
      timestamp: new Date(String(item.datetime)).toISOString(),
      open: requireNumber(this.provider, "open", item.open),
      high: requireNumber(this.provider, "high", item.high),
      low: requireNumber(this.provider, "low", item.low),
      close: requireNumber(this.provider, "close", item.close),
      volume: toNumber(item.volume),
      provider: this.provider
    })));
  }

  async health(): Promise<ProviderHealth> {
    if (!this.isConfigured()) return providerHealth(this.provider, "missing_config", "Missing TWELVE_DATA_API_KEY");
    const started = Date.now();
    try {
      await this.getQuote("SPY", { name: "SPDR S&P 500 ETF", assetClass: "etf" });
      return providerHealth(this.provider, "healthy", "Twelve Data quote endpoint reachable", Date.now() - started);
    } catch (error) {
      return providerHealth(this.provider, error instanceof ProviderUnavailableError ? error.status : "down", error instanceof Error ? error.message : "Twelve Data health check failed", Date.now() - started);
    }
  }
}
