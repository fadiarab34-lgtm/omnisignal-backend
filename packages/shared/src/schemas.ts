import { z } from "zod";

export const assetClassSchema = z.enum(["equity", "crypto", "forex", "commodity", "index", "etf", "perp"]);
export const portfolioModeSchema = z.enum(["simulation", "imported", "trading"]);
export const tradingModeSchema = z.enum(["simulation", "testnet", "mainnet"]);
export const orderSideSchema = z.enum(["buy", "sell"]);
export const orderTypeSchema = z.enum(["market", "limit"]);

export const marketAssetSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  assetClass: assetClassSchema,
  sector: z.string().optional(),
  region: z.string().optional(),
  price: z.number().positive(),
  changePercent24h: z.number(),
  changeAbs: z.number().optional(),
  volume: z.number().nonnegative().optional(),
  marketCap: z.number().nonnegative().optional(),
  volatility: z.number().nonnegative().optional(),
  timestamp: z.string().datetime(),
  provider: z.string().min(1)
});

export const marketCandleSchema = z.object({
  symbol: z.string().min(1),
  timestamp: z.string().datetime(),
  open: z.number().positive(),
  high: z.number().positive(),
  low: z.number().positive(),
  close: z.number().positive(),
  volume: z.number().nonnegative().optional(),
  provider: z.string().min(1)
});

export const aiAssetAnalysisSchema = z.object({
  symbol: z.string().min(1),
  headline: z.string().min(1).max(140),
  summary: z.string().min(1).max(900),
  signal: z.enum(["buy_more", "hold", "reduce", "sell", "watch"]),
  confidence: z.number().min(0).max(1),
  timeHorizon: z.enum(["intraday", "short_term", "medium_term", "long_term"]),
  riskLevel: z.enum(["low", "medium", "high"]),
  keyDrivers: z.array(z.string().min(1)).min(1).max(6),
  geopoliticalImpact: z.object({
    level: z.enum(["low", "medium", "high"]),
    explanation: z.string().min(1).max(500),
    linkedEvents: z.array(z.string()).max(8)
  }),
  technicalView: z.object({
    trend: z.enum(["bullish", "neutral", "bearish"]),
    support: z.number().positive().optional(),
    resistance: z.number().positive().optional(),
    volatilityComment: z.string().min(1).max(400)
  }),
  portfolioImpact: z.object({
    exposurePercent: z.number().min(0).max(100),
    concentrationRisk: z.string().min(1).max(500),
    suggestedAdjustment: z.string().max(500).optional()
  }),
  disclaimer: z.string().min(1).max(400)
});

export const aiPortfolioAnalysisSchema = z.object({
  portfolioValue: z.number().nonnegative(),
  dailyChangePercent: z.number(),
  dailyChangeAmount: z.number(),
  overallSignal: z.enum(["risk_on", "balanced", "risk_off", "rebalance_needed"]),
  headline: z.string().min(1).max(140),
  summary: z.string().min(1).max(900),
  nudges: z.array(z.object({
    id: z.string().min(1),
    severity: z.enum(["info", "warning", "urgent"]),
    title: z.string().min(1).max(120),
    message: z.string().min(1).max(500),
    actionLabel: z.string().max(80).optional(),
    linkedSymbols: z.array(z.string()).optional()
  })).max(6),
  recommendedActions: z.array(z.object({
    type: z.enum(["buy_more", "sell", "reduce", "hold", "rebalance"]),
    symbol: z.string().optional(),
    reason: z.string().min(1).max(500),
    estimatedImpact: z.string().min(1).max(500)
  })).max(8),
  riskBreakdown: z.object({
    concentration: z.string(),
    sectorExposure: z.string(),
    cryptoExposure: z.string(),
    geopoliticalExposure: z.string(),
    liquidityRisk: z.string()
  }),
  disclaimer: z.string().min(1).max(400)
});

export const createPortfolioSchema = z.object({
  name: z.string().min(1).max(80),
  mode: portfolioModeSchema.default("simulation"),
  walletAddress: z.string().optional()
});

export const createPositionSchema = z.object({
  symbol: z.string().min(1).max(32),
  name: z.string().min(1).max(120).optional(),
  assetClass: assetClassSchema,
  provider: z.string().min(1).max(40).optional(),
  quantity: z.number().positive(),
  avgCost: z.number().nonnegative()
});

export const simulatePortfolioSchema = z.object({
  changes: z.array(z.object({
    symbol: z.string().min(1),
    side: orderSideSchema,
    amountUsd: z.number().positive()
  })).min(1)
});

export const orderIntentSchema = z.object({
  portfolioId: z.string().optional(),
  symbol: z.string().min(1).max(32),
  side: orderSideSchema,
  orderType: orderTypeSchema,
  amountUsd: z.number().positive().optional(),
  quantity: z.number().positive().optional(),
  limitPrice: z.number().positive().optional(),
  mode: tradingModeSchema
}).refine((value) => value.amountUsd || value.quantity, {
  message: "Either amountUsd or quantity is required."
});

export type AIAssetAnalysis = z.infer<typeof aiAssetAnalysisSchema>;
export type AIPortfolioAnalysis = z.infer<typeof aiPortfolioAnalysisSchema>;
