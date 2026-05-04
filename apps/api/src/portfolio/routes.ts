import type { FastifyInstance } from "fastify";
import { createPortfolioSchema, createPositionSchema, simulatePortfolioSchema } from "@omnisignal/shared";
import { auditLog } from "../security/audit";
import { requireSession } from "../security/session";
import { PortfolioService } from "./service";
import { toNewsEventContext } from "../ai/context";
import { getPremiumEntitlements } from "../billing/routes";

export async function registerPortfolioRoutes(app: FastifyInstance) {
  const service = new PortfolioService(app.services.prisma, app.services.marketData);

  app.get("/portfolio", async (request) => {
    try {
      const session = await requireSession(request);
      return { portfolios: await service.list(session.userId, session.walletAddress) };
    } catch {
      return { portfolios: [], authenticated: false };
    }
  });

  app.post("/portfolio", async (request, reply) => {
    const session = await requireSession(request);
    const body = createPortfolioSchema.parse(request.body);
    const [entitlements, portfolioCount] = await Promise.all([
      getPremiumEntitlements(app, session),
      app.services.prisma.portfolio.count({ where: { userId: session.userId, walletAddress: session.walletAddress } })
    ]);
    if (portfolioCount >= entitlements.maxPortfolios) {
      return reply.status(402).send({
        error: "PremiumRequired",
        message: "Free wallets can create one portfolio. Upgrade to Premium to create more portfolios.",
        entitlements
      });
    }
    const portfolio = await service.create(session.userId, session.walletAddress, { name: body.name, mode: body.mode });
    await auditLog(app.services.prisma, { userId: session.userId, action: "portfolio_created", entityType: "Portfolio", entityId: portfolio.id, metadataJson: { mode: portfolio.mode }, ipAddress: request.ip });
    return { portfolio };
  });

  app.get("/portfolio/:id", async (request) => {
    const session = await requireSession(request);
    const { id } = request.params as { id: string };
    return { portfolio: await service.getOwned(session.userId, id) };
  });

  app.post("/portfolio/:id/positions", async (request) => {
    const session = await requireSession(request);
    const { id } = request.params as { id: string };
    const body = createPositionSchema.parse(request.body);
    const portfolio = await service.addPosition(session.userId, id, body);
    await auditLog(app.services.prisma, { userId: session.userId, action: "position_added", entityType: "Portfolio", entityId: id, metadataJson: { symbol: body.symbol }, ipAddress: request.ip });
    return { portfolio };
  });

  app.patch("/portfolio/:id/positions/:positionId", async (request) => {
    const session = await requireSession(request);
    const { id, positionId } = request.params as { id: string; positionId: string };
    const body = createPositionSchema.partial().parse(request.body);
    await app.services.prisma.position.updateMany({
      where: { id: positionId, portfolio: { id, userId: session.userId } },
      data: {
        quantity: body.quantity === undefined ? undefined : body.quantity,
        avgCost: body.avgCost === undefined ? undefined : body.avgCost
      }
    });
    await auditLog(app.services.prisma, { userId: session.userId, action: "position_updated", entityType: "Position", entityId: positionId, metadataJson: body, ipAddress: request.ip });
    return { portfolio: await service.refresh(id, session.userId) };
  });

  app.delete("/portfolio/:id/positions/:positionId", async (request) => {
    const session = await requireSession(request);
    const { id, positionId } = request.params as { id: string; positionId: string };
    await app.services.prisma.position.deleteMany({ where: { id: positionId, portfolio: { id, userId: session.userId } } });
    await auditLog(app.services.prisma, { userId: session.userId, action: "position_deleted", entityType: "Position", entityId: positionId, metadataJson: {}, ipAddress: request.ip });
    return { portfolio: await service.refresh(id, session.userId) };
  });

  app.post("/portfolio/:id/simulate", async (request) => {
    const session = await requireSession(request);
    const { id } = request.params as { id: string };
    const body = simulatePortfolioSchema.parse(request.body);
    const portfolio = await service.simulate(session.userId, id, body.changes);
    await auditLog(app.services.prisma, { userId: session.userId, action: "portfolio_simulated", entityType: "Portfolio", entityId: id, metadataJson: body, ipAddress: request.ip });
    return { portfolio };
  });

  app.post("/portfolio/:id/rebalance", async (request) => {
    const session = await requireSession(request);
    const { id } = request.params as { id: string };
    const body = simulatePortfolioSchema.parse(request.body);
    const portfolio = await service.simulate(session.userId, id, body.changes);
    await auditLog(app.services.prisma, { userId: session.userId, action: "portfolio_rebalanced", entityType: "Portfolio", entityId: id, metadataJson: body, ipAddress: request.ip });
    return { portfolio };
  });

  app.post("/portfolio/:id/reset-simulation", async (request) => {
    const session = await requireSession(request);
    const { id } = request.params as { id: string };
    const portfolio = await service.resetSimulation(session.userId, id);
    await auditLog(app.services.prisma, { userId: session.userId, action: "portfolio_simulation_reset", entityType: "Portfolio", entityId: id, metadataJson: {}, ipAddress: request.ip });
    return { portfolio };
  });

  app.get("/portfolio/:id/analysis", async (request) => {
    const session = await requireSession(request);
    const { id } = request.params as { id: string };
    const portfolio = await service.getOwned(session.userId, id);
    const symbols = portfolio.positions.map((position) => position.symbol);
    const marketData = symbols.length ? await app.services.marketData.getBatchQuotes(symbols) : [];
    const newsEvents = await app.services.prisma.newsEvent.findMany({
      where: symbols.length ? { affectedSymbols: { hasSome: symbols } } : undefined,
      orderBy: { detectedAt: "desc" },
      take: 10
    });
    const analysis = await app.services.ai.analyzePortfolio({ portfolio, marketData, newsEvents: newsEvents.map(toNewsEventContext) });
    const entitlements = await getPremiumEntitlements(app, session);
    for (const nudge of analysis.nudges.slice(0, entitlements.maxNudges)) {
      await app.services.prisma.aINudge.create({
        data: {
          userId: session.userId,
          portfolioId: id,
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
}
