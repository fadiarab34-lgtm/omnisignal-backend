export const aiAssetAnalysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "symbol",
    "headline",
    "summary",
    "signal",
    "confidence",
    "timeHorizon",
    "riskLevel",
    "keyDrivers",
    "geopoliticalImpact",
    "technicalView",
    "portfolioImpact",
    "disclaimer"
  ],
  properties: {
    symbol: { type: "string" },
    headline: { type: "string" },
    summary: { type: "string" },
    signal: { type: "string", enum: ["buy_more", "hold", "reduce", "sell", "watch"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    timeHorizon: { type: "string", enum: ["intraday", "short_term", "medium_term", "long_term"] },
    riskLevel: { type: "string", enum: ["low", "medium", "high"] },
    keyDrivers: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 6 },
    geopoliticalImpact: {
      type: "object",
      additionalProperties: false,
      required: ["level", "explanation", "linkedEvents"],
      properties: {
        level: { type: "string", enum: ["low", "medium", "high"] },
        explanation: { type: "string" },
        linkedEvents: { type: "array", items: { type: "string" } }
      }
    },
    technicalView: {
      type: "object",
      additionalProperties: false,
      required: ["trend", "volatilityComment"],
      properties: {
        trend: { type: "string", enum: ["bullish", "neutral", "bearish"] },
        support: { type: "number" },
        resistance: { type: "number" },
        volatilityComment: { type: "string" }
      }
    },
    portfolioImpact: {
      type: "object",
      additionalProperties: false,
      required: ["exposurePercent", "concentrationRisk"],
      properties: {
        exposurePercent: { type: "number", minimum: 0, maximum: 100 },
        concentrationRisk: { type: "string" },
        suggestedAdjustment: { type: "string" }
      }
    },
    disclaimer: { type: "string" }
  }
} as const;

export const aiPortfolioAnalysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "portfolioValue",
    "dailyChangePercent",
    "dailyChangeAmount",
    "overallSignal",
    "headline",
    "summary",
    "nudges",
    "recommendedActions",
    "riskBreakdown",
    "disclaimer"
  ],
  properties: {
    portfolioValue: { type: "number" },
    dailyChangePercent: { type: "number" },
    dailyChangeAmount: { type: "number" },
    overallSignal: { type: "string", enum: ["risk_on", "balanced", "risk_off", "rebalance_needed"] },
    headline: { type: "string" },
    summary: { type: "string" },
    nudges: {
      type: "array",
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "severity", "title", "message"],
        properties: {
          id: { type: "string" },
          severity: { type: "string", enum: ["info", "warning", "urgent"] },
          title: { type: "string" },
          message: { type: "string" },
          actionLabel: { type: "string" },
          linkedSymbols: { type: "array", items: { type: "string" } }
        }
      }
    },
    recommendedActions: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "reason", "estimatedImpact"],
        properties: {
          type: { type: "string", enum: ["buy_more", "sell", "reduce", "hold", "rebalance"] },
          symbol: { type: "string" },
          reason: { type: "string" },
          estimatedImpact: { type: "string" }
        }
      }
    },
    riskBreakdown: {
      type: "object",
      additionalProperties: false,
      required: ["concentration", "sectorExposure", "cryptoExposure", "geopoliticalExposure", "liquidityRisk"],
      properties: {
        concentration: { type: "string" },
        sectorExposure: { type: "string" },
        cryptoExposure: { type: "string" },
        geopoliticalExposure: { type: "string" },
        liquidityRisk: { type: "string" }
      }
    },
    disclaimer: { type: "string" }
  }
} as const;

export const oracleCardJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "summary",
    "whyItMatters",
    "sourceType",
    "sourceName",
    "sourceUrl",
    "sourceCredibility",
    "publishedAt",
    "affectedCountries",
    "affectedSectors",
    "affectedAssets",
    "direction",
    "urgencyScore",
    "confidenceScore",
    "marketImpactScore",
    "geoRiskScore",
    "timeHorizon",
    "suggestedAction",
    "portfolioExposure",
    "marketAlreadyPricing",
    "predictionDivergence",
    "crowdingScore",
    "majorityReport",
    "contrarianView"
  ],
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    whyItMatters: { type: "string" },
    sourceType: { type: "string", enum: ["x_post", "news", "social", "prediction_market", "market_data", "macro", "portfolio"] },
    sourceName: { type: "string" },
    sourceUrl: { type: ["string", "null"] },
    sourceCredibility: { type: "number", minimum: 0, maximum: 1 },
    publishedAt: { type: ["string", "null"] },
    affectedCountries: { type: "array", items: { type: "string" } },
    affectedSectors: { type: "array", items: { type: "string" } },
    affectedAssets: { type: "array", items: { type: "string" } },
    direction: { type: "string", enum: ["bullish", "bearish", "neutral", "mixed", "uncertain"] },
    urgencyScore: { type: "number", minimum: 0, maximum: 1 },
    confidenceScore: { type: "number", minimum: 0, maximum: 1 },
    marketImpactScore: { type: "number", minimum: 0, maximum: 1 },
    geoRiskScore: { type: "number", minimum: 0, maximum: 1 },
    timeHorizon: { type: "string", enum: ["intraday", "short_term", "medium_term", "long_term"] },
    suggestedAction: { type: "string", enum: ["buy", "sell", "short", "hedge", "hold", "watch", "simulate"] },
    portfolioExposure: { type: ["number", "null"], minimum: 0, maximum: 100 },
    marketAlreadyPricing: { type: ["boolean", "null"] },
    predictionDivergence: { type: ["number", "null"], minimum: 0, maximum: 1 },
    crowdingScore: { type: ["number", "null"], minimum: 0, maximum: 1 },
    majorityReport: { type: ["string", "null"] },
    contrarianView: { type: ["string", "null"] }
  }
} as const;
