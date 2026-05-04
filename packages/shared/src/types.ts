export type AssetClass = "equity" | "crypto" | "forex" | "commodity" | "index" | "etf" | "perp";
export type ProviderStatusValue = "healthy" | "degraded" | "down" | "missing_config";
export type PortfolioMode = "simulation" | "imported" | "trading";
export type TradingMode = "simulation" | "testnet" | "mainnet";
export type OrderSide = "buy" | "sell";
export type OrderType = "market" | "limit";

export type MarketAsset = {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  sector?: string;
  region?: string;
  price: number;
  changePercent24h: number;
  changeAbs?: number;
  volume?: number;
  marketCap?: number;
  volatility?: number;
  timestamp: string;
  provider: string;
};

export type MarketCandle = {
  symbol: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  provider: string;
};

export type ProviderHealth = {
  provider: string;
  status: ProviderStatusValue;
  lastCheckedAt: string;
  message: string;
  latencyMs?: number;
};

export type HeatmapFilters = {
  assetClass?: AssetClass | "all" | "portfolio";
  metric?: "marketCap" | "volume" | "portfolioExposure";
  colorMode?: "performance" | "volatility" | "aiRisk" | "geopoliticalImpact" | "volume";
  symbols?: string[];
};

export type WalletSession = {
  userId: string;
  walletAddress: string;
  chainId?: string;
};

export type OrderEstimate = {
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  amountUsd: number;
  quantity: number;
  estimatedPrice: number;
  estimatedFees: number;
  estimatedSlippage: number;
  mode: TradingMode;
  provider: string;
  warnings: string[];
};
