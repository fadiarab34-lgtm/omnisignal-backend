import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { orderIntentSchema } from "@omnisignal/shared";
import { auditLog } from "../security/audit";
import { requireSession } from "../security/session";

export async function registerTradingRoutes(app: FastifyInstance) {
  app.post("/trading/estimate", async (request) => {
    await requireSession(request);
    const body = z.object({
      symbol: z.string().min(1),
      side: z.enum(["buy", "sell"]),
      orderType: z.enum(["market", "limit"]).default("market"),
      amountUsd: z.number().positive().optional(),
      quantity: z.number().positive().optional(),
      mode: z.enum(["simulation", "testnet", "mainnet"]).default("testnet")
    }).parse(request.body);
    if (body.mode === "simulation") {
      const quote = await app.services.marketData.getQuote(body.symbol);
      const quantity = body.quantity ?? (body.amountUsd ? body.amountUsd / quote.price : 0);
      return {
        estimate: {
          symbol: quote.symbol,
          side: body.side,
          orderType: body.orderType,
          amountUsd: body.amountUsd ?? quantity * quote.price,
          quantity,
          estimatedPrice: quote.price,
          estimatedFees: 0,
          estimatedSlippage: 0,
          mode: "simulation",
          provider: quote.provider,
          warnings: ["Simulation Mode uses live market prices and does not execute an order."]
        }
      };
    }
    return {
      estimate: await app.services.trading.estimateOrder(body.symbol, body.side, { amountUsd: body.amountUsd, quantity: body.quantity }, body.orderType)
    };
  });

  app.post("/trading/order-intent", async (request) => {
    const session = await requireSession(request);
    const body = orderIntentSchema.parse(request.body);
    const recent = await app.services.prisma.orderIntent.findFirst({
      where: {
        userId: session.userId,
        walletAddress: session.walletAddress,
        symbol: body.symbol,
        side: body.side,
        status: "pending_confirmation",
        createdAt: { gt: new Date(Date.now() - 15_000) }
      }
    });
    if (recent) return { orderIntent: recent, duplicatePrevented: true };
    const estimate = body.mode === "simulation"
      ? await simulationEstimate()
      : await app.services.trading.estimateOrder(body.symbol, body.side, { amountUsd: body.amountUsd, quantity: body.quantity }, body.orderType);
    const orderIntent = await app.services.prisma.orderIntent.create({
      data: {
        userId: session.userId,
        walletAddress: session.walletAddress,
        portfolioId: body.portfolioId,
        symbol: body.symbol,
        side: body.side,
        orderType: body.orderType,
        amountUsd: body.amountUsd,
        quantity: body.quantity ?? estimate.quantity,
        estimatedPrice: estimate.estimatedPrice,
        estimatedFees: estimate.estimatedFees,
        estimatedSlippage: estimate.estimatedSlippage,
        status: "pending_confirmation",
        mode: body.mode,
        aiGenerated: false
      }
    });
    await auditLog(app.services.prisma, { userId: session.userId, action: "order_intent_created", entityType: "OrderIntent", entityId: orderIntent.id, metadataJson: { symbol: body.symbol, mode: body.mode }, ipAddress: request.ip });
    return { orderIntent };

    async function simulationEstimate() {
      const quote = await app.services.marketData.getQuote(body.symbol);
      const quantity = body.quantity ?? (body.amountUsd ? body.amountUsd / quote.price : 0);
      return {
        estimatedPrice: quote.price,
        estimatedFees: 0,
        estimatedSlippage: 0,
        amountUsd: body.amountUsd ?? quantity * quote.price,
        quantity
      };
    }
  });

  app.post("/trading/confirm-testnet", async (request) => {
    const session = await requireSession(request);
    const body = z.object({ orderIntentId: z.string().min(1) }).parse(request.body);
    const orderIntent = await app.services.prisma.orderIntent.update({
      where: { id: body.orderIntentId },
      data: { userConfirmedAt: new Date(), status: "confirmed" }
    });
    if (orderIntent.userId !== session.userId || orderIntent.mode !== "testnet") {
      return { error: "OrderModeMismatch", message: "Order intent is not a testnet order for this user." };
    }
    const response = await app.services.trading.placeTestnetOrder({
      id: orderIntent.id,
      userId: orderIntent.userId,
      walletAddress: orderIntent.walletAddress,
      symbol: orderIntent.symbol,
      side: orderIntent.side,
      orderType: orderIntent.orderType,
      amountUsd: Number(orderIntent.amountUsd ?? 0),
      quantity: Number(orderIntent.quantity ?? 0),
      mode: orderIntent.mode,
      userConfirmedAt: orderIntent.userConfirmedAt
    });
    const executedOrder = await app.services.prisma.executedOrder.create({
      data: {
        orderIntentId: orderIntent.id,
        provider: "hyperliquid",
        status: "submitted",
        rawResponse: toJson(response)
      }
    });
    await auditLog(app.services.prisma, { userId: session.userId, action: "testnet_order_submitted", entityType: "ExecutedOrder", entityId: executedOrder.id, metadataJson: { orderIntentId: orderIntent.id }, ipAddress: request.ip });
    return { orderIntent, executedOrder };
  });

  app.post("/trading/confirm-mainnet", async (request) => {
    const session = await requireSession(request);
    const body = z.object({ orderIntentId: z.string().min(1) }).parse(request.body);
    const orderIntent = await app.services.prisma.orderIntent.update({
      where: { id: body.orderIntentId },
      data: { userConfirmedAt: new Date(), status: "confirmed" }
    });
    if (orderIntent.userId !== session.userId || orderIntent.mode !== "mainnet") {
      return { error: "OrderModeMismatch", message: "Order intent is not a mainnet order for this user." };
    }
    const response = await app.services.trading.placeMainnetOrder({
      id: orderIntent.id,
      userId: orderIntent.userId,
      walletAddress: orderIntent.walletAddress,
      symbol: orderIntent.symbol,
      side: orderIntent.side,
      orderType: orderIntent.orderType,
      amountUsd: Number(orderIntent.amountUsd ?? 0),
      quantity: Number(orderIntent.quantity ?? 0),
      mode: orderIntent.mode,
      userConfirmedAt: orderIntent.userConfirmedAt
    });
    const executedOrder = await app.services.prisma.executedOrder.create({
      data: {
        orderIntentId: orderIntent.id,
        provider: "hyperliquid",
        status: "submitted",
        rawResponse: toJson(response)
      }
    });
    await auditLog(app.services.prisma, { userId: session.userId, action: "mainnet_order_submitted", entityType: "ExecutedOrder", entityId: executedOrder.id, metadataJson: { orderIntentId: orderIntent.id }, ipAddress: request.ip });
    return { orderIntent, executedOrder };
  });

  app.get("/trading/orders", async (request) => {
    const session = await requireSession(request);
    const orders = await app.services.prisma.orderIntent.findMany({
      where: { userId: session.userId },
      include: { executedOrders: true },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    return { orders };
  });

  app.get("/trading/fills", async (request) => {
    const session = await requireSession(request);
    return { fills: await app.services.trading.getFills(session.walletAddress) };
  });

  app.post("/trading/cancel", async (request) => {
    const session = await requireSession(request);
    const body = z.object({ orderIntentId: z.string().min(1) }).parse(request.body);
    const order = await app.services.prisma.orderIntent.findFirstOrThrow({ where: { id: body.orderIntentId, userId: session.userId } });
    const response = await app.services.trading.cancelOrder(order.id);
    await app.services.prisma.orderIntent.update({ where: { id: order.id }, data: { status: "cancel_requested" } });
    await auditLog(app.services.prisma, { userId: session.userId, action: "order_cancel_requested", entityType: "OrderIntent", entityId: order.id, metadataJson: response, ipAddress: request.ip });
    return { response };
  });
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
