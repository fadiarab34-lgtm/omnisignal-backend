import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createMessagingLinkCode, getPremiumEntitlements } from "../billing/routes";
import { requireSession } from "../security/session";

const telegramUpdateSchema = z.object({
  message: z.object({
    text: z.string().optional(),
    chat: z.object({ id: z.union([z.string(), z.number()]) })
  }).optional()
});

export async function registerTelegramRoutes(app: FastifyInstance) {
  app.get("/messaging/telegram/status", async (request) => {
    const session = await requireSession(request);
    const link = await app.services.prisma.messagingLink.findFirst({
      where: { userId: session.userId, walletAddress: session.walletAddress, provider: "telegram" },
      orderBy: { createdAt: "desc" }
    });
    return {
      configured: Boolean(app.services.env.TELEGRAM_BOT_TOKEN && app.services.env.TELEGRAM_BOT_USERNAME && app.services.env.TELEGRAM_WEBHOOK_SECRET),
      link: link ? {
        status: link.status,
        linkedAt: link.linkedAt?.toISOString() ?? null,
        expiresAt: link.expiresAt.toISOString()
      } : null
    };
  });

  app.post("/messaging/telegram/link-code", async (request, reply) => {
    const session = await requireSession(request);
    const entitlements = await getPremiumEntitlements(app, session);
    if (!entitlements.messagingAi) {
      return reply.status(402).send({ error: "PremiumRequired", message: "Telegram AI is available for Premium wallets." });
    }
    if (!app.services.env.TELEGRAM_BOT_TOKEN || !app.services.env.TELEGRAM_BOT_USERNAME || !app.services.env.TELEGRAM_WEBHOOK_SECRET) {
      return reply.status(503).send({ error: "MissingConfiguration", message: "Telegram bot token, bot username, or webhook secret is missing." });
    }
    const code = createMessagingLinkCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await app.services.prisma.messagingLink.create({
      data: {
        userId: session.userId,
        walletAddress: session.walletAddress,
        provider: "telegram",
        linkCode: code,
        status: "pending",
        expiresAt
      }
    });
    return {
      code,
      expiresAt: expiresAt.toISOString(),
      telegramUrl: `https://t.me/${app.services.env.TELEGRAM_BOT_USERNAME}?start=${code}`
    };
  });

  app.post("/messaging/telegram/webhook", async (request, reply) => {
    if (!app.services.env.TELEGRAM_BOT_TOKEN || !app.services.env.TELEGRAM_WEBHOOK_SECRET) {
      return reply.status(503).send({ error: "MissingConfiguration", message: "Telegram is not configured." });
    }
    if (request.headers["x-telegram-bot-api-secret-token"] !== app.services.env.TELEGRAM_WEBHOOK_SECRET) {
      return reply.status(401).send({ error: "InvalidTelegramSecret", message: "Telegram webhook secret did not match." });
    }
    const update = telegramUpdateSchema.parse(request.body);
    const chatId = update.message?.chat.id;
    const text = update.message?.text?.trim();
    if (!chatId || !text) return { ok: true };

    const startCode = text.match(/^\/start\s+([A-Z0-9]+)/i)?.[1]?.toUpperCase();
    if (startCode) {
      const link = await app.services.prisma.messagingLink.findFirst({
        where: { provider: "telegram", linkCode: startCode, status: "pending", expiresAt: { gt: new Date() } }
      });
      if (!link) {
        await sendTelegram(app, String(chatId), "This OmniSignal link code is expired or invalid. Generate a new code in Settings.");
        return { ok: true };
      }
      await app.services.prisma.messagingLink.update({
        where: { id: link.id },
        data: { externalChatId: String(chatId), status: "linked", linkedAt: new Date() }
      });
      await sendTelegram(app, String(chatId), "OmniSignal Premium AI is linked to your wallet. Ask about your portfolio, risk, heatmap, or market moves.");
      return { ok: true };
    }

    const link = await app.services.prisma.messagingLink.findFirst({
      where: { provider: "telegram", externalChatId: String(chatId), status: "linked" },
      orderBy: { linkedAt: "desc" }
    });
    if (!link) {
      await sendTelegram(app, String(chatId), "Link your Premium wallet in OmniSignal Settings before using Telegram AI.");
      return { ok: true };
    }

    const subscription = await app.services.prisma.premiumSubscription.findUnique({
      where: { userId_walletAddress_plan: { userId: link.userId, walletAddress: link.walletAddress, plan: "premium" } }
    });
    if (!subscription || subscription.status !== "active" || subscription.expiresAt <= new Date()) {
      await sendTelegram(app, String(chatId), "Your OmniSignal Premium subscription is not active. Upgrade in the portal to use Telegram AI.");
      return { ok: true };
    }

    try {
      const portfolio = await app.services.prisma.portfolio.findFirst({
        where: { userId: link.userId, walletAddress: link.walletAddress },
        include: { positions: true },
        orderBy: { updatedAt: "desc" }
      });
      const response = await app.services.ai.generateVoiceResponse({
        userSpeech: text,
        portfolioContext: portfolio ? {
          id: portfolio.id,
          name: portfolio.name,
          totalValue: Number(portfolio.totalValue),
          dailyChangeAmount: Number(portfolio.dailyChangeAmount),
          dailyChangePercent: Number(portfolio.dailyChangePercent),
          riskScore: portfolio.riskScore ? Number(portfolio.riskScore) : null,
          positions: portfolio.positions.map((position) => ({
            symbol: position.symbol,
            assetClass: position.assetClass,
            quantity: Number(position.quantity),
            currentPrice: Number(position.currentPrice),
            marketValue: Number(position.marketValue),
            allocationPercent: Number(position.allocationPercent),
            dailyChangePercent: Number(position.dailyChangePercent)
          }))
        } : undefined
      });
      await sendTelegram(app, String(chatId), response.text || "OmniSignal AI returned an empty response.");
    } catch (error) {
      await sendTelegram(app, String(chatId), error instanceof Error ? error.message : "OmniSignal AI is unavailable.");
    }
    return { ok: true };
  });
}

async function sendTelegram(app: FastifyInstance, chatId: string, text: string) {
  const response = await fetch(`https://api.telegram.org/bot${app.services.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 3500) })
  });
  if (!response.ok) {
    app.log.warn({ status: response.status, body: await response.text() }, "Telegram sendMessage failed");
  }
}
