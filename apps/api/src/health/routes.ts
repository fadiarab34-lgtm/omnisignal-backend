import type { FastifyInstance } from "fastify";

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get("/health/live", async () => ({ status: "ok", checkedAt: new Date().toISOString() }));

  app.get("/health", async () => {
    const [database, redis, providers] = await Promise.all([
      checkDatabase(app),
      checkRedis(app),
      app.services.marketData.getProviderStatus()
    ]);
    return {
      status: database.status === "healthy" && redis.status === "healthy" ? "healthy" : "degraded",
      database,
      redis,
      providers,
      trading: {
        mode: app.services.env.TRADING_MODE,
        disabled: app.services.env.DISABLE_TRADING,
        mainnetEnabled: app.services.env.ENABLE_MAINNET_TRADING
      }
    };
  });

  app.get("/health/database", async () => checkDatabase(app));
  app.get("/health/redis", async () => checkRedis(app));
  app.get("/health/providers", async () => {
    const providers = await app.services.marketData.getProviderStatus();
    const openai = app.services.env.OPENAI_API_KEY
      ? { provider: "openai", status: "healthy", message: "OpenAI key configured", lastCheckedAt: new Date().toISOString() }
      : { provider: "openai", status: "missing_config", message: "Missing OPENAI_API_KEY", lastCheckedAt: new Date().toISOString() };
    const voice = app.services.env.OPENAI_API_KEY && app.services.env.OPENAI_REALTIME_MODEL
      ? { provider: "aiVoice", status: "healthy", message: "Realtime voice configuration present", lastCheckedAt: new Date().toISOString() }
      : { provider: "aiVoice", status: "missing_config", message: "Missing OpenAI voice configuration", lastCheckedAt: new Date().toISOString() };
    const walletPayment = app.services.env.PREMIUM_TREASURY_ADDRESS && app.services.env.PREMIUM_PAYMENT_TOKEN_ADDRESS && app.services.env.EVM_RPC_URL
      ? { provider: "walletPayment", status: "healthy", message: "Premium wallet payment configuration present", lastCheckedAt: new Date().toISOString() }
      : { provider: "walletPayment", status: "missing_config", message: "Missing premium treasury, token, or RPC configuration", lastCheckedAt: new Date().toISOString() };
    const telegram = app.services.env.TELEGRAM_BOT_TOKEN && app.services.env.TELEGRAM_WEBHOOK_SECRET
      ? { provider: "telegramAi", status: "healthy", message: "Telegram AI configuration present", lastCheckedAt: new Date().toISOString() }
      : { provider: "telegramAi", status: "missing_config", message: "Missing Telegram bot configuration", lastCheckedAt: new Date().toISOString() };
    return { providers: [openai, voice, walletPayment, telegram, ...providers] };
  });
}

async function checkDatabase(app: FastifyInstance) {
  const started = Date.now();
  try {
    await app.services.prisma.$queryRaw`SELECT 1`;
    return { provider: "database", status: "healthy", message: "Database reachable", latencyMs: Date.now() - started, lastCheckedAt: new Date().toISOString() };
  } catch (error) {
    return { provider: "database", status: "down", message: error instanceof Error ? error.message : "Database unavailable", latencyMs: Date.now() - started, lastCheckedAt: new Date().toISOString() };
  }
}

async function checkRedis(app: FastifyInstance) {
  const started = Date.now();
  try {
    await app.services.redis.ping();
    return { provider: "redis", status: "healthy", message: "Redis reachable", latencyMs: Date.now() - started, lastCheckedAt: new Date().toISOString() };
  } catch (error) {
    return { provider: "redis", status: "down", message: error instanceof Error ? error.message : "Redis unavailable", latencyMs: Date.now() - started, lastCheckedAt: new Date().toISOString() };
  }
}
