import OpenAI from "openai";
import {
  ProviderUnavailableError,
  aiAssetAnalysisSchema,
  aiPortfolioAnalysisSchema,
  type AIAssetAnalysis,
  type AIPortfolioAnalysis,
  type MarketAsset,
  type MarketCandle
} from "@omnisignal/shared";
import { AI_SYSTEM_PROMPT } from "./prompts";
import { aiAssetAnalysisJsonSchema, aiPortfolioAnalysisJsonSchema } from "./json-schemas";

export type NewsEventContext = {
  id: string;
  source: string;
  title: string;
  summary?: string | null;
  url?: string | null;
  publishedAt?: Date | string | null;
  affectedSymbols?: string[];
  affectedSectors?: string[];
  affectedRegions?: string[];
  sentimentScore?: number | null;
  riskType?: string | null;
  confidence?: number | null;
};

export type PortfolioContext = {
  id?: string;
  name?: string;
  totalValue?: number;
  dailyChangeAmount?: number;
  dailyChangePercent?: number;
  riskScore?: number | null;
  positions?: Array<{
    symbol: string;
    assetClass: string;
    quantity: number;
    currentPrice?: number | null;
    marketValue?: number | null;
    allocationPercent?: number | null;
    dailyChangePercent?: number | null;
  }>;
};

export class AIAnalysisService {
  private readonly client?: OpenAI;
  private readonly model: string;

  constructor(options: { apiKey?: string; model?: string }) {
    this.model = options.model ?? "gpt-4.1-mini";
    this.client = options.apiKey ? new OpenAI({ apiKey: options.apiKey }) : undefined;
  }

  isConfigured(): boolean {
    return Boolean(this.client);
  }

  async analyzeAsset(input: {
    asset: MarketAsset;
    candles?: MarketCandle[];
    newsEvents: NewsEventContext[];
    portfolioContext?: PortfolioContext;
  }): Promise<AIAssetAnalysis> {
    const content = await this.structuredResponse("omnisignal_asset_analysis", aiAssetAnalysisJsonSchema, {
      task: "Analyze one asset for the OmniSignal asset detail panel.",
      asset: input.asset,
      candles: input.candles?.slice(-120) ?? [],
      newsEvents: input.newsEvents,
      portfolioContext: input.portfolioContext,
      requiredDisclaimer: "Informational analysis only. This is not financial advice and does not guarantee outcomes."
    });
    return aiAssetAnalysisSchema.parse(content);
  }

  async analyzePortfolio(input: {
    portfolio: PortfolioContext;
    marketData: MarketAsset[];
    newsEvents: NewsEventContext[];
  }): Promise<AIPortfolioAnalysis> {
    const content = await this.structuredResponse("omnisignal_portfolio_analysis", aiPortfolioAnalysisJsonSchema, {
      task: "Analyze a wallet-authenticated portfolio using current database positions and live market data.",
      portfolio: input.portfolio,
      marketData: input.marketData,
      newsEvents: input.newsEvents,
      requiredDisclaimer: "Informational analysis only. This is not financial advice and does not guarantee outcomes."
    });
    return aiPortfolioAnalysisSchema.parse(content);
  }

  async generateNudge(input: { event: NewsEventContext; portfolioContext: PortfolioContext }): Promise<AIPortfolioAnalysis["nudges"][number]> {
    const analysis = await this.analyzePortfolio({
      portfolio: input.portfolioContext,
      marketData: [],
      newsEvents: [input.event]
    });
    const nudge = analysis.nudges[0];
    if (!nudge) {
      throw new ProviderUnavailableError("openai", "OpenAI returned no nudge for the supplied event.", "degraded");
    }
    return nudge;
  }

  async explainTradeIntent(input: {
    orderIntent: unknown;
    riskProfile: unknown;
    portfolioContext?: PortfolioContext;
  }): Promise<{ explanation: string; warnings: string[]; requiresVisualConfirmation: true }> {
    const content = await this.rawJsonResponse({
      task: "Explain an order ticket before user confirmation. Do not execute the trade.",
      orderIntent: input.orderIntent,
      riskProfile: input.riskProfile,
      portfolioContext: input.portfolioContext,
      requiredShape: {
        explanation: "short explanation",
        warnings: ["risk warning"],
        requiresVisualConfirmation: true
      }
    });
    return {
      explanation: String(content.explanation ?? ""),
      warnings: Array.isArray(content.warnings) ? content.warnings.map(String) : [],
      requiresVisualConfirmation: true
    };
  }

  async generateVoiceResponse(input: {
    userSpeech: string;
    portfolioContext?: PortfolioContext;
    marketContext?: MarketAsset[];
    uiState?: unknown;
  }): Promise<{ text: string; toolCall?: { name: string; arguments: Record<string, unknown> } }> {
    const content = await this.rawJsonResponse({
      task: "Return a short spoken response and optional safe UI tool call.",
      allowedTools: ["navigate", "selectAsset", "simulateBuy", "simulateSell", "openOrderTicket", "runPortfolioAnalysis", "filterHeatmap", "closeUniverse"],
      userSpeech: input.userSpeech,
      portfolioContext: input.portfolioContext,
      marketContext: input.marketContext,
      uiState: input.uiState,
      rule: "Voice can prepare real order tickets only; it must not execute orders."
    });
    return {
      text: String(content.text ?? ""),
      toolCall: typeof content.toolCall === "object" && content.toolCall
        ? {
            name: String((content.toolCall as { name?: unknown }).name ?? ""),
            arguments: ((content.toolCall as { arguments?: unknown }).arguments ?? {}) as Record<string, unknown>
          }
        : undefined
    };
  }

  private async structuredResponse(name: string, schema: unknown, payload: unknown): Promise<unknown> {
    if (!this.client) throw new ProviderUnavailableError("openai", "Missing OPENAI_API_KEY", "missing_config");
    const response = await this.client.responses.create({
      model: this.model,
      instructions: AI_SYSTEM_PROMPT,
      input: JSON.stringify(payload),
      text: {
        format: {
          type: "json_schema",
          name,
          strict: true,
          schema: schema as Record<string, unknown>
        }
      }
    });
    return this.parseResponseJson(response);
  }

  private async rawJsonResponse(payload: unknown): Promise<Record<string, unknown>> {
    if (!this.client) throw new ProviderUnavailableError("openai", "Missing OPENAI_API_KEY", "missing_config");
    const response = await this.client.responses.create({
      model: this.model,
      instructions: `${AI_SYSTEM_PROMPT}\nReturn strict JSON only.`,
      input: JSON.stringify(payload),
      text: { format: { type: "json_object" } }
    });
    const parsed = this.parseResponseJson(response);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new ProviderUnavailableError("openai", "OpenAI did not return a JSON object.", "degraded");
    }
    return parsed as Record<string, unknown>;
  }

  private parseResponseJson(response: unknown): unknown {
    const outputText = typeof response === "object" && response !== null && "output_text" in response
      ? String((response as { output_text?: unknown }).output_text ?? "")
      : "";
    if (!outputText) {
      const output = (response as { output?: Array<{ content?: Array<{ text?: string }> }> }).output ?? [];
      const text = output.flatMap((item) => item.content ?? []).map((item) => item.text ?? "").join("");
      if (!text) throw new ProviderUnavailableError("openai", "OpenAI response did not include text output.", "degraded");
      return JSON.parse(text);
    }
    return JSON.parse(outputText);
  }
}
