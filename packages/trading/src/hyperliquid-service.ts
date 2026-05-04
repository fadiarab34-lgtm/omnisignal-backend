import { ProviderUnavailableError, TradingDisabledError, ValidationError } from "@omnisignal/shared";
import type { OrderEstimate, OrderSide, OrderType, TradingMode } from "@omnisignal/shared";

type OrderBookLevel = { price: number; size: number };
type OrderIntentLike = {
  id?: string;
  userId: string;
  walletAddress: string;
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  amountUsd?: number;
  quantity?: number;
  limitPrice?: number;
  mode: TradingMode;
  userConfirmedAt?: Date | string | null;
};

export type HyperliquidTradingConfig = {
  apiBase?: string;
  wsUrl?: string;
  network: "testnet" | "mainnet";
  disableTrading: boolean;
  enableMainnetTrading: boolean;
  tradingMode: TradingMode;
  agentPrivateKey?: string;
  takerFeeBps?: number;
  maxOrderUsd?: number;
};

export class HyperliquidTradingService {
  constructor(private readonly config: HyperliquidTradingConfig) {}

  async getUserState(walletAddress: string): Promise<unknown> {
    return this.info({ type: "clearinghouseState", user: walletAddress });
  }

  async getMarketMeta(): Promise<unknown> {
    return this.info({ type: "metaAndAssetCtxs" });
  }

  async getOrderBook(symbol: string): Promise<{ coin: string; bids: OrderBookLevel[]; asks: OrderBookLevel[]; raw: unknown }> {
    const coin = this.coin(symbol);
    const raw = await this.info({ type: "l2Book", coin });
    if (typeof raw !== "object" || raw === null || !Array.isArray((raw as { levels?: unknown }).levels)) {
      throw new ProviderUnavailableError("hyperliquid", `Hyperliquid order book unavailable for ${coin}`, "degraded");
    }
    const [bidsRaw, asksRaw] = (raw as { levels: Array<Array<Record<string, unknown>>> }).levels;
    const parse = (levels?: Array<Record<string, unknown>>) => (levels ?? []).map((level) => ({
      price: Number(level.px),
      size: Number(level.sz)
    })).filter((level) => Number.isFinite(level.price) && Number.isFinite(level.size) && level.price > 0 && level.size > 0);
    return { coin, bids: parse(bidsRaw), asks: parse(asksRaw), raw };
  }

  async estimateOrder(symbol: string, side: OrderSide, size: { amountUsd?: number; quantity?: number }, orderType: OrderType): Promise<OrderEstimate> {
    if (this.config.takerFeeBps === undefined) {
      throw new ProviderUnavailableError("hyperliquid", "Missing HYPERLIQUID_TAKER_FEE_BPS for fee estimation.", "missing_config");
    }
    const book = await this.getOrderBook(symbol);
    const levels = side === "buy" ? book.asks : book.bids;
    if (levels.length === 0) throw new ProviderUnavailableError("hyperliquid", `Hyperliquid ${side} book empty for ${book.coin}`, "degraded");
    const mid = (book.asks[0]!.price + book.bids[0]!.price) / 2;
    const targetQty = size.quantity ?? (size.amountUsd ? size.amountUsd / levels[0]!.price : undefined);
    if (!targetQty || targetQty <= 0) throw new ValidationError("Order estimate requires quantity or amountUsd.");
    let remaining = targetQty;
    let notional = 0;
    for (const level of levels) {
      const fill = Math.min(remaining, level.size);
      notional += fill * level.price;
      remaining -= fill;
      if (remaining <= 1e-10) break;
    }
    if (remaining > 1e-8) throw new ProviderUnavailableError("hyperliquid", `Insufficient visible book depth for ${book.coin}`, "degraded");
    const estimatedPrice = notional / targetQty;
    const estimatedSlippage = Math.abs((estimatedPrice - mid) / mid) * 100;
    return {
      symbol: `${book.coin}-PERP`,
      side,
      orderType,
      amountUsd: notional,
      quantity: targetQty,
      estimatedPrice,
      estimatedFees: notional * (this.config.takerFeeBps / 10000),
      estimatedSlippage,
      mode: this.config.tradingMode,
      provider: "hyperliquid",
      warnings: [
        "This estimate uses current Hyperliquid visible order book depth and can change before confirmation.",
        "AI can prepare this ticket but cannot execute it."
      ]
    };
  }

  createOrderIntent(input: OrderIntentLike): OrderIntentLike {
    if (input.mode !== "simulation" && this.config.disableTrading) throw new TradingDisabledError();
    if (input.mode === "mainnet" && !this.config.enableMainnetTrading) throw new TradingDisabledError("Mainnet trading is disabled.");
    if (!input.amountUsd && !input.quantity) throw new ValidationError("Order intent requires amountUsd or quantity.");
    if (this.config.maxOrderUsd && input.amountUsd && input.amountUsd > this.config.maxOrderUsd) {
      throw new ValidationError(`Order intent exceeds configured maximum of ${this.config.maxOrderUsd} USD.`);
    }
    return input;
  }

  async validateOrderIntent(orderIntent: OrderIntentLike): Promise<OrderIntentLike> {
    const intent = this.createOrderIntent(orderIntent);
    if (intent.mode !== "simulation") {
      await this.getOrderBook(intent.symbol);
    }
    return intent;
  }

  async placeTestnetOrder(orderIntent: OrderIntentLike): Promise<unknown> {
    if (orderIntent.mode !== "testnet") throw new ValidationError("Only testnet intents can be sent to the testnet endpoint.");
    if (!orderIntent.userConfirmedAt) throw new ValidationError("Visual user confirmation is required before order placement.");
    if (this.config.disableTrading) throw new TradingDisabledError();
    if (!this.config.agentPrivateKey) throw new ProviderUnavailableError("hyperliquid", "Missing HYPERLIQUID_AGENT_PRIVATE_KEY for testnet placement.", "missing_config");
    return this.placeWithSdk(orderIntent, true);
  }

  async placeMainnetOrder(orderIntent: OrderIntentLike): Promise<unknown> {
    if (orderIntent.mode !== "mainnet") throw new ValidationError("Only mainnet intents can be sent to the mainnet endpoint.");
    if (!orderIntent.userConfirmedAt) throw new ValidationError("Visual user confirmation is required before order placement.");
    if (this.config.disableTrading || !this.config.enableMainnetTrading) throw new TradingDisabledError("Mainnet trading is disabled by safety controls.");
    if (!this.config.agentPrivateKey) throw new ProviderUnavailableError("hyperliquid", "Missing HYPERLIQUID_AGENT_PRIVATE_KEY for mainnet placement.", "missing_config");
    return this.placeWithSdk(orderIntent, false);
  }

  async cancelOrder(orderId: string): Promise<unknown> {
    if (this.config.disableTrading) throw new TradingDisabledError();
    if (!this.config.agentPrivateKey) throw new ProviderUnavailableError("hyperliquid", "Missing HYPERLIQUID_AGENT_PRIVATE_KEY for cancellation.", "missing_config");
    return { orderId, status: "cancel_requested" };
  }

  async getOpenOrders(walletAddress: string): Promise<unknown> {
    return this.info({ type: "openOrders", user: walletAddress });
  }

  async getFills(walletAddress: string): Promise<unknown> {
    return this.info({ type: "userFills", user: walletAddress });
  }

  private async placeWithSdk(orderIntent: OrderIntentLike, isTestnet: boolean): Promise<unknown> {
    const [{ privateKeyToAccount }, hyperliquid] = await Promise.all([
      import("viem/accounts"),
      import("@nktkas/hyperliquid")
    ]);
    const account = privateKeyToAccount(this.config.agentPrivateKey as `0x${string}`);
    const transport = new (hyperliquid as unknown as { HttpTransport: new (opts: { isTestnet: boolean }) => unknown }).HttpTransport({ isTestnet });
    const exchange = new (hyperliquid as unknown as { ExchangeClient: new (opts: { wallet: unknown; transport: unknown }) => { order: (payload: unknown) => Promise<unknown> } }).ExchangeClient({ wallet: account, transport });
    const estimate = await this.estimateOrder(orderIntent.symbol, orderIntent.side, { amountUsd: orderIntent.amountUsd, quantity: orderIntent.quantity }, orderIntent.orderType);
    return exchange.order({
      orders: [{
        a: await this.assetIndex(this.coin(orderIntent.symbol)),
        b: orderIntent.side === "buy",
        p: orderIntent.limitPrice ? String(orderIntent.limitPrice) : String(estimate.estimatedPrice),
        s: String(estimate.quantity),
        r: false,
        t: orderIntent.orderType === "market" ? { limit: { tif: "Ioc" } } : { limit: { tif: "Gtc" } }
      }],
      grouping: "na"
    });
  }

  private async assetIndex(coin: string): Promise<number> {
    const meta = await this.getMarketMeta();
    const universe = Array.isArray(meta)
      ? (meta[0] as { universe?: Array<{ name?: string }> })?.universe
      : (meta as { universe?: Array<{ name?: string }> })?.universe;
    const index = universe?.findIndex((asset) => asset.name === coin);
    if (index === undefined || index < 0) throw new ProviderUnavailableError("hyperliquid", `Hyperliquid market ${coin} not found in metadata.`, "degraded");
    return index;
  }

  private async info(payload: unknown): Promise<unknown> {
    if (!this.config.apiBase) throw new ProviderUnavailableError("hyperliquid", "Missing HYPERLIQUID_API_BASE", "missing_config");
    const response = await fetch(`${this.config.apiBase}/info`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload)
    });
    const text = await response.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      throw new ProviderUnavailableError("hyperliquid", "Hyperliquid returned invalid JSON.", "degraded");
    }
    if (!response.ok) throw new ProviderUnavailableError("hyperliquid", `Hyperliquid returned ${response.status}: ${text.slice(0, 240)}`, "down");
    return json;
  }

  private coin(symbol: string): string {
    return symbol.replace("-PERP", "").replace("-USD", "").toUpperCase();
  }
}
