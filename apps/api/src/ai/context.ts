import type { NewsEvent } from "@prisma/client";

export function toNewsEventContext(event: NewsEvent) {
  return {
    id: event.id,
    source: event.source,
    title: event.title,
    summary: event.summary,
    url: event.url,
    publishedAt: event.publishedAt,
    affectedSymbols: event.affectedSymbols,
    affectedSectors: event.affectedSectors,
    affectedRegions: event.affectedRegions,
    sentimentScore: event.sentimentScore === null ? null : Number(event.sentimentScore),
    riskType: event.riskType,
    confidence: event.confidence === null ? null : Number(event.confidence)
  };
}
