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
