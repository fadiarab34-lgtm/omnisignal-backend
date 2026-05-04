import type { FastifyInstance } from "fastify";
import { createRealtimeVoiceSession } from "@omnisignal/ai";
import { z } from "zod";
import { requireSession } from "../security/session";
import { PortfolioService } from "../portfolio/service";
import { auditLog } from "../security/audit";
import { toNewsEventContext } from "./context";

export async function registerAiRoutes(app: FastifyInstance) {
  const portfolioService = new PortfolioService(app.services.prisma, app.services.marketData);

  app.post("/ai/analyze/asset", async (request) => {
    const body = z.object({
      symbol: z.string().min(1),
      assetClass: z.enum(["equity", "crypto", "forex", "commodity", "index", "etf", "perp"]).optional(),
      portfolioId: z.string().optional(),
      range: z.enum(["1D", "1W", "1M", "3M", "1Y"]).default("1M")
    }).parse(request.body);
    const session = await optionalSession(request);
    const [asset, candles, newsEvents] = await Promise.all([
      app.services.marketData.getQuote(body.symbol, { assetClass: body.assetClass }),
      app.services.marketData.getCandles(body.symbol, body.range === "1D" ? "15min" : "1day", body.range, body.assetClass),
      app.services.prisma.newsEvent.findMany({ where: { affectedSymbols: { has: body.symbol } }, orderBy: { detectedAt: "desc" }, take: 10 })
    ]);
    const portfolioContext = session && body.portfolioId ? await portfolioService.getOwned(session.userId, body.portfolioId) : undefined;
    const analysis = await app.services.ai.analyzeAsset({ asset, candles, newsEvents: newsEvents.map(toNewsEventContext), portfolioContext });
    await app.services.prisma.aISignal.create({
      data: {
        userId: session?.userId,
        portfolioId: body.portfolioId,
        symbol: body.symbol,
        type: "asset_analysis",
        headline: analysis.headline,
        summary: analysis.summary,
        signal: analysis.signal,
        confidence: analysis.confidence,
        rawJson: analysis
      }
    });
    return { analysis };
  });

  app.post("/ai/analyze/portfolio", async (request) => {
    const session = await requireSession(request);
    const body = z.object({ portfolioId: z.string().min(1) }).parse(request.body);
    const portfolio = await portfolioService.getOwned(session.userId, body.portfolioId);
    const marketData = portfolio.positions.length ? await app.services.marketData.getBatchQuotes(portfolio.positions.map((position) => position.symbol)) : [];
    const newsEvents = await app.services.prisma.newsEvent.findMany({
      where: portfolio.positions.length ? { affectedSymbols: { hasSome: portfolio.positions.map((position) => position.symbol) } } : undefined,
      orderBy: { detectedAt: "desc" },
      take: 15
    });
    const analysis = await app.services.ai.analyzePortfolio({ portfolio, marketData, newsEvents: newsEvents.map(toNewsEventContext) });
    await app.services.prisma.aISignal.create({
      data: {
        userId: session.userId,
        portfolioId: body.portfolioId,
        type: "portfolio_analysis",
        headline: analysis.headline,
        summary: analysis.summary,
        signal: analysis.overallSignal,
        confidence: 1,
        rawJson: analysis
      }
    });
    for (const nudge of analysis.nudges.slice(0, 3)) {
      await app.services.prisma.aINudge.create({
        data: {
          userId: session.userId,
          portfolioId: body.portfolioId,
          severity: nudge.severity,
          title: nudge.title,
          message: nudge.message,
          actionLabel: nudge.actionLabel,
          linkedSymbols: nudge.linkedSymbols ?? []
        }
      });
    }
    return { analysis };
  });

  app.post("/ai/nudge", async (request) => {
    const session = await requireSession(request);
    const body = z.object({ eventId: z.string().min(1), portfolioId: z.string().optional() }).parse(request.body);
    const event = await app.services.prisma.newsEvent.findUniqueOrThrow({ where: { id: body.eventId } });
    const portfolioContext = body.portfolioId ? await portfolioService.getOwned(session.userId, body.portfolioId) : { positions: [] };
    const nudge = await app.services.ai.generateNudge({ event: toNewsEventContext(event), portfolioContext });
    const stored = await app.services.prisma.aINudge.create({
      data: {
        userId: session.userId,
        portfolioId: body.portfolioId,
        severity: nudge.severity,
        title: nudge.title,
        message: nudge.message,
        actionLabel: nudge.actionLabel,
        linkedSymbols: nudge.linkedSymbols ?? []
      }
    });
    return { nudge: stored };
  });

  app.post("/ai/explain-order", async (request) => {
    const session = await requireSession(request);
    const body = z.object({ orderIntentId: z.string().min(1) }).parse(request.body);
    const orderIntent = await app.services.prisma.orderIntent.findFirstOrThrow({ where: { id: body.orderIntentId, userId: session.userId } });
    const explanation = await app.services.ai.explainTradeIntent({ orderIntent, riskProfile: { mode: orderIntent.mode, status: orderIntent.status } });
    return explanation;
  });

  app.post("/ai/voice/session", async (request) => {
    const session = await requireSession(request);
    const body = z.object({ portfolioId: z.string().optional(), uiState: z.unknown().optional() }).parse(request.body);
    const portfolioContext = body.portfolioId ? await portfolioService.getOwned(session.userId, body.portfolioId) : undefined;
    const marketContext = portfolioContext?.positions.length ? await app.services.marketData.getBatchQuotes(portfolioContext.positions.map((position) => position.symbol)) : [];
    const realtimeSession = await createRealtimeVoiceSession({
      apiKey: app.services.env.OPENAI_API_KEY,
      realtimeModel: app.services.env.OPENAI_REALTIME_MODEL,
      portfolioContext,
      marketContext,
      uiState: body.uiState
    });
    await auditLog(app.services.prisma, { userId: session.userId, action: "voice_session_created", entityType: "VoiceSession", metadataJson: { portfolioId: body.portfolioId }, ipAddress: request.ip });
    return { session: realtimeSession };
  });
}

async function optionalSession(request: Parameters<typeof requireSession>[0]) {
  try {
    return await requireSession(request);
  } catch {
    return undefined;
  }
}
