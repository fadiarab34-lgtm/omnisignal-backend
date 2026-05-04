import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

export async function auditLog(prisma: PrismaClient, input: {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadataJson?: unknown;
  ipAddress?: string;
}) {
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadataJson: toJson(input.metadataJson ?? {}),
      ipAddress: input.ipAddress
    }
  });
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
