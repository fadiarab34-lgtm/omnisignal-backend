import type { FastifyInstance } from "fastify";
import { randomBytes } from "node:crypto";
import { getAddress, verifyMessage } from "ethers";
import { z } from "zod";
import { auditLog } from "../security/audit";
import { requireSession } from "../security/session";

const nonceQuerySchema = z.object({
  address: z.string().min(1)
});

const verifyBodySchema = z.object({
  address: z.string().min(1),
  signature: z.string().min(1),
  chainId: z.string().optional()
});

function buildMessage(address: string, nonce: string, expiresAt: Date): string {
  return [
    "OmniSignal wallet verification",
    `Address: ${address}`,
    `Nonce: ${nonce}`,
    `Expires: ${expiresAt.toISOString()}`,
    "Sign this message to authenticate. OmniSignal will never ask for seed phrases or private keys."
  ].join("\n");
}

export async function registerAuthRoutes(app: FastifyInstance) {
  app.get("/auth/wallet/nonce", async (request, reply) => {
    const query = nonceQuerySchema.parse(request.query);
    const address = getAddress(query.address);
    const nonce = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await app.services.prisma.walletNonce.create({
      data: {
        walletAddress: address,
        nonce,
        expiresAt
      }
    });
    await auditLog(app.services.prisma, {
      action: "wallet_nonce_created",
      entityType: "WalletNonce",
      metadataJson: { walletAddress: address },
      ipAddress: request.ip
    });
    reply.send({ address, nonce, expiresAt: expiresAt.toISOString(), message: buildMessage(address, nonce, expiresAt) });
  });

  app.post("/auth/wallet/verify", async (request, reply) => {
    const body = verifyBodySchema.parse(request.body);
    const address = getAddress(body.address);
    const nonce = await app.services.prisma.walletNonce.findFirst({
      where: {
        walletAddress: address,
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });
    if (!nonce) return reply.status(401).send({ error: "InvalidNonce", message: "Wallet nonce expired or not found." });
    const recovered = getAddress(verifyMessage(buildMessage(address, nonce.nonce, nonce.expiresAt), body.signature));
    if (recovered !== address) return reply.status(401).send({ error: "InvalidSignature", message: "Wallet signature did not match the requested address." });

    const wallet = await app.services.prisma.wallet.upsert({
      where: { address },
      update: { chainId: body.chainId, verifiedAt: new Date() },
      create: {
        address,
        chainId: body.chainId,
        verifiedAt: new Date(),
        user: { create: {} }
      },
      include: { user: true }
    });
    await app.services.prisma.walletNonce.update({ where: { id: nonce.id }, data: { usedAt: new Date() } });
    await auditLog(app.services.prisma, {
      userId: wallet.userId,
      action: "wallet_verified",
      entityType: "Wallet",
      entityId: wallet.id,
      metadataJson: { address, chainId: body.chainId },
      ipAddress: request.ip
    });
    const token = app.jwt.sign({
      userId: wallet.userId,
      walletAddress: address,
      chainId: body.chainId
    }, { expiresIn: "12h" });
    reply.send({ token, user: { id: wallet.userId }, wallet: { address, chainId: body.chainId, verifiedAt: wallet.verifiedAt.toISOString() } });
  });

  app.post("/auth/logout", async (_request, reply) => {
    reply.send({ ok: true });
  });

  app.get("/auth/session", async (request, reply) => {
    try {
      const session = await requireSession(request);
      reply.send({ authenticated: true, session });
    } catch {
      reply.send({ authenticated: false });
    }
  });
}
