import { Queue, Worker } from "bullmq";
import { AIAnalysisService } from "@omnisignal/ai";
import type { Env } from "../config/env";
import { getRedis } from "../db/redis";
import { prisma } from "../db/prisma";
import { ingestSignals } from "../signals/ingestion";

export function startSignalIngestionWorker(env: Env) {
  const connection = getRedis(env);
  const queue = new Queue("signal-ingestion", { connection });
  const ai = new AIAnalysisService({ apiKey: env.OPENAI_API_KEY });
  const worker = new Worker("signal-ingestion", async () => ingestSignals(prisma, { env, ai }), { connection });
  void queue.upsertJobScheduler("every-twenty-minutes", { every: env.ORACLE_REFRESH_INTERVAL_MS }, { name: "ingest-signals" });
  return { queue, worker };
}
