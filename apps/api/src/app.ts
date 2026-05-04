import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import Fastify from "fastify";
import { AIAnalysisService } from "@omnisignal/ai";
import { MarketDataService } from "@omnisignal/market-connectors";
import { HyperliquidTradingService } from "@omnisignal/trading";
import { loadEnv } from "./config/env";
import { prisma } from "./db/prisma";
import { getRedis } from "./db/redis";
import { registerAuthRoutes } from "./auth/routes";
import { registerMarketRoutes } from "./market/routes";
import { registerPortfolioRoutes } from "./portfolio/routes";
import { registerSignalRoutes } from "./signals/routes";
import { registerAiRoutes } from "./ai/routes";
import { registerTradingRoutes } from "./trading/routes";
import { registerBillingRoutes } from "./billing/routes";
import { registerTelegramRoutes } from "./messaging/telegram";
import { registerHealthRoutes } from "./health/routes";
import { registerMarketWebSocket } from "./websocket/market-live";
import { startSignalIngestionWorker } from "./jobs/ingestion";

export async function buildApp() {
  const env = loadEnv();
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
      redact: ["req.headers.authorization", "headers.authorization"]
    }
  });

  await app.register(cors, {
    origin(origin, callback) {
      const allowed = env.CORS_ALLOWED_ORIGINS.split(",").map((item) => item.trim()).filter(Boolean);
      if (!origin || allowed.includes(origin)) callback(null, true);
      else callback(new Error("Origin not allowed"), false);
    },
    credentials: true
  });
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX_REQUESTS,
    timeWindow: env.RATE_LIMIT_WINDOW_MS
  });
  await app.register(jwt, { secret: env.JWT_SECRET });
  await app.register(websocket);

  const redis = getRedis(env);
  const marketData = new MarketDataService({
    twelveDataApiKey: env.TWELVE_DATA_API_KEY,
    finnhubApiKey: env.FINNHUB_API_KEY,
    coinGeckoApiKey: env.COINGECKO_API_KEY,
    alphaVantageApiKey: env.ALPHA_VANTAGE_API_KEY,
    hyperliquidApiBase: env.HYPERLIQUID_API_BASE,
    hyperliquidWsUrl: env.HYPERLIQUID_WS_URL
  });
  const ai = new AIAnalysisService({ apiKey: env.OPENAI_API_KEY });
  const trading = new HyperliquidTradingService({
    apiBase: env.HYPERLIQUID_API_BASE,
    wsUrl: env.HYPERLIQUID_WS_URL,
    network: env.HYPERLIQUID_NETWORK,
    disableTrading: env.DISABLE_TRADING,
    enableMainnetTrading: env.ENABLE_MAINNET_TRADING,
    tradingMode: env.TRADING_MODE,
    agentPrivateKey: env.HYPERLIQUID_AGENT_PRIVATE_KEY,
    takerFeeBps: env.HYPERLIQUID_TAKER_FEE_BPS
  });

  app.decorate("services", { env, prisma, redis, marketData, ai, trading });

  await registerAuthRoutes(app);
  await registerMarketRoutes(app);
  await registerPortfolioRoutes(app);
  await registerSignalRoutes(app);
  await registerAiRoutes(app);
  await registerTradingRoutes(app);
  await registerBillingRoutes(app);
  await registerTelegramRoutes(app);
  await registerHealthRoutes(app);
  await registerMarketWebSocket(app);

  if (env.NODE_ENV !== "test") {
    startSignalIngestionWorker(env);
  }

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    const err = error as Error & { statusCode?: number; status?: string };
    const statusCode = typeof err.statusCode === "number" ? err.statusCode : 500;
    const providerStatus = typeof err.status === "string" ? err.status : undefined;
    reply.status(statusCode >= 400 ? statusCode : providerStatus === "missing_config" ? 503 : 500).send({
      error: err.name,
      message: err.message,
      providerStatus
    });
  });

  return app;
}

declare module "fastify" {
  interface FastifyInstance {
    services: {
      env: ReturnType<typeof loadEnv>;
      prisma: typeof prisma;
      redis: ReturnType<typeof getRedis>;
      marketData: MarketDataService;
      ai: AIAnalysisService;
      trading: HyperliquidTradingService;
    };
  }
}
