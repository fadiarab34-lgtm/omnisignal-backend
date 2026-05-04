import Redis from "ioredis";
import type { Env } from "../config/env";

let redis: Redis | undefined;

export function getRedis(env: Env): Redis {
  redis ??= new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true
  });
  return redis;
}
