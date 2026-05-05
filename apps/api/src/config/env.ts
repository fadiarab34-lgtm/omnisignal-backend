import { z } from "zod";

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off", ""].includes(normalized)) return false;
  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_REALTIME_MODEL: z.string().default("gpt-4o-realtime-preview"),
  TWELVE_DATA_API_KEY: z.string().optional(),
  FINNHUB_API_KEY: z.string().optional(),
  COINGECKO_API_KEY: z.string().optional(),
  ALPHA_VANTAGE_API_KEY: z.string().optional(),
  ORACLE_REFRESH_INTERVAL_MS: z.coerce.number().default(20 * 60 * 1000),
  ORACLE_MAX_SOURCE_ITEMS: z.coerce.number().default(50),
  X_BEARER_TOKEN: z.string().optional(),
  X_LEADER_HANDLES: z.string().optional(),
  SOCIAL_SIGNAL_API_URL: z.string().optional(),
  SOCIAL_SIGNAL_API_KEY: z.string().optional(),
  PREDICTION_MARKET_API_URL: z.string().optional(),
  PREDICTION_MARKET_API_KEY: z.string().optional(),
  MACRO_DATA_API_URL: z.string().optional(),
  MACRO_DATA_API_KEY: z.string().optional(),
  HYPERLIQUID_NETWORK: z.enum(["testnet", "mainnet"]).default("testnet"),
  HYPERLIQUID_API_BASE: z.string().optional(),
  HYPERLIQUID_WS_URL: z.string().optional(),
  HYPERLIQUID_AGENT_PRIVATE_KEY: z.string().optional(),
  HYPERLIQUID_AGENT_ADDRESS: z.string().optional(),
  HYPERLIQUID_TAKER_FEE_BPS: z.coerce.number().optional(),
  ENABLE_MAINNET_TRADING: booleanFromEnv.default(false),
  DISABLE_TRADING: booleanFromEnv.default(true),
  TRADING_MODE: z.enum(["simulation", "testnet", "mainnet"]).default("simulation"),
  PREMIUM_PRICE_USD: z.coerce.number().default(25),
  PREMIUM_SUBSCRIPTION_DAYS: z.coerce.number().default(30),
  PREMIUM_TREASURY_ADDRESS: z.string().optional(),
  PREMIUM_PAYMENT_NETWORK_NAME: z.string().default("Base"),
  PREMIUM_PAYMENT_CHAIN_ID: z.string().default("8453"),
  PREMIUM_PAYMENT_TOKEN_SYMBOL: z.string().default("USDC"),
  PREMIUM_PAYMENT_TOKEN_ADDRESS: z.string().optional(),
  PREMIUM_PAYMENT_TOKEN_DECIMALS: z.coerce.number().default(6),
  EVM_RPC_URL: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  JWT_SECRET: z.string().min(32),
  SESSION_SECRET: z.string().optional(),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  BACKEND_URL: z.string().default("http://localhost:4000"),
  CORS_ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(120)
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  return envSchema.parse(process.env);
}
