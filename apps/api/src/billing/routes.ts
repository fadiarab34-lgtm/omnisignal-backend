import type { FastifyInstance } from "fastify";
import { Interface, JsonRpcProvider, getAddress, parseUnits } from "ethers";
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auditLog } from "../security/audit";
import { requireSession, type SessionPayload } from "../security/session";

const confirmPaymentSchema = z.object({
  paymentId: z.string().min(1),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/)
});

const transferInterface = new Interface([
  "event Transfer(address indexed from,address indexed to,uint256 value)"
]);

export type PremiumEntitlements = {
  premium: boolean;
  plan: "free" | "premium";
  maxPortfolios: number;
  maxNudges: number;
  liveUpdates: boolean;
  messagingAi: boolean;
  expiresAt?: string;
};

export async function registerBillingRoutes(app: FastifyInstance) {
  app.get("/billing/subscription", async (request) => {
    const session = await requireSession(request);
    return {
      subscription: await getPremiumEntitlements(app, session),
      payments: await getRecentPayments(app, session)
    };
  });

  app.post("/billing/payment-intent", async (request, reply) => {
    const session = await requireSession(request);
    const config = getPremiumPaymentConfig(app);
    if (!config.configured) {
      return reply.status(503).send({
        error: "MissingConfiguration",
        message: config.message
      });
    }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const payment = await app.services.prisma.payment.create({
      data: {
        userId: session.userId,
        walletAddress: session.walletAddress,
        provider: "metamask",
        network: config.networkName,
        chainId: config.chainId,
        tokenSymbol: config.tokenSymbol,
        tokenAddress: config.tokenAddress,
        treasuryAddress: config.treasuryAddress,
        expectedAmountToken: new Prisma.Decimal(config.priceUsd),
        amountUsd: new Prisma.Decimal(config.priceUsd),
        status: "pending",
        expiresAt,
        rawJson: toJson({
          chainId: config.chainId,
          tokenSymbol: config.tokenSymbol,
          tokenAddress: config.tokenAddress,
          tokenDecimals: config.tokenDecimals,
          treasuryAddress: config.treasuryAddress,
          subscriptionDays: config.subscriptionDays
        })
      }
    });

    await auditLog(app.services.prisma, {
      userId: session.userId,
      action: "premium_payment_intent_created",
      entityType: "Payment",
      entityId: payment.id,
      metadataJson: { walletAddress: session.walletAddress, network: config.networkName, tokenSymbol: config.tokenSymbol, amountUsd: config.priceUsd },
      ipAddress: request.ip
    });

    return {
      paymentIntent: {
        id: payment.id,
        walletAddress: session.walletAddress,
        amountUsd: config.priceUsd,
        amountToken: String(config.priceUsd),
        amountBaseUnits: config.amountBaseUnits,
        chainId: config.chainId,
        chainName: config.networkName,
        tokenSymbol: config.tokenSymbol,
        tokenAddress: config.tokenAddress,
        tokenDecimals: config.tokenDecimals,
        treasuryAddress: config.treasuryAddress,
        expiresAt: expiresAt.toISOString(),
        subscriptionDays: config.subscriptionDays
      }
    };
  });

  app.post("/billing/confirm-wallet-payment", async (request, reply) => {
    const session = await requireSession(request);
    const body = confirmPaymentSchema.parse(request.body);
    const config = getPremiumPaymentConfig(app);
    if (!config.configured) {
      return reply.status(503).send({ error: "MissingConfiguration", message: config.message });
    }

    const payment = await app.services.prisma.payment.findFirst({
      where: {
        id: body.paymentId,
        userId: session.userId,
        walletAddress: session.walletAddress
      }
    });
    if (!payment) return reply.status(404).send({ error: "PaymentNotFound", message: "Payment intent was not found for this wallet." });
    if (payment.status === "confirmed") return { subscription: await getPremiumEntitlements(app, session), payment: toPaymentDto(payment) };
    if (payment.expiresAt < new Date()) return reply.status(400).send({ error: "PaymentExpired", message: "Payment intent expired. Create a new premium payment." });

    const existingHash = await app.services.prisma.payment.findFirst({ where: { txHash: body.txHash, NOT: { id: payment.id } } });
    if (existingHash) return reply.status(409).send({ error: "TransactionAlreadyUsed", message: "This transaction hash has already been used." });

    const verification = await verifyErc20Payment(config, session.walletAddress, body.txHash);
    if (!verification.valid) {
      await app.services.prisma.payment.update({
        where: { id: payment.id },
        data: { status: "verification_failed", txHash: body.txHash, rawJson: toJson({ reason: verification.message }) }
      });
      return reply.status(400).send({ error: "PaymentVerificationFailed", message: verification.message });
    }

    const subscription = await app.services.prisma.$transaction(async (tx) => {
      const now = new Date();
      const current = await tx.premiumSubscription.findUnique({
        where: {
          userId_walletAddress_plan: {
            userId: session.userId,
            walletAddress: session.walletAddress,
            plan: "premium"
          }
        }
      });
      const base = current && current.expiresAt > now ? current.expiresAt : now;
      const expiresAt = new Date(base.getTime() + config.subscriptionDays * 24 * 60 * 60 * 1000);
      const saved = await tx.premiumSubscription.upsert({
        where: {
          userId_walletAddress_plan: {
            userId: session.userId,
            walletAddress: session.walletAddress,
            plan: "premium"
          }
        },
        update: { status: "active", expiresAt },
        create: {
          userId: session.userId,
          walletAddress: session.walletAddress,
          plan: "premium",
          status: "active",
          startedAt: now,
          expiresAt
        }
      });
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          subscriptionId: saved.id,
          status: "confirmed",
          txHash: body.txHash,
          confirmedAt: now,
          rawJson: toJson(verification)
        }
      });
      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: "premium_subscription_activated",
          entityType: "PremiumSubscription",
          entityId: saved.id,
          metadataJson: toJson({ txHash: body.txHash, walletAddress: session.walletAddress, amountUsd: config.priceUsd, tokenSymbol: config.tokenSymbol }),
          ipAddress: request.ip
        }
      });
      return saved;
    });

    return {
      subscription: {
        premium: true,
        plan: subscription.plan,
        status: subscription.status,
        expiresAt: subscription.expiresAt.toISOString()
      }
    };
  });
}

export async function getPremiumEntitlements(app: FastifyInstance, session: SessionPayload): Promise<PremiumEntitlements> {
  const subscription = await app.services.prisma.premiumSubscription.findUnique({
    where: {
      userId_walletAddress_plan: {
        userId: session.userId,
        walletAddress: session.walletAddress,
        plan: "premium"
      }
    }
  });
  const active = Boolean(subscription && subscription.status === "active" && subscription.expiresAt > new Date());
  return active
    ? {
        premium: true,
        plan: "premium",
        maxPortfolios: 25,
        maxNudges: 10,
        liveUpdates: true,
        messagingAi: true,
        expiresAt: subscription!.expiresAt.toISOString()
      }
    : {
        premium: false,
        plan: "free",
        maxPortfolios: 1,
        maxNudges: 3,
        liveUpdates: false,
        messagingAi: false
      };
}

function getPremiumPaymentConfig(app: FastifyInstance) {
  const env = app.services.env;
  const missing = [
    ["PREMIUM_TREASURY_ADDRESS", env.PREMIUM_TREASURY_ADDRESS],
    ["PREMIUM_PAYMENT_CHAIN_ID", env.PREMIUM_PAYMENT_CHAIN_ID],
    ["PREMIUM_PAYMENT_TOKEN_ADDRESS", env.PREMIUM_PAYMENT_TOKEN_ADDRESS],
    ["PREMIUM_PAYMENT_TOKEN_DECIMALS", env.PREMIUM_PAYMENT_TOKEN_DECIMALS],
    ["EVM_RPC_URL", env.EVM_RPC_URL]
  ].filter(([, value]) => value === undefined || value === "");
  if (missing.length) {
    return {
      configured: false as const,
      message: `Missing premium payment configuration: ${missing.map(([key]) => key).join(", ")}`
    };
  }
  const tokenDecimals = Number(env.PREMIUM_PAYMENT_TOKEN_DECIMALS);
  const priceUsd = env.PREMIUM_PRICE_USD;
  return {
    configured: true as const,
    priceUsd,
    subscriptionDays: env.PREMIUM_SUBSCRIPTION_DAYS,
    treasuryAddress: getAddress(env.PREMIUM_TREASURY_ADDRESS!),
    chainId: normalizeChainId(env.PREMIUM_PAYMENT_CHAIN_ID!),
    networkName: env.PREMIUM_PAYMENT_NETWORK_NAME,
    tokenSymbol: env.PREMIUM_PAYMENT_TOKEN_SYMBOL,
    tokenAddress: getAddress(env.PREMIUM_PAYMENT_TOKEN_ADDRESS!),
    tokenDecimals,
    amountBaseUnits: parseUnits(String(priceUsd), tokenDecimals).toString(),
    rpcUrl: env.EVM_RPC_URL!
  };
}

async function verifyErc20Payment(config: ReturnType<typeof getPremiumPaymentConfig> & { configured: true }, walletAddress: string, txHash: string) {
  const provider = new JsonRpcProvider(config.rpcUrl);
  const network = await provider.getNetwork();
  if (network.chainId !== BigInt(Number(config.chainId))) {
    return { valid: false, message: `RPC is connected to chain ${network.chainId.toString()}, expected ${config.chainId}.` };
  }
  const [receipt, tx] = await Promise.all([
    provider.getTransactionReceipt(txHash),
    provider.getTransaction(txHash)
  ]);
  if (!receipt || !tx) return { valid: false, message: "Transaction was not found on the configured network." };
  if (receipt.status !== 1) return { valid: false, message: "Transaction failed on-chain." };
  if (getAddress(tx.from) !== getAddress(walletAddress)) return { valid: false, message: "Transaction sender does not match the verified wallet." };
  const expected = BigInt(config.amountBaseUnits);
  for (const log of receipt.logs) {
    if (getAddress(log.address) !== config.tokenAddress) continue;
    try {
      const parsed = transferInterface.parseLog({ topics: [...log.topics], data: log.data });
      if (!parsed || parsed.name !== "Transfer") continue;
      const from = getAddress(String(parsed.args.from));
      const to = getAddress(String(parsed.args.to));
      const value = BigInt(parsed.args.value.toString());
      if (from === getAddress(walletAddress) && to === config.treasuryAddress && value >= expected) {
        return {
          valid: true,
          txHash,
          blockNumber: receipt.blockNumber,
          from,
          to,
          tokenAddress: config.tokenAddress,
          tokenSymbol: config.tokenSymbol,
          amountBaseUnits: value.toString()
        };
      }
    } catch {
      continue;
    }
  }
  return { valid: false, message: `No ${config.tokenSymbol} transfer to the OmniSignal treasury wallet was found in this transaction.` };
}

async function getRecentPayments(app: FastifyInstance, session: SessionPayload) {
  const payments = await app.services.prisma.payment.findMany({
    where: { userId: session.userId, walletAddress: session.walletAddress },
    orderBy: { createdAt: "desc" },
    take: 10
  });
  return payments.map(toPaymentDto);
}

function toPaymentDto(payment: {
  id: string;
  amountUsd: Prisma.Decimal;
  expectedAmountToken: Prisma.Decimal;
  tokenSymbol: string;
  status: string;
  txHash: string | null;
  confirmedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: payment.id,
    amountUsd: Number(payment.amountUsd),
    amountToken: Number(payment.expectedAmountToken),
    tokenSymbol: payment.tokenSymbol,
    status: payment.status,
    txHash: payment.txHash,
    confirmedAt: payment.confirmedAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString()
  };
}

function normalizeChainId(chainId: string) {
  return chainId.startsWith("0x") ? String(Number.parseInt(chainId, 16)) : chainId;
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function createMessagingLinkCode() {
  return randomBytes(4).toString("hex").toUpperCase();
}
