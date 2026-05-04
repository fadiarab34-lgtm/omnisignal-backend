import { TradingDisabledError, ValidationError, orderIntentSchema } from "@omnisignal/shared";
import type { TradingMode } from "@omnisignal/shared";

export type TradingSafetyConfig = {
  disableTrading: boolean;
  tradingMode: TradingMode;
  enableMainnetTrading: boolean;
  maxOrderUsd?: number;
};

export function validateTradingSafety(input: unknown, config: TradingSafetyConfig) {
  const parsed = orderIntentSchema.parse(input);
  if (config.disableTrading && parsed.mode !== "simulation") {
    throw new TradingDisabledError();
  }
  if (parsed.mode === "mainnet" && !config.enableMainnetTrading) {
    throw new TradingDisabledError("Mainnet trading is disabled. Set ENABLE_MAINNET_TRADING=true only after testnet verification.");
  }
  if (parsed.mode !== config.tradingMode && config.tradingMode !== "simulation") {
    throw new ValidationError(`Requested trading mode ${parsed.mode} does not match configured mode ${config.tradingMode}.`);
  }
  if (config.maxOrderUsd && parsed.amountUsd && parsed.amountUsd > config.maxOrderUsd) {
    throw new ValidationError(`Order exceeds configured maximum of ${config.maxOrderUsd} USD.`);
  }
  return parsed;
}
