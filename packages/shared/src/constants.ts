import type { AssetClass } from "./types";

export const DEFAULT_HEATMAP_UNIVERSE: Array<{
  symbol: string;
  name: string;
  assetClass: AssetClass;
  sector?: string;
  region?: string;
  preferredProvider: "twelveData" | "finnhub" | "coinGecko" | "alphaVantage" | "hyperliquid";
}> = [
  { symbol: "SPY", name: "SPDR S&P 500 ETF", assetClass: "etf", sector: "US Equities", region: "United States", preferredProvider: "twelveData" },
  { symbol: "QQQ", name: "Invesco QQQ Trust", assetClass: "etf", sector: "US Tech", region: "United States", preferredProvider: "twelveData" },
  { symbol: "IWM", name: "iShares Russell 2000 ETF", assetClass: "etf", sector: "US Equities", region: "United States", preferredProvider: "twelveData" },
  { symbol: "DIA", name: "SPDR Dow Jones Industrial Average ETF", assetClass: "etf", sector: "US Equities", region: "United States", preferredProvider: "twelveData" },
  { symbol: "XLK", name: "Technology Select Sector SPDR", assetClass: "etf", sector: "US Tech", region: "United States", preferredProvider: "twelveData" },
  { symbol: "XLF", name: "Financial Select Sector SPDR", assetClass: "etf", sector: "Financials", region: "United States", preferredProvider: "twelveData" },
  { symbol: "XLE", name: "Energy Select Sector SPDR", assetClass: "etf", sector: "Energy", region: "United States", preferredProvider: "twelveData" },
  { symbol: "GLD", name: "SPDR Gold Shares", assetClass: "commodity", sector: "Commodities", region: "Global", preferredProvider: "twelveData" },
  { symbol: "USO", name: "United States Oil Fund", assetClass: "commodity", sector: "Commodities", region: "Global", preferredProvider: "twelveData" },
  { symbol: "EUR/USD", name: "Euro / US Dollar", assetClass: "forex", sector: "Forex", region: "Global", preferredProvider: "twelveData" },
  { symbol: "USD/JPY", name: "US Dollar / Japanese Yen", assetClass: "forex", sector: "Forex", region: "Global", preferredProvider: "twelveData" },
  { symbol: "BTC", name: "Bitcoin", assetClass: "crypto", sector: "Crypto", region: "Global", preferredProvider: "coinGecko" },
  { symbol: "ETH", name: "Ethereum", assetClass: "crypto", sector: "Crypto", region: "Global", preferredProvider: "coinGecko" },
  { symbol: "SOL", name: "Solana", assetClass: "crypto", sector: "Crypto", region: "Global", preferredProvider: "coinGecko" },
  { symbol: "BTC-PERP", name: "Bitcoin Perpetual", assetClass: "perp", sector: "Hyperliquid", region: "Global", preferredProvider: "hyperliquid" },
  { symbol: "ETH-PERP", name: "Ethereum Perpetual", assetClass: "perp", sector: "Hyperliquid", region: "Global", preferredProvider: "hyperliquid" }
];

export const RISK_TYPES = [
  "geopolitical",
  "macro",
  "earnings",
  "liquidity",
  "regulatory",
  "energy",
  "supply-chain",
  "crypto-specific",
  "currency",
  "rates"
] as const;

export const REQUIRED_PROVIDER_ENV = {
  openai: ["OPENAI_API_KEY"],
  twelveData: ["TWELVE_DATA_API_KEY"],
  finnhub: ["FINNHUB_API_KEY"],
  coinGecko: ["COINGECKO_API_KEY"],
  alphaVantage: ["ALPHA_VANTAGE_API_KEY"],
  hyperliquid: ["HYPERLIQUID_API_BASE", "HYPERLIQUID_WS_URL"],
  database: ["DATABASE_URL"],
  redis: ["REDIS_URL"]
} as const;
