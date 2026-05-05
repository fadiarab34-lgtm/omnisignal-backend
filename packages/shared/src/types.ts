export type AssetClass = "equity" | "crypto" | "forex" | "commodity" | "index" | "etf" | "perp";
export type ProviderStatusValue = "healthy" | "degraded" | "down" | "missing_config";
export type PortfolioMode = "simulation" | "imported" | "trading";
export type TradingMode = "simulation" | "testnet" | "mainnet";
export type OrderSide = "buy" | "sell";
export type OrderType = "market" | "limit";
export type SignalSourceType = "x_post" | "news" | "social" | "prediction_market" | "market_data" | "macro" | "portfolio";
export type SignalSentiment = "bullish" | "bearish" | "neutral" | "mixed" | "uncertain";
export type OracleSuggestedAction = "buy" | "sell" | "short" | "hedge" | "hold" | "watch" | "simulate";
export type OracleTimeHorizon = "intraday" | "short_term" | "medium_term" | "long_term";

export type SignalEntities = {
  people: string[];
  countries: string[];
  companies: string[];
  tickers: string[];
  assets: string[];
  sectors: string[];
  commodities: string[];
  currencies: string[];
  regions: string[];
};

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

export type NormalizedSignal = {
  id: string;
  sourceType: SignalSourceType;
  sourceName: string;
  sourceUrl?: string | null;
  publishedAt?: string | null;
  ingestedAt: string;
  title: string;
  rawText: string;
  summary?: string | null;
  category?: string | null;
  entities: SignalEntities;
  sentiment: SignalSentiment;
  urgencyScore: number;
  confidenceScore: number;
  marketImpactScore: number;
  geoRiskScore: number;
  crowdingScore?: number | null;
  divergenceScore?: number | null;
  affectedAssets: string[];
  affectedSectors: string[];
  suggestedAction: OracleSuggestedAction;
  timeHorizon: OracleTimeHorizon;
  portfolioExposure?: number | null;
  oracleSummary?: string | null;
  userAlertRequired: boolean;
};

export type OracleCard = {
  id: string;
  signalId?: string | null;
  title: string;
  summary: string;
  whyItMatters: string;
  sourceType: SignalSourceType;
  sourceName: string;
  sourceUrl?: string | null;
  sourceCredibility: number;
  publishedAt?: string | null;
  affectedCountries: string[];
  affectedSectors: string[];
  affectedAssets: string[];
  direction: SignalSentiment;
  urgencyScore: number;
  confidenceScore: number;
  marketImpactScore: number;
  geoRiskScore: number;
  timeHorizon: OracleTimeHorizon;
  suggestedAction: OracleSuggestedAction;
  portfolioExposure?: number | null;
  marketAlreadyPricing?: boolean | null;
  predictionDivergence?: number | null;
  crowdingScore?: number | null;
  majorityReport?: string | null;
  contrarianView?: string | null;
  createdAt: string;
};
