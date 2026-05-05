import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireSession } from "../security/session";
import { auditLog } from "../security/audit";
import { ingestSignals } from "./ingestion";

export async function registerSignalRoutes(app: FastifyInstance) {
  app.get("/signals/latest", async () => {
    const signals = await app.services.prisma.aISignal.findMany({ orderBy: { createdAt: "desc" }, take: 25 });
    return { signals };
  });

  app.get("/signals/events", async (request) => {
    const query = z.object({ symbol: z.string().optional(), riskType: z.string().optional() }).parse(request.query);
    const events = await app.services.prisma.newsEvent.findMany({
      where: {
        affectedSymbols: query.symbol ? { has: query.symbol } : undefined,
        riskType: query.riskType
      },
      orderBy: { detectedAt: "desc" },
      take: 50
    });
    return { events };
  });

  app.get("/signals/asset/:symbol", async (request) => {
    const params = z.object({ symbol: z.string().min(1) }).parse(request.params);
    const [signals, events] = await Promise.all([
      app.services.prisma.aISignal.findMany({ where: { symbol: params.symbol }, orderBy: { createdAt: "desc" }, take: 10 }),
      app.services.prisma.newsEvent.findMany({ where: { affectedSymbols: { has: params.symbol } }, orderBy: { detectedAt: "desc" }, take: 10 })
    ]);
    return { signals, events };
  });

  app.post("/signals/refresh", async (request) => {
    const session = await requireSession(request);
    const result = await ingestSignals(app.services.prisma, { env: app.services.env, ai: app.services.ai });
    await auditLog(app.services.prisma, {
      userId: session.userId,
      action: "signals_refreshed",
      entityType: "OraclePool",
      metadataJson: { signals: result.signals.length, oracleCards: result.oracleCards.length },
      ipAddress: request.ip
    });
    return result;
  });
}
