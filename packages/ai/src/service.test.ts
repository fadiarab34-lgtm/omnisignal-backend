import { describe, expect, it } from "vitest";
import { aiAssetAnalysisSchema } from "@omnisignal/shared";

describe("AI output validation", () => {
  it("accepts the required asset analysis structure", () => {
    const parsed = aiAssetAnalysisSchema.parse({
      symbol: "BTC",
      headline: "Live volatility remains elevated",
      summary: "Momentum is positive but liquidity risk remains relevant.",
      signal: "watch",
      confidence: 0.61,
      timeHorizon: "short_term",
      riskLevel: "medium",
      keyDrivers: ["provider quote", "recent event"],
      geopoliticalImpact: { level: "low", explanation: "No direct event link supplied.", linkedEvents: [] },
      technicalView: { trend: "neutral", volatilityComment: "Recent candle range is wider than the prior period." },
      portfolioImpact: { exposurePercent: 0, concentrationRisk: "No portfolio exposure supplied." },
      disclaimer: "Informational analysis only. This is not financial advice."
    });
    expect(parsed.signal).toBe("watch");
  });
});
