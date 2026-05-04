import type { FastifyRequest } from "fastify";
import { z } from "zod";

export const sessionPayloadSchema = z.object({
  userId: z.string().min(1),
  walletAddress: z.string().min(1),
  chainId: z.string().optional()
});

export type SessionPayload = z.infer<typeof sessionPayloadSchema>;

export async function requireSession(request: FastifyRequest): Promise<SessionPayload> {
  const payload = await request.jwtVerify();
  return sessionPayloadSchema.parse(payload);
}
