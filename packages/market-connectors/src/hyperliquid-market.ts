import type { MarketAsset, ProviderHealth } from "@omnisignal/shared";
import { ProviderUnavailableError } from "@omnisignal/shared";
import { fetchJson, providerHealth, requireNumber, validatedAsset } from "./base";
import type { ConnectorQuoteHint, MarketConnector } from "./base";

export class HyperliquidMarketConnector implements MarketConnector {
  readonly provider = "hyperliquid";
  private readonly apiBase?: string;

  constructor(private readonly options: { apiBase?: string; wsUrl?: string }) {
    this.apiBase = options.apiBase;
  }

  isConfigured(): boolean {
    return Boolean(this.options.apiBase && this.options.wsUrl);
  }

  async getQuote(symbol: string, hint: ConnectorQuoteHint = {}): Promise<MarketAsset> {
    if (!this.isConfigured()) throw new ProviderUnavailableError(this.provider, "Missing Hyperliquid market endpoint configuration", "missing_config");
    const coin = symbol.replace("-PERP", "").replace("-USD", "").toUpperCase();
    const raw = await fetchJson(this.provider, `${this.apiBase}/info`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "allMids" })
    });
    if (typeof raw !== "object" || raw === null) throw new ProviderUnavailableError(this.provider, "Hyperliquid allMids response was not usable.", "degraded");
    const price = requireNumber(this.provider, coin, (raw as Record<string, unknown>)[coin]);
    return validatedAsset({
      symbol: `${coin}-PERP`,
      name: hint.name ?? `${coin} Perpetual`,
      assetClass: "perp",
      sector: hint.sector ?? "Hyperliquid",
      region: hint.region ?? "Global",
      price,
      changePercent24h: 0,
      timestamp: new Date().toISOString(),
      provider: this.provider
    });
  }

  async getMarketMeta(): Promise<unknown> {
    if (!this.isConfigured()) throw new ProviderUnavailableError(this.provider, "Missing Hyperliquid market endpoint configuration", "missing_config");
    return fetchJson(this.provider, `${this.apiBase}/info`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "metaAndAssetCtxs" })
    });
  }

  async health(): Promise<ProviderHealth> {
    if (!this.isConfigured()) return providerHealth(this.provider, "missing_config", "Missing HYPERLIQUID_API_BASE or HYPERLIQUID_WS_URL");
    const started = Date.now();
    try {
      await this.getMarketMeta();
      return providerHealth(this.provider, "healthy", "Hyperliquid market endpoint reachable", Date.now() - started);
    } catch (error) {
      return providerHealth(this.provider, error instanceof ProviderUnavailableError ? error.status : "down", error instanceof Error ? error.message : "Hyperliquid health check failed", Date.now() - started);
    }
  }
}
