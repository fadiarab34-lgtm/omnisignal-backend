import type { PrismaClient } from "@prisma/client";
import { RISK_TYPES } from "@omnisignal/shared";

type GdeltArticle = {
  title?: string;
  seendate?: string;
  url?: string;
  domain?: string;
  sourcecountry?: string;
  language?: string;
};

const SYMBOL_RULES: Array<{ pattern: RegExp; symbols: string[]; sectors: string[]; regions: string[]; riskType: string }> = [
  { pattern: /oil|brent|wti|opec|hormuz|energy/i, symbols: ["USO", "XLE"], sectors: ["Energy", "Commodities"], regions: ["Global"], riskType: "energy" },
  { pattern: /fed|rates|inflation|treasury|yield|central bank/i, symbols: ["SPY", "QQQ", "TLT"], sectors: ["Rates", "US Equities"], regions: ["United States"], riskType: "rates" },
  { pattern: /bitcoin|ethereum|crypto|stablecoin|defi|exchange/i, symbols: ["BTC", "ETH", "SOL"], sectors: ["Crypto"], regions: ["Global"], riskType: "crypto-specific" },
  { pattern: /semiconductor|chip|export control|taiwan|nvidia|amd/i, symbols: ["QQQ", "XLK"], sectors: ["US Tech", "Semiconductors"], regions: ["United States", "Asia Pacific"], riskType: "geopolitical" },
  { pattern: /sanction|war|missile|conflict|shipping|supply chain/i, symbols: ["SPY", "GLD", "USO"], sectors: ["Macro", "Commodities"], regions: ["Global"], riskType: "geopolitical" },
  { pattern: /earnings|guidance|revenue|profit|margin/i, symbols: ["SPY", "QQQ"], sectors: ["Earnings"], regions: ["United States"], riskType: "earnings" },
  { pattern: /dollar|euro|yen|currency|forex/i, symbols: ["EUR/USD", "USD/JPY"], sectors: ["Forex"], regions: ["Global"], riskType: "currency" }
];

export async function fetchGdeltEvents(): Promise<GdeltArticle[]> {
  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  url.searchParams.set("query", "(market OR rates OR oil OR crypto OR semiconductor OR sanctions OR earnings) sourcelang:english");
  url.searchParams.set("mode", "artlist");
  url.searchParams.set("format", "json");
  url.searchParams.set("maxrecords", "50");
  url.searchParams.set("sort", "hybridrel");
  const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`GDELT returned ${response.status}`);
  const json = await response.json() as { articles?: GdeltArticle[] };
  return json.articles ?? [];
}

export async function ingestSignals(prisma: PrismaClient) {
  const articles = await fetchGdeltEvents();
  const created = [];
  for (const article of articles) {
    if (!article.title || !article.url) continue;
    const classified = classifyArticle(article);
    const event = await prisma.newsEvent.upsert({
      where: { source_url: { source: article.domain ?? "GDELT", url: article.url } },
      update: {},
      create: {
        source: article.domain ?? "GDELT",
        title: sanitize(article.title),
        summary: null,
        url: article.url,
        publishedAt: parseGdeltDate(article.seendate),
        affectedSymbols: classified.symbols,
        affectedSectors: classified.sectors,
        affectedRegions: classified.regions,
        riskType: classified.riskType,
        sentimentScore: classified.sentiment,
        confidence: classified.confidence
      }
    });
    created.push(event);
  }
  return created;
}

function classifyArticle(article: GdeltArticle) {
  const text = `${article.title ?? ""} ${article.domain ?? ""}`;
  const matches = SYMBOL_RULES.filter((rule) => rule.pattern.test(text));
  const symbols = [...new Set(matches.flatMap((match) => match.symbols))];
  const sectors = [...new Set(matches.flatMap((match) => match.sectors))];
  const regions = [...new Set(matches.flatMap((match) => match.regions).concat(article.sourcecountry ? [article.sourcecountry] : []))];
  const riskType = matches[0]?.riskType ?? "macro";
  const negative = /war|sanction|missile|crisis|inflation|default|risk|selloff|falls|slumps|cuts/i.test(text);
  const positive = /beats|rises|rally|deal|growth|eases|record/i.test(text);
  return {
    symbols,
    sectors,
    regions,
    riskType: RISK_TYPES.includes(riskType as never) ? riskType : "macro",
    sentiment: negative ? -0.45 : positive ? 0.35 : 0,
    confidence: Math.min(0.95, 0.45 + matches.length * 0.12)
  };
}

function sanitize(text: string): string {
  return text.replace(/[<>]/g, "").slice(0, 500);
}

function parseGdeltDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 8) return undefined;
  const iso = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}T${digits.slice(8, 10) || "00"}:${digits.slice(10, 12) || "00"}:00Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
