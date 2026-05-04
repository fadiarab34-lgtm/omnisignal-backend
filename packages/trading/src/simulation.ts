import type { MarketAsset, OrderSide } from "@omnisignal/shared";
import { ValidationError } from "@omnisignal/shared";

export type SimulationPosition = {
  symbol: string;
  quantity: number;
  avgCost: number;
};

export function applySimulationTrade(position: SimulationPosition | undefined, asset: MarketAsset, side: OrderSide, amountUsd: number): SimulationPosition {
  if (amountUsd <= 0) throw new ValidationError("Simulation amount must be positive.");
  const quantityDelta = amountUsd / asset.price;
  if (!position) {
    if (side === "sell") throw new ValidationError("Cannot simulate selling a position that does not exist.");
    return { symbol: asset.symbol, quantity: quantityDelta, avgCost: asset.price };
  }
  if (side === "buy") {
    const newQuantity = position.quantity + quantityDelta;
    const newCost = ((position.quantity * position.avgCost) + amountUsd) / newQuantity;
    return { ...position, quantity: newQuantity, avgCost: newCost };
  }
  const newQuantity = position.quantity - quantityDelta;
  if (newQuantity < -1e-8) throw new ValidationError("Simulation sell amount exceeds current position quantity.");
  return { ...position, quantity: Math.max(0, newQuantity), avgCost: position.avgCost };
}
