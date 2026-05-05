import type { PrismaClient, ProviderStatusValue } from "@prisma/client";
import { AIAnalysisService } from "@omnisignal/ai";
import {
  RISK_TYPES,
  normalizedSignalSchema,
  type NormalizedSignal,
  type OracleCard,
  type OracleSuggestedAction,
  type OracleTimeHorizon,
  type SignalEntities,
  type SignalSentiment,
  type SignalSourceType
} from "@omnisignal/shared";
import type { Env } from "../config/env";

type GdeltArticle = {
  title?: string;
  seendate?: string;
  url?: string;
  domain?: string;
  sourcecountry?: string;
};

type ProviderResult = {
  provider: string;
  status: ProviderStatusValue;
  message: string;
  latencyMs?: number;
  signals: NormalizedSignal[];
};

type IngestionOptions = {
  env?: Env;
  ai?: AIAnalysisService;
};

const emptyEntities: SignalEntities = {
  people: [],
  countries: [],
  companies: [],
  tickers: [],
  assets: [],
  sectors: [],
  commodities: [],
  currencies: [],
  regions: []
};

const rules: Array<{
  pattern: RegExp;
  assets: string[];
  sectors: string[];
  countries?: string[];
  commodities?: string[];
  currencies?: string[];
  category: string;
  riskType: string;
  geoRisk: number;
  impact: number;
  action: OracleSuggestedAction;
  horizon: OracleTimeHorizon;
}> = [
  { pattern: /oil|brent|wti|opec|hormuz|energy|gas|lng|shipping/i, assets: ["USO", "XLE", "GLD"], sectors: ["Energy", "Commodities", "Transport"], countries: ["Global"], commodities: ["Oil", "Gas", "Gold"], category: "energy", riskType: "energy", geoRisk: 0.75, impact: 0.72, action: "hedge", horizon: "short_term" },
  { pattern: /fed|rates|inflation|treasury|yield|central bank|hawkish|dovish|rate cut|rate hike/i, assets: ["SPY", "QQQ", "TLT", "GLD", "BTC"], sectors: ["Rates", "US Equities", "Crypto"], countries: ["United States"], currencies: ["USD"], category: "central_banks", riskType: "rates", geoRisk: 0.25, impact: 0.78, action: "watch", horizon: "short_term" },
  { pattern: /bitcoin|ethereum|crypto|stablecoin|defi|exchange|solana/i, assets: ["BTC", "ETH", "SOL"], sectors: ["Crypto"], countries: ["Global"], category: "crypto", riskType: "crypto-specific", geoRisk: 0.25, impact: 0.68, action: "simulate", horizon: "intraday" },
  { pattern: /semiconductor|chip|export control|taiwan|nvidia|amd|tsmc|asml|ai hardware|rare earth/i, assets: ["NVDA", "AMD", "TSM", "ASML", "QQQ", "SMH"], sectors: ["AI and Semiconductors", "Cloud and Software"], countries: ["United States", "China", "Taiwan"], category: "semiconductors", riskType: "geopolitical", geoRisk: 0.82, impact: 0.8, action: "simulate", horizon: "medium_term" },
  { pattern: /sanction|war|missile|conflict|escalation|defense|military|ceasefire|attack|border|naval/i, assets: ["SPY", "GLD", "USO", "ITA", "XLE"], sectors: ["Defense", "Energy", "Global Indices"], countries: ["Global"], category: "geopolitics", riskType: "geopolitical", geoRisk: 0.9, impact: 0.76, action: "hedge", horizon: "short_term" },
  { pattern: /election|parliament|coalition|prime minister|president|vote|campaign|policy/i, assets: ["SPY", "EEM", "FXI", "EWZ"], sectors: ["Global Indices", "Banking", "Infrastructure"], countries: ["Global"], category: "elections", riskType: "geopolitical", geoRisk: 0.65, impact: 0.58, action: "watch", horizon: "medium_term" },
  { pattern: /earnings|guidance|revenue|profit|margin|forecast|demand|capex/i, assets: ["SPY", "QQQ"], sectors: ["Earnings", "Consumer", "Cloud and Software"], countries: ["United States"], category: "earnings", riskType: "earnings", geoRisk: 0.1, impact: 0.62, action: "watch", horizon: "short_term" },
  { pattern: /dollar|euro|yen|yuan|currency|forex|fx|devaluation/i, assets: ["EUR/USD", "USD/JPY", "UUP", "GLD"], sectors: ["Forex", "Commodities"], countries: ["Global"], currencies: ["USD", "EUR", "JPY", "CNY"], category: "currency", riskType: "currency", geoRisk: 0.4, impact: 0.66, action: "watch", horizon: "short_term" },
  { pattern: /bank|credit|liquidity|default|commercial real estate|deposit|loan loss/i, assets: ["XLF", "KRE", "SPY"], sectors: ["Banking", "Credit Risk", "Real Estate"], countries: ["United States"], category: "credit", riskType: "liquidity", geoRisk: 0.2, impact: 0.74, action: "hedge", horizon: "short_term" },
  { pattern: /ai|artificial intelligence|cloud|software|cybersecurity|data center/i, assets: ["NVDA", "MSFT", "GOOGL", "AMZN", "CRWD", "QQQ"], sectors: ["AI and Semiconductors", "Cloud and Software", "Cybersecurity"], countries: ["United States"], category: "ai_technology", riskType: "macro", geoRisk: 0.25, impact: 0.64, action: "simulate", horizon: "medium_term" }
];

export async function ingestSignals(prisma: PrismaClient, options: IngestionOptions = {}) {
  const providerResults = await Promise.all([
    fetchGdeltSignals(options.env),
    fetchLeaderPostSignals(options.env),
    fetchConfiguredJsonSignals(options.env, "social_velocity", "social", options.env?.SOCIAL_SIGNAL_API_URL, options.env?.SOCIAL_SIGNAL_API_KEY, "Missing SOCIAL_SIGNAL_API_URL. Social velocity and herd monitoring are disabled."),
    fetchConfiguredJsonSignals(options.env, "prediction_markets", "prediction_market", options.env?.PREDICTION_MARKET_API_URL, options.env?.PREDICTION_MARKET_API_KEY, "Missing PREDICTION_MARKET_API_URL. PolyDelta is disabled."),
    fetchConfiguredJsonSignals(options.env, "macro_data", "macro", options.env?.MACRO_DATA_API_URL, options.env?.MACRO_DATA_API_KEY, "Missing MACRO_DATA_API_URL. Macro ingestion is disabled.")
  ]);

  const storedSignals: NormalizedSignal[] = [];
  const oracleCards: OracleCard[] = [];

  for (const result of providerResults) {
    await recordProviderStatus(prisma, result.provider, result.status, result.message, result.latencyMs);
    await recordSourceMetadata(prisma, result);
    for (const signal of result.signals) {
      const stored = await upsertSignal(prisma, signal);
      if (signal.sourceType === "news") await storeNewsEvent(prisma, stored.signal);
      if (stored.created) storedSignals.push(stored.signal);
    }
  }

  if (!options.ai?.isConfigured()) {
    await recordProviderStatus(prisma, "openai_oracle", "missing_config", "Missing OPENAI_API_KEY. Normalized signals were stored, but Oracle cards were not generated.");
    return { signals: storedSignals, oracleCards, providerResults };
  }

  for (const signal of storedSignals.filter((item) => item.userAlertRequired || item.marketImpactScore >= 0.55).slice(0, 12)) {
    try {
      const card = await options.ai.generateOracleCard({ signal, confirmingSignals: storedSignals.filter((item) => item.id !== signal.id).slice(0, 6) });
      const created = await prisma.oracleCard.create({
        data: {
          signalId: signal.id,
          title: clean(card.title, 180),
          summary: clean(card.summary, 600),
          whyItMatters: clean(card.whyItMatters, 900),
          sourceType: card.sourceType,
          sourceName: card.sourceName,
          sourceUrl: card.sourceUrl,
          sourceCredibility: card.sourceCredibility,
          publishedAt: card.publishedAt ? new Date(card.publishedAt) : null,
          affectedCountries: card.affectedCountries,
          affectedSectors: card.affectedSectors,
          affectedAssets: card.affectedAssets,
          direction: card.direction,
          urgencyScore: card.urgencyScore,
          confidenceScore: card.confidenceScore,
          marketImpactScore: card.marketImpactScore,
          geoRiskScore: card.geoRiskScore,
          timeHorizon: card.timeHorizon,
          suggestedAction: card.suggestedAction,
          portfolioExposure: card.portfolioExposure,
          marketAlreadyPricing: card.marketAlreadyPricing,
          predictionDivergence: card.predictionDivergence,
          crowdingScore: card.crowdingScore,
          majorityReport: card.majorityReport,
          contrarianView: card.contrarianView,
          rawJson: card
        }
      });
      oracleCards.push(toOracleCard(created));
    } catch (error) {
      await recordProviderStatus(prisma, "openai_oracle", "degraded", error instanceof Error ? error.message : "OpenAI Oracle generation failed.");
    }
  }

  return { signals: storedSignals, oracleCards, providerResults };
}

export async function fetchGdeltEvents(env?: Env): Promise<GdeltArticle[]> {
  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  url.searchParams.set("query", "(market OR rates OR oil OR crypto OR semiconductor OR sanctions OR election OR defense OR central bank OR inflation OR supply chain OR energy OR export controls) sourcelang:english");
  url.searchParams.set("mode", "artlist");
  url.searchParams.set("format", "json");
  url.searchParams.set("maxrecords", String(env?.ORACLE_MAX_SOURCE_ITEMS ?? 50));
  url.searchParams.set("sort", "hybridrel");
  const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`GDELT returned ${response.status}`);
  const json = await response.json() as { articles?: GdeltArticle[] };
  return json.articles ?? [];
}

async function fetchGdeltSignals(env?: Env): Promise<ProviderResult> {
  const started = Date.now();
  try {
    const articles = await fetchGdeltEvents(env);
    return {
      provider: "gdelt",
      status: "healthy",
      message: `${articles.length} GDELT articles fetched and normalized.`,
      latencyMs: Date.now() - started,
      signals: articles.map((article) => article.title && article.url ? normalizeText({
        sourceType: "news",
        sourceName: article.domain ?? "GDELT",
        sourceUrl: article.url,
        publishedAt: parseGdeltDate(article.seendate)?.toISOString(),
        title: article.title,
        text: article.title,
        sourceCountry: article.sourcecountry,
        credibility: 0.7,
        raw: article
      }) : null).filter(Boolean) as NormalizedSignal[]
    };
  } catch (error) {
    return { provider: "gdelt", status: "down", message: error instanceof Error ? error.message : "GDELT unavailable.", latencyMs: Date.now() - started, signals: [] };
  }
}

async function fetchLeaderPostSignals(env?: Env): Promise<ProviderResult> {
  const started = Date.now();
  if (!env?.X_BEARER_TOKEN || !env.X_LEADER_HANDLES) {
    return { provider: "x_leader_posts", status: "missing_config", message: "Missing X_BEARER_TOKEN or X_LEADER_HANDLES. Leader monitoring is disabled.", latencyMs: Date.now() - started, signals: [] };
  }
  try {
    const handles = env.X_LEADER_HANDLES.split(",").map((item) => item.trim().replace(/^@/, "")).filter(Boolean).slice(0, 20);
    const url = new URL("https://api.x.com/2/tweets/search/recent");
    url.searchParams.set("query", `(${handles.map((handle) => `from:${handle}`).join(" OR ")}) -is:retweet lang:en`);
    url.searchParams.set("max_results", String(Math.min(100, Math.max(10, env.ORACLE_MAX_SOURCE_ITEMS))));
    url.searchParams.set("tweet.fields", "created_at,author_id,entities,public_metrics");
    url.searchParams.set("expansions", "author_id");
    url.searchParams.set("user.fields", "name,username,verified");
    const response = await fetch(url.toString(), { headers: { Authorization: `Bearer ${env.X_BEARER_TOKEN}`, Accept: "application/json" } });
    if (!response.ok) throw new Error(`X API returned ${response.status}`);
    const json = await response.json() as { data?: Array<{ id: string; text: string; created_at?: string; author_id?: string }>; includes?: { users?: Array<{ id: string; name?: string; username?: string; verified?: boolean }> } };
    const users = new Map((json.includes?.users ?? []).map((user) => [user.id, user]));
    const signals = (json.data ?? []).map((tweet) => {
      const user = tweet.author_id ? users.get(tweet.author_id) : undefined;
      return normalizeText({
        sourceType: "x_post",
        sourceName: user?.name ?? user?.username ?? "X leader post",
        sourceUrl: user?.username ? `https://x.com/${user.username}/status/${tweet.id}` : undefined,
        publishedAt: tweet.created_at,
        title: `Leader statement detected: ${user?.name ?? user?.username ?? "public official"}`,
        text: tweet.text,
        categoryHint: "leader_statement",
        credibility: user?.verified ? 0.85 : 0.65,
        raw: tweet
      });
    });
    return { provider: "x_leader_posts", status: "healthy", message: `${signals.length} leader posts fetched through the official X API.`, latencyMs: Date.now() - started, signals };
  } catch (error) {
    return { provider: "x_leader_posts", status: "down", message: error instanceof Error ? error.message : "X leader provider unavailable.", latencyMs: Date.now() - started, signals: [] };
  }
}

async function fetchConfiguredJsonSignals(env: Env | undefined, provider: string, sourceType: SignalSourceType, urlValue?: string, apiKey?: string, missingMessage?: string): Promise<ProviderResult> {
  const started = Date.now();
  if (!urlValue) return { provider, status: "missing_config", message: missingMessage ?? `Missing ${provider} configuration.`, latencyMs: Date.now() - started, signals: [] };
  try {
    const response = await fetch(urlValue, { headers: { Accept: "application/json", ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) } });
    if (!response.ok) throw new Error(`${provider} returned ${response.status}`);
    const json = await response.json();
    const items = extractArray(json).slice(0, env?.ORACLE_MAX_SOURCE_ITEMS ?? 50);
    const signals = items.map((item) => normalizeText({
      sourceType,
      sourceName: firstString(item.source_name, item.source, item.provider) ?? provider,
      sourceUrl: firstString(item.source_url, item.url),
      publishedAt: firstString(item.published_at, item.timestamp, item.created_at, item.updated_at),
      title: firstString(item.title, item.headline, item.event, item.topic, item.name) ?? `${provider} signal`,
      text: firstString(item.raw_text, item.text, item.summary, item.description, item.body, item.question) ?? `${provider} signal`,
      categoryHint: firstString(item.category, item.type),
      credibility: scoreMaybe(item.source_credibility) ?? 0.55,
      raw: item,
      explicitAssets: stringArray(item.affected_assets, item.assets, item.tickers, item.symbols),
      explicitSectors: stringArray(item.affected_sectors, item.sectors),
      explicitCountries: stringArray(item.affected_countries, item.countries),
      explicitSentiment: normalizeSentiment(firstString(item.sentiment, item.direction, item.impact)),
      explicitUrgency: scoreMaybe(item.urgency_score),
      explicitImpact: scoreMaybe(item.market_impact_score),
      explicitGeoRisk: scoreMaybe(item.geo_risk_score),
      explicitCrowding: scoreMaybe(item.crowding_score, item.crowd_risk),
      explicitDivergence: scoreMaybe(item.divergence_score, item.probability_divergence),
      explicitAction: normalizeAction(firstString(item.suggested_action, item.action))
    }));
    return { provider, status: "healthy", message: `${signals.length} ${provider} items fetched and normalized.`, latencyMs: Date.now() - started, signals };
  } catch (error) {
    return { provider, status: "down", message: error instanceof Error ? error.message : `${provider} unavailable.`, latencyMs: Date.now() - started, signals: [] };
  }
}

function normalizeText(input: {
  sourceType: SignalSourceType;
  sourceName: string;
  sourceUrl?: string;
  publishedAt?: string;
  title: string;
  text: string;
  sourceCountry?: string;
  categoryHint?: string;
  credibility: number;
  raw: unknown;
  explicitAssets?: string[];
  explicitSectors?: string[];
  explicitCountries?: string[];
  explicitSentiment?: SignalSentiment;
  explicitUrgency?: number;
  explicitImpact?: number;
  explicitGeoRisk?: number;
  explicitCrowding?: number;
  explicitDivergence?: number;
  explicitAction?: OracleSuggestedAction;
}): NormalizedSignal {
  const classified = classify(`${input.title} ${input.text}`, input.sourceCountry);
  const affectedAssets = unique([...(input.explicitAssets ?? []), ...classified.assets]);
  const affectedSectors = unique([...(input.explicitSectors ?? []), ...classified.sectors]);
  const countries = unique([...(input.explicitCountries ?? []), ...classified.countries]);
  const urgencyScore = input.explicitUrgency ?? classified.urgency;
  const marketImpactScore = input.explicitImpact ?? classified.impact;
  const geoRiskScore = input.explicitGeoRisk ?? classified.geoRisk;
  const parsed = normalizedSignalSchema.parse({
    sourceType: input.sourceType,
    sourceName: clean(input.sourceName, 120),
    sourceUrl: validUrl(input.sourceUrl),
    publishedAt: parseLooseDate(input.publishedAt)?.toISOString() ?? null,
    ingestedAt: new Date().toISOString(),
    title: clean(input.title, 240),
    rawText: clean(input.text, 5000),
    summary: summarize(input.text),
    category: input.categoryHint ?? classified.category,
    entities: { ...emptyEntities, countries, tickers: affectedAssets, assets: affectedAssets, sectors: affectedSectors, commodities: classified.commodities, currencies: classified.currencies, regions: classified.regions },
    sentiment: input.explicitSentiment ?? classified.sentiment,
    urgencyScore,
    confidenceScore: clamp(Math.max(input.credibility, classified.confidence)),
    marketImpactScore,
    geoRiskScore,
    crowdingScore: input.explicitCrowding ?? null,
    divergenceScore: input.explicitDivergence ?? null,
    affectedAssets,
    affectedSectors,
    suggestedAction: input.explicitAction ?? classified.action,
    timeHorizon: classified.horizon,
    portfolioExposure: null,
    oracleSummary: null,
    userAlertRequired: urgencyScore >= 0.65 || marketImpactScore >= 0.65 || geoRiskScore >= 0.7
  });
  return { ...parsed, id: stableId(input.sourceType, input.sourceUrl ?? `${input.sourceName}:${input.title}`), ingestedAt: parsed.ingestedAt ?? new Date().toISOString() };
}

function classify(text: string, sourceCountry?: string) {
  const matched = rules.filter((rule) => rule.pattern.test(text));
  const negative = /war|sanction|missile|crisis|inflation|default|risk|selloff|falls|slumps|cuts|hawkish|escalation|attack|probe|ban/i.test(text);
  const positive = /beats|rises|rally|deal|growth|eases|record|ceasefire|approved|stimulus|dovish/i.test(text);
  const sentiment: SignalSentiment = negative && positive ? "mixed" : negative ? "bearish" : positive ? "bullish" : "uncertain";
  const geoRisk = clamp(Math.max(...matched.map((item) => item.geoRisk), 0.15));
  const impact = clamp(Math.max(...matched.map((item) => item.impact), matched.length ? 0.5 : 0.35));
  const urgency = clamp(Math.max(0.28, impact * 0.55 + geoRisk * 0.35 + (/breaking|urgent|attack|missile|escalation|emergency|surprise|unexpected|ban|sanction|hawkish/i.test(text) ? 0.2 : 0)));
  const riskType = matched[0]?.riskType ?? "macro";
  return {
    assets: unique(matched.flatMap((item) => item.assets)),
    sectors: unique(matched.flatMap((item) => item.sectors)),
    countries: unique(matched.flatMap((item) => item.countries ?? []).concat(sourceCountry ? [sourceCountry] : [])),
    commodities: unique(matched.flatMap((item) => item.commodities ?? [])),
    currencies: unique(matched.flatMap((item) => item.currencies ?? [])),
    regions: matched.length ? ["Global"] : [],
    category: matched[0]?.category ?? "macro",
    riskType: RISK_TYPES.includes(riskType as never) ? riskType : "macro",
    sentiment,
    urgency,
    confidence: clamp(0.42 + matched.length * 0.1),
    geoRisk,
    impact,
    action: matched[0]?.action ?? "watch",
    horizon: matched[0]?.horizon ?? "short_term"
  };
}

async function upsertSignal(prisma: PrismaClient, signal: NormalizedSignal): Promise<{ signal: NormalizedSignal; created: boolean }> {
  const dedupeKey = stableId(signal.sourceType, signal.sourceUrl ?? `${signal.sourceName}:${signal.title}:${signal.publishedAt ?? ""}`);
  const existing = await prisma.normalizedSignal.findUnique({ where: { dedupeKey } });
  if (existing) return { signal: toSignal(existing), created: false };
  const created = await prisma.normalizedSignal.create({
    data: {
      sourceType: signal.sourceType,
      sourceName: signal.sourceName,
      sourceUrl: signal.sourceUrl,
      publishedAt: signal.publishedAt ? new Date(signal.publishedAt) : null,
      ingestedAt: new Date(signal.ingestedAt),
      title: signal.title,
      rawText: signal.rawText,
      summary: signal.summary,
      category: signal.category,
      entitiesJson: signal.entities,
      sentiment: signal.sentiment,
      urgencyScore: signal.urgencyScore,
      confidenceScore: signal.confidenceScore,
      marketImpactScore: signal.marketImpactScore,
      geoRiskScore: signal.geoRiskScore,
      crowdingScore: signal.crowdingScore,
      divergenceScore: signal.divergenceScore,
      affectedAssets: signal.affectedAssets,
      affectedSectors: signal.affectedSectors,
      suggestedAction: signal.suggestedAction,
      timeHorizon: signal.timeHorizon,
      portfolioExposure: signal.portfolioExposure,
      oracleSummary: signal.oracleSummary,
      userAlertRequired: signal.userAlertRequired,
      dedupeKey,
      rawJson: signal
    }
  });
  return { signal: toSignal(created), created: true };
}

async function storeNewsEvent(prisma: PrismaClient, signal: NormalizedSignal) {
  await prisma.newsEvent.upsert({
    where: { source_url: { source: signal.sourceName, url: signal.sourceUrl ?? signal.id } },
    update: {},
    create: {
      source: signal.sourceName,
      title: signal.title,
      summary: signal.summary,
      url: signal.sourceUrl ?? signal.id,
      publishedAt: signal.publishedAt ? new Date(signal.publishedAt) : null,
      affectedSymbols: signal.affectedAssets,
      affectedSectors: signal.affectedSectors,
      affectedRegions: signal.entities.countries,
      riskType: signal.category,
      sentimentScore: signal.sentiment === "bearish" ? -0.45 : signal.sentiment === "bullish" ? 0.35 : 0,
      confidence: signal.confidenceScore
    }
  });
}

async function recordSourceMetadata(prisma: PrismaClient, result: ProviderResult) {
  await prisma.sourceMetadata.upsert({
    where: { sourceType_sourceName_provider: { sourceType: result.provider, sourceName: result.provider, provider: result.provider } },
    update: { configStatus: result.status, lastFetchedAt: new Date(), rawJson: { message: result.message, signalCount: result.signals.length } },
    create: { sourceType: result.provider, sourceName: result.provider, provider: result.provider, credibility: result.status === "healthy" ? 0.7 : 0.3, configStatus: result.status, lastFetchedAt: new Date(), rawJson: { message: result.message, signalCount: result.signals.length } }
  });
}

async function recordProviderStatus(prisma: PrismaClient, provider: string, status: ProviderStatusValue, message: string, latencyMs?: number) {
  await prisma.providerStatus.upsert({
    where: { provider },
    update: { status, message: clean(message, 500), latencyMs, lastCheckedAt: new Date() },
    create: { provider, status, message: clean(message, 500), latencyMs, lastCheckedAt: new Date() }
  });
}

function toSignal(row: any): NormalizedSignal {
  return {
    id: row.id,
    sourceType: row.sourceType,
    sourceName: row.sourceName,
    sourceUrl: row.sourceUrl,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    ingestedAt: row.ingestedAt.toISOString(),
    title: row.title,
    rawText: row.rawText,
    summary: row.summary,
    category: row.category,
    entities: row.entitiesJson,
    sentiment: row.sentiment,
    urgencyScore: Number(row.urgencyScore),
    confidenceScore: Number(row.confidenceScore),
    marketImpactScore: Number(row.marketImpactScore),
    geoRiskScore: Number(row.geoRiskScore),
    crowdingScore: row.crowdingScore === null ? null : Number(row.crowdingScore),
    divergenceScore: row.divergenceScore === null ? null : Number(row.divergenceScore),
    affectedAssets: row.affectedAssets,
    affectedSectors: row.affectedSectors,
    suggestedAction: row.suggestedAction,
    timeHorizon: row.timeHorizon,
    portfolioExposure: row.portfolioExposure === null ? null : Number(row.portfolioExposure),
    oracleSummary: row.oracleSummary,
    userAlertRequired: row.userAlertRequired
  };
}

function toOracleCard(row: any): OracleCard {
  return {
    id: row.id,
    signalId: row.signalId,
    title: row.title,
    summary: row.summary,
    whyItMatters: row.whyItMatters,
    sourceType: row.sourceType,
    sourceName: row.sourceName,
    sourceUrl: row.sourceUrl,
    sourceCredibility: Number(row.sourceCredibility),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    affectedCountries: row.affectedCountries,
    affectedSectors: row.affectedSectors,
    affectedAssets: row.affectedAssets,
    direction: row.direction,
    urgencyScore: Number(row.urgencyScore),
    confidenceScore: Number(row.confidenceScore),
    marketImpactScore: Number(row.marketImpactScore),
    geoRiskScore: Number(row.geoRiskScore),
    timeHorizon: row.timeHorizon,
    suggestedAction: row.suggestedAction,
    portfolioExposure: row.portfolioExposure === null ? null : Number(row.portfolioExposure),
    marketAlreadyPricing: row.marketAlreadyPricing,
    predictionDivergence: row.predictionDivergence === null ? null : Number(row.predictionDivergence),
    crowdingScore: row.crowdingScore === null ? null : Number(row.crowdingScore),
    majorityReport: row.majorityReport,
    contrarianView: row.contrarianView,
    createdAt: row.createdAt.toISOString()
  };
}

function parseGdeltDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 8) return undefined;
  return parseLooseDate(`${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}T${digits.slice(8, 10) || "00"}:${digits.slice(10, 12) || "00"}:00Z`);
}

function parseLooseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function validUrl(value?: string): string | null {
  if (!value) return null;
  try {
    return new URL(value).toString();
  } catch {
    return null;
  }
}

function clean(text: string, max = 500): string {
  return text.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

function summarize(text: string) {
  const value = clean(text, 420);
  return value.length > 220 ? `${value.slice(0, 217)}...` : value;
}

function unique(values: Array<string | undefined | null>) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])];
}

function clamp(value: number) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

function stableId(...parts: Array<string | null | undefined>) {
  let hash = 0;
  const input = parts.filter(Boolean).join("|").toLowerCase();
  for (let index = 0; index < input.length; index += 1) hash = ((hash << 5) - hash + input.charCodeAt(index)) | 0;
  return `sig_${Math.abs(hash).toString(36)}`;
}

function firstString(...values: unknown[]) {
  for (const value of values) if (typeof value === "string" && value.trim()) return value.trim();
  return undefined;
}

function extractArray(json: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(json)) return json.filter(isRecord);
  if (isRecord(json)) {
    for (const key of ["signals", "items", "data", "events", "markets", "articles", "results"]) {
      const value = json[key];
      if (Array.isArray(value)) return value.filter(isRecord);
    }
  }
  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(...values: unknown[]) {
  const output: string[] = [];
  for (const value of values) {
    if (Array.isArray(value)) output.push(...value.map(String));
    else if (typeof value === "string" && value.trim()) output.push(...value.split(",").map((item) => item.trim()));
  }
  return unique(output);
}

function scoreMaybe(...values: unknown[]) {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return clamp(numeric > 1 ? numeric / 100 : numeric);
  }
  return undefined;
}

function normalizeSentiment(value?: string): SignalSentiment | undefined {
  const normalized = value?.toLowerCase();
  if (normalized === "bullish" || normalized === "bearish" || normalized === "neutral" || normalized === "mixed" || normalized === "uncertain") return normalized;
  if (normalized === "positive") return "bullish";
  if (normalized === "negative") return "bearish";
  return undefined;
}

function normalizeAction(value?: string): OracleSuggestedAction | undefined {
  const normalized = value?.toLowerCase().replace(/\s+/g, "_");
  if (normalized === "buy" || normalized === "sell" || normalized === "short" || normalized === "hedge" || normalized === "hold" || normalized === "watch" || normalized === "simulate") return normalized;
  return undefined;
}
