import { Queue, Worker } from "bullmq";
import type { Env } from "../config/env";
import { getRedis } from "../db/redis";
import { prisma } from "../db/prisma";
import { ingestSignals } from "../signals/ingestion";

export function startSignalIngestionWorker(env: Env) {
  const connection = getRedis(env);
  const queue = new Queue("signal-ingestion", { connection });
  const worker = new Worker("signal-ingestion", async () => ingestSignals(prisma), { connection });
  void queue.upsertJobScheduler("every-five-minutes", { every: 5 * 60 * 1000 }, { name: "ingest-signals" });
  return { queue, worker };
}
