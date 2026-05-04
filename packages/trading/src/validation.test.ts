import { describe, expect, it } from "vitest";
import { TradingDisabledError } from "@omnisignal/shared";
import { validateTradingSafety } from "./validation";

describe("trading safety validation", () => {
  it("blocks non-simulation orders when the kill switch is active", () => {
    expect(() => validateTradingSafety({
      symbol: "BTC-PERP",
      side: "buy",
      orderType: "market",
      amountUsd: 100,
      mode: "testnet"
    }, {
      disableTrading: true,
      tradingMode: "testnet",
      enableMainnetTrading: false
    })).toThrow(TradingDisabledError);
  });
});
