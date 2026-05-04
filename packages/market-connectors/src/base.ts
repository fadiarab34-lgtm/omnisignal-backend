import { ProviderUnavailableError, marketAssetSchema, marketCandleSchema } from "@omnisignal/shared";
import type { AssetClass, MarketAsset, MarketCandle, ProviderHealth } from "@omnisignal/shared";

export type ConnectorQuoteHint = {
  name?: string;
  assetClass?: AssetClass;
  sector?: string;
  region?: string;
};

export interface MarketConnector {
  readonly provider: string;
  isConfigured(): boolean;
  getQuote(symbol: string, hint?: ConnectorQuoteHint): Promise<MarketAsset>;
  getBatchQuotes?(symbols: string[], hints?: Record<string, ConnectorQuoteHint>): Promise<MarketAsset[]>;
  getCandles?(symbol: string, interval: string, range: string): Promise<MarketCandle[]>;
  health(): Promise<ProviderHealth>;
}

export function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(String(value).replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function requireNumber(provider: string, field: string, value: unknown): number {
  const parsed = toNumber(value);
  if (parsed === undefined) {
    throw new ProviderUnavailableError(provider, `Provider response missing numeric field: ${field}`, "degraded");
  }
  return parsed;
}

export function assertConfigured(provider: string, configured: boolean): void {
  if (!configured) {
    throw new ProviderUnavailableError(provider, `Missing configuration for ${provider}`, "missing_config");
  }
}

export async function fetchJson(provider: string, url: string, init?: RequestInit): Promise<unknown> {
  const started = Date.now();
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {})
    }
  });
  const text = await response.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new ProviderUnavailableError(provider, `Invalid JSON from ${provider} after ${Date.now() - started}ms`, "degraded");
  }
  if (!response.ok) {
    const message = typeof json === "object" && json && "message" in json ? String((json as { message: unknown }).message) : response.statusText;
    throw new ProviderUnavailableError(provider, `${provider} returned ${response.status}: ${message}`, "down");
  }
  return json;
}

export function validatedAsset(asset: MarketAsset): MarketAsset {
  return marketAssetSchema.parse(asset);
}

export function validatedCandles(candles: MarketCandle[]): MarketCandle[] {
  return candles.map((candle) => marketCandleSchema.parse(candle));
}

export function isoFromUnix(seconds: number): string {
  return new Date(seconds * 1000).toISOString();
}

export function providerHealth(provider: string, status: ProviderHealth["status"], message: string, latencyMs?: number): ProviderHealth {
  return {
    provider,
    status,
    message,
    latencyMs,
    lastCheckedAt: new Date().toISOString()
  };
}
