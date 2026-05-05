import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { PortfolioService } from "../portfolio/service";
import { requireSession } from "../security/session";
import { auditLog } from "../security/audit";
import { ingestSignals } from "../signals/ingestion";

const signalQuery = z.object({
  take: z.coerce.number().int().min(1).max(100).default(40),
  sourceType: z.string().optional(),
  category: z.string().optional(),
  asset: z.string().optional(),
  sector: z.string().optional()
});

const heatmapQuery = z.object({
  filter: z.string().default("all"),
  metric: z.enum(["marketCap", "volume", "portfolioExposure"]).default("marketCap"),
  colorMode: z.enum(["performance", "volatility", "aiRisk", "geopoliticalImpact", "volume"]).default("performance"),
  symbols: z.string().optional()
});

export async function registerOracleRoutes(app: FastifyInstance) {
  const portfolioService = new PortfolioService(app.services.prisma, app.services.marketData);

  const latestOracle = async (request: FastifyRequest) => {
    const query = z.object({ take: z.coerce.number().int().min(1).max(50).default(20) }).parse(request.query);
    const [cards, signals, providers] = await Promise.all([
      app.services.prisma.oracleCard.findMany({ orderBy: { createdAt: "desc" }, take: query.take }),
      app.services.prisma.normalizedSignal.findMany({ orderBy: { ingestedAt: "desc" }, take: query.take }),
      app.services.prisma.providerStatus.findMany({
        where: { provider: { in: ["gdelt", "x_leader_posts", "social_velocity", "prediction_markets", "macro_data", "openai_oracle"] } },
        orderBy: { provider: "asc" }
      })
    ]);
    return {
      oracleCards: cards.map(serializeOracleCard),
      signals: signals.map(serializeSignal),
      providers: providers.map(serializeProvider),
      refreshIntervalMs: app.services.env.ORACLE_REFRESH_INTERVAL_MS,
      policy: "No substitute intelligence cards are generated. Missing providers appear as provider status records."
    };
  };

  app.get("/oracle/latest", latestOracle);
  app.get("/api/oracle/latest", latestOracle);

  const listSignals = async (request: FastifyRequest) => {
    const query = signalQuery.parse(request.query);
    const signals = await app.services.prisma.normalizedSignal.findMany({
      where: {
        sourceType: query.sourceType,
        category: query.category,
        affectedAssets: query.asset ? { has: query.asset } : undefined,
        affectedSectors: query.sector ? { has: query.sector } : undefined
      },
      orderBy: { ingestedAt: "desc" },
      take: query.take
    });
    return { signals: signals.map(serializeSignal) };
  };

  app.get("/signals", listSignals);
  app.get("/api/signals", listSignals);
  registerSignalLane(app, "/signals/geo", "/api/signals/geo", { geoRiskScore: { gte: 0.5 } });
  registerSignalLane(app, "/signals/leaders", "/api/signals/leaders", { sourceType: "x_post" });
  registerSignalLane(app, "/signals/social", "/api/signals/social", { sourceType: "social" });
  registerSignalLane(app, "/signals/news", "/api/signals/news", { sourceType: "news" });
  registerSignalLane(app, "/signals/prediction-markets", "/api/signals/prediction-markets", { sourceType: "prediction_market" });

  const refresh = async (request: FastifyRequest) => {
    const session = await requireSession(request);
    const result = await ingestSignals(app.services.prisma, { env: app.services.env, ai: app.services.ai });
    await auditLog(app.services.prisma, {
      userId: session.userId,
      action: "oracle_refreshed",
      entityType: "OraclePool",
      metadataJson: { signals: result.signals.length, oracleCards: result.oracleCards.length },
      ipAddress: request.ip
    });
    return result;
  };
  app.post("/api/signals/refresh", refresh);

  const heatmap = async (request: FastifyRequest) => {
    const query = heatmapQuery.parse(request.query);
    const assetClass = query.filter === "all" || query.filter === "portfolio"
      ? query.filter
      : z.enum(["equity", "crypto", "forex", "commodity", "index", "etf", "perp"]).parse(query.filter);
    return app.services.marketData.getHeatmapData({
      assetClass,
      metric: query.metric,
      colorMode: query.colorMode,
      symbols: query.symbols?.split(",").filter(Boolean)
    });
  };
  app.get("/heatmap", heatmap);
  app.get("/api/heatmap", heatmap);

  const assetDetail = async (request: FastifyRequest) => {
    const params = z.object({ ticker: z.string().min(1) }).parse(request.params);
    const query = z.object({
      range: z.enum(["1D", "1W", "1M", "3M", "1Y"]).default("1M"),
      assetClass: z.enum(["equity", "crypto", "forex", "commodity", "index", "etf", "perp"]).optional()
    }).parse(request.query);
    const [quote, candles, signals, oracleCards] = await Promise.all([
      app.services.marketData.getQuote(params.ticker, { assetClass: query.assetClass }),
      app.services.marketData.getCandles(params.ticker, query.range === "1D" ? "15min" : "1day", query.range, query.assetClass),
      app.services.prisma.normalizedSignal.findMany({ where: { affectedAssets: { has: params.ticker } }, orderBy: { ingestedAt: "desc" }, take: 12 }),
      app.services.prisma.oracleCard.findMany({ where: { affectedAssets: { has: params.ticker } }, orderBy: { createdAt: "desc" }, take: 8 })
    ]);
    return { quote, candles, signals: signals.map(serializeSignal), oracleCards: oracleCards.map(serializeOracleCard) };
  };
  app.get("/assets/:ticker", assetDetail);
  app.get("/api/assets/:ticker", assetDetail);

  app.get("/api/portfolio", async (request) => {
    try {
      const session = await requireSession(request);
      return { portfolios: await portfolioService.list(session.userId, session.walletAddress), authenticated: true };
    } catch {
      return { portfolios: [], authenticated: false };
    }
  });

  app.get("/api/portfolio/exposure", async (request) => {
    const session = await requireSession(request);
    const portfolios = await portfolioService.list(session.userId, session.walletAddress);
    const positions = portfolios.flatMap((portfolio) => portfolio.positions ?? []);
    const assets = new Map<string, number>();
    const sectors = new Map<string, number>();
    for (const position of positions) {
      const value = Number(position.marketValue ?? 0);
      assets.set(position.symbol, (assets.get(position.symbol) ?? 0) + value);
      sectors.set(position.assetClass, (sectors.get(position.assetClass) ?? 0) + value);
    }
    const totalValue = [...assets.values()].reduce((sum, value) => sum + value, 0);
    return {
      totalValue,
      assets: [...assets.entries()].map(([symbol, value]) => ({ symbol, value, percent: totalValue ? value / totalValue * 100 : 0 })),
      sectors: [...sectors.entries()].map(([sector, value]) => ({ sector, value, percent: totalValue ? value / totalValue * 100 : 0 }))
    };
  });

  app.post("/api/simulation/run", async (request) => {
    const session = await requireSession(request);
    const body = z.object({
      portfolioId: z.string().min(1),
      changes: z.array(z.object({ symbol: z.string().min(1), side: z.enum(["buy", "sell"]), amountUsd: z.number().positive() })).min(1)
    }).parse(request.body);
    const portfolio = await portfolioService.simulate(session.userId, body.portfolioId, body.changes);
    const approval = await app.services.prisma.approvalAction.create({
      data: {
        userId: session.userId,
        walletAddress: session.walletAddress,
        portfolioId: body.portfolioId,
        actionType: "simulation_review",
        status: "pending",
        sourceType: "simulation",
        rationale: "Simulation completed. User must approve before execution is prepared.",
        metadataJson: { changes: body.changes, portfolioId: body.portfolioId }
      }
    });
    await auditLog(app.services.prisma, { userId: session.userId, action: "simulation_run", entityType: "ApprovalAction", entityId: approval.id, metadataJson: { portfolioId: body.portfolioId }, ipAddress: request.ip });
    return { portfolio, approval: serializeApproval(approval) };
  });

  app.get("/api/approval/pending", async (request) => {
    const session = await requireSession(request);
    const approvals = await app.services.prisma.approvalAction.findMany({ where: { userId: session.userId, status: "pending" }, orderBy: { createdAt: "desc" }, take: 50 });
    return { approvals: approvals.map(serializeApproval) };
  });

  app.post("/api/voice/command", async (request, reply) => {
    const session = await optionalSession(request);
    const body = z.object({ commandText: z.string().min(1).max(1000), portfolioId: z.string().optional(), uiState: z.unknown().optional() }).parse(request.body);
    if (!session) {
      await app.services.prisma.voiceCommandHistory.create({ data: { commandText: body.commandText, status: "rejected_unauthenticated" } });
      return reply.status(401).send({ message: "Connect and verify your wallet before using AI voice commands." });
    }
    const portfolioContext = body.portfolioId ? await portfolioService.getOwned(session.userId, body.portfolioId) : undefined;
    const marketContext = portfolioContext?.positions.length ? await app.services.marketData.getBatchQuotes(portfolioContext.positions.map((position) => position.symbol)) : [];
    const response = await app.services.ai.generateVoiceResponse({ userSpeech: body.commandText, portfolioContext, marketContext, uiState: body.uiState });
    await app.services.prisma.voiceCommandHistory.create({
      data: {
        userId: session.userId,
        walletAddress: session.walletAddress,
        commandText: body.commandText,
        responseText: response.text,
        toolName: response.toolCall?.name,
        toolArgsJson: response.toolCall?.arguments ? JSON.parse(JSON.stringify(response.toolCall.arguments)) : undefined,
        status: "completed"
      }
    });
    return response;
  });
}

function registerSignalLane(app: FastifyInstance, path: string, apiPath: string, where: Record<string, unknown>) {
  const handler = async (request: FastifyRequest) => {
    const query = z.object({ take: z.coerce.number().int().min(1).max(100).default(40) }).parse(request.query);
    const signals = await app.services.prisma.normalizedSignal.findMany({ where: where as never, orderBy: { ingestedAt: "desc" }, take: query.take });
    return { signals: signals.map(serializeSignal) };
  };
  app.get(path, handler);
  app.get(apiPath, handler);
}

async function optionalSession(request: Parameters<typeof requireSession>[0]) {
  try {
    return await requireSession(request);
  } catch {
    return undefined;
  }
}

function serializeSignal(row: any) {
  return {
    id: row.id,
    sourceType: row.sourceType,
    sourceName: row.sourceName,
    sourceUrl: row.sourceUrl,
    publishedAt: row.publishedAt?.toISOString?.() ?? row.publishedAt ?? null,
    ingestedAt: row.ingestedAt?.toISOString?.() ?? row.ingestedAt,
    title: row.title,
    rawText: row.rawText,
    summary: row.summary,
    category: row.category,
    entities: row.entitiesJson,
    sentiment: row.sentiment,
    urgencyScore: Number(row.urgencyScore),
    confidenceScore: Number(row.confidenceScore),
    marketImpactScore: Number(row.marketImpactScore),
    geoRiskScore: Number(row.geoRiskScore),
    crowdingScore: row.crowdingScore === null ? null : Number(row.crowdingScore),
    divergenceScore: row.divergenceScore === null ? null : Number(row.divergenceScore),
    affectedAssets: row.affectedAssets,
    affectedSectors: row.affectedSectors,
    suggestedAction: row.suggestedAction,
    timeHorizon: row.timeHorizon,
    portfolioExposure: row.portfolioExposure === null ? null : Number(row.portfolioExposure),
    oracleSummary: row.oracleSummary,
    userAlertRequired: row.userAlertRequired
  };
}

function serializeOracleCard(row: any) {
  return {
    id: row.id,
    signalId: row.signalId,
    title: row.title,
    summary: row.summary,
    whyItMatters: row.whyItMatters,
    sourceType: row.sourceType,
    sourceName: row.sourceName,
    sourceUrl: row.sourceUrl,
    sourceCredibility: Number(row.sourceCredibility),
    publishedAt: row.publishedAt?.toISOString?.() ?? row.publishedAt ?? null,
    affectedCountries: row.affectedCountries,
    affectedSectors: row.affectedSectors,
    affectedAssets: row.affectedAssets,
    direction: row.direction,
    urgencyScore: Number(row.urgencyScore),
    confidenceScore: Number(row.confidenceScore),
    marketImpactScore: Number(row.marketImpactScore),
    geoRiskScore: Number(row.geoRiskScore),
    timeHorizon: row.timeHorizon,
    suggestedAction: row.suggestedAction,
    portfolioExposure: row.portfolioExposure === null ? null : Number(row.portfolioExposure),
    marketAlreadyPricing: row.marketAlreadyPricing,
    predictionDivergence: row.predictionDivergence === null ? null : Number(row.predictionDivergence),
    crowdingScore: row.crowdingScore === null ? null : Number(row.crowdingScore),
    majorityReport: row.majorityReport,
    contrarianView: row.contrarianView,
    createdAt: row.createdAt?.toISOString?.() ?? row.createdAt
  };
}

function serializeProvider(row: any) {
  return { provider: row.provider, status: row.status, lastCheckedAt: row.lastCheckedAt?.toISOString?.() ?? row.lastCheckedAt, message: row.message, latencyMs: row.latencyMs };
}

function serializeApproval(row: any) {
  return {
    id: row.id,
    walletAddress: row.walletAddress,
    portfolioId: row.portfolioId,
    actionType: row.actionType,
    status: row.status,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    simulationId: row.simulationId,
    orderIntentId: row.orderIntentId,
    rationale: row.rationale,
    metadata: row.metadataJson,
    approvedAt: row.approvedAt?.toISOString?.() ?? row.approvedAt ?? null,
    rejectedAt: row.rejectedAt?.toISOString?.() ?? row.rejectedAt ?? null,
    createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
    updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt
  };
}
