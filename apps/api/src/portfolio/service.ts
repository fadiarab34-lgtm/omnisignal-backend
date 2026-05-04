import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type { MarketDataService } from "@omnisignal/market-connectors";
import { ValidationError } from "@omnisignal/shared";
import { applySimulationTrade } from "@omnisignal/trading";

type PositionWithNumbers = {
  id: string;
  symbol: string;
  name: string;
  assetClass: string;
  provider: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  allocationPercent: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  dailyChangePercent: number;
};

const decimal = (value: number) => new Prisma.Decimal(Number.isFinite(value) ? value : 0);
const asNumber = (value: Prisma.Decimal | number | null | undefined) => Number(value ?? 0);

export class PortfolioService {
  constructor(private readonly prisma: PrismaClient, private readonly marketData: MarketDataService) {}

  async list(userId: string, walletAddress: string) {
    const portfolios = await this.prisma.portfolio.findMany({
      where: { userId, walletAddress },
      orderBy: { updatedAt: "desc" },
      include: { positions: { orderBy: { marketValue: "desc" } }, aiNudges: { orderBy: { createdAt: "desc" }, take: 3 } }
    });
    return portfolios.map((portfolio) => this.serializePortfolio(portfolio));
  }

  async create(userId: string, walletAddress: string, data: { name: string; mode: "simulation" | "imported" | "trading" }) {
    return this.serializePortfolio(await this.prisma.portfolio.create({
      data: {
        userId,
        walletAddress,
        name: data.name,
        mode: data.mode
      },
      include: { positions: true, aiNudges: true }
    }));
  }

  async getOwned(userId: string, portfolioId: string) {
    const portfolio = await this.prisma.portfolio.findFirst({
      where: { id: portfolioId, userId },
      include: { positions: true, aiNudges: { orderBy: { createdAt: "desc" }, take: 3 } }
    });
    if (!portfolio) throw new ValidationError("Portfolio not found.");
    if (portfolio.positions.length === 0) return this.serializePortfolio(portfolio);
    return this.refresh(portfolio.id, userId);
  }

  async addPosition(userId: string, portfolioId: string, data: {
    symbol: string;
    name?: string;
    assetClass: "equity" | "crypto" | "forex" | "commodity" | "index" | "etf" | "perp";
    provider?: string;
    quantity: number;
    avgCost: number;
  }) {
    const portfolio = await this.prisma.portfolio.findFirst({ where: { id: portfolioId, userId } });
    if (!portfolio) throw new ValidationError("Portfolio not found.");
    const quote = await this.marketData.getQuote(data.symbol, { assetClass: data.assetClass, name: data.name });
    await this.prisma.position.upsert({
      where: { portfolioId_symbol: { portfolioId, symbol: quote.symbol } },
      update: {
        name: data.name ?? quote.name,
        assetClass: data.assetClass,
        provider: quote.provider,
        quantity: decimal(data.quantity),
        avgCost: decimal(data.avgCost),
        currentPrice: decimal(quote.price),
        dailyChangePercent: decimal(quote.changePercent24h)
      },
      create: {
        portfolioId,
        symbol: quote.symbol,
        name: data.name ?? quote.name,
        assetClass: data.assetClass,
        provider: quote.provider,
        quantity: decimal(data.quantity),
        avgCost: decimal(data.avgCost),
        currentPrice: decimal(quote.price),
        marketValue: decimal(0),
        allocationPercent: decimal(0),
        unrealizedPnl: decimal(0),
        unrealizedPnlPercent: decimal(0),
        dailyChangePercent: decimal(quote.changePercent24h)
      }
    });
    await this.prisma.transaction.create({
      data: {
        portfolioId,
        type: "buy",
        symbol: quote.symbol,
        amountUsd: decimal(data.quantity * data.avgCost),
        quantity: decimal(data.quantity),
        price: decimal(data.avgCost),
        mode: portfolio.mode === "trading" ? "testnet" : "simulation"
      }
    });
    return this.refresh(portfolioId, userId);
  }

  async simulate(userId: string, portfolioId: string, changes: Array<{ symbol: string; side: "buy" | "sell"; amountUsd: number }>) {
    const before = await this.getOwned(userId, portfolioId);
    if (before.mode !== "simulation") throw new ValidationError("Simulation endpoint requires a simulation-mode portfolio.");
    for (const change of changes) {
      const existing = before.positions.find((position) => position.symbol === change.symbol);
      const quote = await this.marketData.getQuote(change.symbol, existing ? { assetClass: existing.assetClass as never, name: existing.name } : undefined);
      const updated = applySimulationTrade(existing ? {
        symbol: existing.symbol,
        quantity: existing.quantity,
        avgCost: existing.avgCost
      } : undefined, quote, change.side, change.amountUsd);
      await this.prisma.position.upsert({
        where: { portfolioId_symbol: { portfolioId, symbol: quote.symbol } },
        update: {
          quantity: decimal(updated.quantity),
          avgCost: decimal(updated.avgCost),
          currentPrice: decimal(quote.price),
          dailyChangePercent: decimal(quote.changePercent24h)
        },
        create: {
          portfolioId,
          symbol: quote.symbol,
          name: quote.name,
          assetClass: quote.assetClass,
          provider: quote.provider,
          quantity: decimal(updated.quantity),
          avgCost: decimal(updated.avgCost),
          currentPrice: decimal(quote.price),
          marketValue: decimal(0),
          allocationPercent: decimal(0),
          unrealizedPnl: decimal(0),
          unrealizedPnlPercent: decimal(0),
          dailyChangePercent: decimal(quote.changePercent24h)
        }
      });
      await this.prisma.transaction.create({
        data: {
          portfolioId,
          type: change.side,
          symbol: quote.symbol,
          amountUsd: decimal(change.amountUsd),
          quantity: decimal(change.amountUsd / quote.price),
          price: decimal(quote.price),
          mode: "simulation"
        }
      });
    }
    const after = await this.refresh(portfolioId, userId);
    await this.prisma.simulation.create({
      data: {
        portfolioId,
        userId,
        changesJson: changes,
        beforeJson: before,
        afterJson: after
      }
    });
    return after;
  }

  async resetSimulation(userId: string, portfolioId: string) {
    const latest = await this.prisma.simulation.findFirst({ where: { userId, portfolioId }, orderBy: { createdAt: "desc" } });
    if (!latest) throw new ValidationError("No saved simulation state to reset.");
    const before = latest.beforeJson as { positions?: PositionWithNumbers[] };
    await this.prisma.position.deleteMany({ where: { portfolioId } });
    for (const position of before.positions ?? []) {
      await this.prisma.position.create({
        data: {
          portfolioId,
          symbol: position.symbol,
          name: position.name,
          assetClass: position.assetClass as never,
          provider: position.provider,
          quantity: decimal(position.quantity),
          avgCost: decimal(position.avgCost),
          currentPrice: decimal(position.currentPrice),
          marketValue: decimal(position.marketValue),
          allocationPercent: decimal(position.allocationPercent),
          unrealizedPnl: decimal(position.unrealizedPnl),
          unrealizedPnlPercent: decimal(position.unrealizedPnlPercent),
          dailyChangePercent: decimal(position.dailyChangePercent)
        }
      });
    }
    return this.refresh(portfolioId, userId);
  }

  async refresh(portfolioId: string, userId: string) {
    const portfolio = await this.prisma.portfolio.findFirst({ where: { id: portfolioId, userId }, include: { positions: true, aiNudges: { orderBy: { createdAt: "desc" }, take: 3 } } });
    if (!portfolio) throw new ValidationError("Portfolio not found.");
    const updated: PositionWithNumbers[] = [];
    for (const position of portfolio.positions) {
      const quote = await this.marketData.getQuote(position.symbol, {
        assetClass: position.assetClass.toString() as never,
        name: position.name
      });
      const quantity = asNumber(position.quantity);
      const avgCost = asNumber(position.avgCost);
      const currentPrice = quote.price;
      const marketValue = quantity * currentPrice;
      const costBasis = quantity * avgCost;
      const unrealizedPnl = marketValue - costBasis;
      const unrealizedPnlPercent = costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0;
      const saved = await this.prisma.position.update({
        where: { id: position.id },
        data: {
          provider: quote.provider,
          currentPrice: decimal(currentPrice),
          marketValue: decimal(marketValue),
          unrealizedPnl: decimal(unrealizedPnl),
          unrealizedPnlPercent: decimal(unrealizedPnlPercent),
          dailyChangePercent: decimal(quote.changePercent24h)
        }
      });
      updated.push(this.serializePosition(saved));
    }
    const totalValue = updated.reduce((sum, position) => sum + position.marketValue, 0);
    const withAllocations = await Promise.all(updated.map(async (position) => {
      const allocationPercent = totalValue > 0 ? (position.marketValue / totalValue) * 100 : 0;
      const saved = await this.prisma.position.update({ where: { id: position.id }, data: { allocationPercent: decimal(allocationPercent) } });
      return this.serializePosition(saved);
    }));
    const dailyChangeAmount = withAllocations.reduce((sum, position) => {
      const previousPrice = position.currentPrice / (1 + position.dailyChangePercent / 100);
      return sum + ((position.currentPrice - previousPrice) * position.quantity);
    }, 0);
    const dailyChangePercent = totalValue > 0 ? (dailyChangeAmount / (totalValue - dailyChangeAmount)) * 100 : 0;
    const riskScore = this.calculateRiskScore(withAllocations);
    const savedPortfolio = await this.prisma.portfolio.update({
      where: { id: portfolioId },
      data: {
        totalValue: decimal(totalValue),
        dailyChangeAmount: decimal(dailyChangeAmount),
        dailyChangePercent: decimal(dailyChangePercent),
        riskScore: decimal(riskScore)
      },
      include: { positions: true, aiNudges: { orderBy: { createdAt: "desc" }, take: 3 } }
    });
    await this.prisma.portfolioSnapshot.create({
      data: {
        portfolioId,
        totalValue: decimal(totalValue),
        dailyChangeAmount: decimal(dailyChangeAmount),
        dailyChangePercent: decimal(dailyChangePercent),
        positionsJson: withAllocations
      }
    });
    return this.serializePortfolio(savedPortfolio);
  }

  serializePortfolio(portfolio: Prisma.PortfolioGetPayload<{ include: { positions: true; aiNudges: true } }>) {
    return {
      id: portfolio.id,
      userId: portfolio.userId,
      walletAddress: portfolio.walletAddress,
      name: portfolio.name,
      mode: portfolio.mode,
      totalValue: asNumber(portfolio.totalValue),
      dailyChangeAmount: asNumber(portfolio.dailyChangeAmount),
      dailyChangePercent: asNumber(portfolio.dailyChangePercent),
      riskScore: portfolio.riskScore === null ? null : asNumber(portfolio.riskScore),
      positions: portfolio.positions.map((position) => this.serializePosition(position)),
      aiNudges: portfolio.aiNudges,
      createdAt: portfolio.createdAt.toISOString(),
      updatedAt: portfolio.updatedAt.toISOString()
    };
  }

  serializePosition(position: Prisma.PositionGetPayload<object>): PositionWithNumbers {
    return {
      id: position.id,
      symbol: position.symbol,
      name: position.name,
      assetClass: position.assetClass,
      provider: position.provider,
      quantity: asNumber(position.quantity),
      avgCost: asNumber(position.avgCost),
      currentPrice: asNumber(position.currentPrice),
      marketValue: asNumber(position.marketValue),
      allocationPercent: asNumber(position.allocationPercent),
      unrealizedPnl: asNumber(position.unrealizedPnl),
      unrealizedPnlPercent: asNumber(position.unrealizedPnlPercent),
      dailyChangePercent: asNumber(position.dailyChangePercent)
    };
  }

  private calculateRiskScore(positions: PositionWithNumbers[]): number {
    if (positions.length === 0) return 0;
    const maxAllocation = Math.max(...positions.map((position) => position.allocationPercent));
    const cryptoAllocation = positions.filter((position) => position.assetClass === "crypto" || position.assetClass === "perp").reduce((sum, position) => sum + position.allocationPercent, 0);
    const volatility = positions.reduce((sum, position) => sum + Math.abs(position.dailyChangePercent) * (position.allocationPercent / 100), 0);
    return Math.min(100, maxAllocation * 0.55 + cryptoAllocation * 0.25 + volatility * 2);
  }
}
