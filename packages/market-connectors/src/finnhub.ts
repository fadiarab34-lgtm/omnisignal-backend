import type { MarketAsset, MarketCandle, ProviderHealth } from "@omnisignal/shared";
import { ProviderUnavailableError } from "@omnisignal/shared";
import { assertConfigured, fetchJson, isoFromUnix, providerHealth, requireNumber, toNumber, validatedAsset, validatedCandles } from "./base";
import type { ConnectorQuoteHint, MarketConnector } from "./base";

export class FinnhubConnector implements MarketConnector {
  readonly provider = "finnhub";
  private readonly baseUrl: string;

  constructor(private readonly options: { apiKey?: string; baseUrl?: string }) {
    this.baseUrl = options.baseUrl ?? "https://finnhub.io/api/v1";
  }

  isConfigured(): boolean {
    return Boolean(this.options.apiKey);
  }

  async getQuote(symbol: string, hint: ConnectorQuoteHint = {}): Promise<MarketAsset> {
    assertConfigured(this.provider, this.isConfigured());
    const url = new URL(`${this.baseUrl}/quote`);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("token", this.options.apiKey!);
    const raw = await fetchJson(this.provider, url.toString());
    if (typeof raw !== "object" || raw === null) throw new ProviderUnavailableError(this.provider, "Finnhub quote response was not usable.", "degraded");
    const record = raw as Record<string, unknown>;
    const price = requireNumber(this.provider, "c", record.c);
    return validatedAsset({
      symbol,
      name: hint.name ?? symbol,
      assetClass: hint.assetClass ?? "equity",
      sector: hint.sector,
      region: hint.region,
      price,
      changePercent24h: requireNumber(this.provider, "dp", record.dp),
      changeAbs: toNumber(record.d),
      timestamp: new Date().toISOString(),
      provider: this.provider
    });
  }

  async getCandles(symbol: string, interval: string, range: string): Promise<MarketCandle[]> {
    assertConfigured(this.provider, this.isConfigured());
    const resolution = interval === "1min" ? "1" : interval === "5min" ? "5" : interval === "15min" ? "15" : interval === "1day" ? "D" : "60";
    const to = Math.floor(Date.now() / 1000);
    const days = range === "1D" ? 1 : range === "1W" ? 7 : range === "1M" ? 31 : range === "3M" ? 93 : 366;
    const from = to - days * 24 * 60 * 60;
    const url = new URL(`${this.baseUrl}/stock/candle`);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("resolution", resolution);
    url.searchParams.set("from", String(from));
    url.searchParams.set("to", String(to));
    url.searchParams.set("token", this.options.apiKey!);
    const raw = await fetchJson(this.provider, url.toString());
    if (typeof raw !== "object" || raw === null || (raw as { s?: unknown }).s !== "ok") {
      throw new ProviderUnavailableError(this.provider, `No Finnhub candles for ${symbol}`, "degraded");
    }
    const data = raw as { t: number[]; o: number[]; h: number[]; l: number[]; c: number[]; v?: number[] };
    return validatedCandles(data.t.map((timestamp, index) => ({
      symbol,
      timestamp: isoFromUnix(timestamp),
      open: requireNumber(this.provider, "o", data.o[index]),
      high: requireNumber(this.provider, "h", data.h[index]),
      low: requireNumber(this.provider, "l", data.l[index]),
      close: requireNumber(this.provider, "c", data.c[index]),
      volume: toNumber(data.v?.[index]),
      provider: this.provider
    })));
  }

  async health(): Promise<ProviderHealth> {
    if (!this.isConfigured()) return providerHealth(this.provider, "missing_config", "Missing FINNHUB_API_KEY");
    const started = Date.now();
    try {
      await this.getQuote("AAPL", { name: "Apple Inc.", assetClass: "equity" });
      return providerHealth(this.provider, "healthy", "Finnhub quote endpoint reachable", Date.now() - started);
    } catch (error) {
      return providerHealth(this.provider, error instanceof ProviderUnavailableError ? error.status : "down", error instanceof Error ? error.message : "Finnhub health check failed", Date.now() - started);
    }
  }
}
