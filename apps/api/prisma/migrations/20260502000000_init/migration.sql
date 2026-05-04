CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "PortfolioMode" AS ENUM ('simulation', 'imported', 'trading');
CREATE TYPE "AssetClass" AS ENUM ('equity', 'crypto', 'forex', 'commodity', 'index', 'etf', 'perp');
CREATE TYPE "TransactionType" AS ENUM ('buy', 'sell', 'rebalance', 'deposit', 'withdrawal');
CREATE TYPE "OrderSide" AS ENUM ('buy', 'sell');
CREATE TYPE "OrderType" AS ENUM ('market', 'limit');
CREATE TYPE "TradingMode" AS ENUM ('simulation', 'testnet', 'mainnet');
CREATE TYPE "ProviderStatusValue" AS ENUM ('healthy', 'degraded', 'down', 'missing_config');

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "email" TEXT UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Wallet" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "address" TEXT NOT NULL UNIQUE,
  "chainId" TEXT,
  "verifiedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "WalletNonce" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "walletAddress" TEXT NOT NULL,
  "nonce" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Portfolio" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "walletAddress" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "mode" "PortfolioMode" NOT NULL,
  "totalValue" DECIMAL(28,10) NOT NULL DEFAULT 0,
  "dailyChangeAmount" DECIMAL(28,10) NOT NULL DEFAULT 0,
  "dailyChangePercent" DECIMAL(18,8) NOT NULL DEFAULT 0,
  "riskScore" DECIMAL(8,4),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Position" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "portfolioId" TEXT NOT NULL REFERENCES "Portfolio"("id") ON DELETE CASCADE,
  "symbol" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "assetClass" "AssetClass" NOT NULL,
  "provider" TEXT NOT NULL,
  "quantity" DECIMAL(28,10) NOT NULL,
  "avgCost" DECIMAL(28,10) NOT NULL,
  "currentPrice" DECIMAL(28,10) NOT NULL DEFAULT 0,
  "marketValue" DECIMAL(28,10) NOT NULL DEFAULT 0,
  "allocationPercent" DECIMAL(18,8) NOT NULL DEFAULT 0,
  "unrealizedPnl" DECIMAL(28,10) NOT NULL DEFAULT 0,
  "unrealizedPnlPercent" DECIMAL(18,8) NOT NULL DEFAULT 0,
  "dailyChangePercent" DECIMAL(18,8) NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("portfolioId", "symbol")
);

CREATE TABLE "PortfolioSnapshot" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "portfolioId" TEXT NOT NULL REFERENCES "Portfolio"("id") ON DELETE CASCADE,
  "totalValue" DECIMAL(28,10) NOT NULL,
  "dailyChangeAmount" DECIMAL(28,10) NOT NULL,
  "dailyChangePercent" DECIMAL(18,8) NOT NULL,
  "positionsJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Transaction" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "portfolioId" TEXT NOT NULL REFERENCES "Portfolio"("id") ON DELETE CASCADE,
  "positionId" TEXT REFERENCES "Position"("id") ON DELETE SET NULL,
  "type" "TransactionType" NOT NULL,
  "symbol" TEXT,
  "amountUsd" DECIMAL(28,10) NOT NULL,
  "quantity" DECIMAL(28,10) NOT NULL,
  "price" DECIMAL(28,10) NOT NULL,
  "mode" "TradingMode" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Simulation" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "portfolioId" TEXT NOT NULL REFERENCES "Portfolio"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "changesJson" JSONB NOT NULL,
  "beforeJson" JSONB NOT NULL,
  "afterJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "NewsEvent" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "source" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "url" TEXT,
  "publishedAt" TIMESTAMP(3),
  "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "affectedSymbols" TEXT[] NOT NULL,
  "affectedSectors" TEXT[] NOT NULL,
  "affectedRegions" TEXT[] NOT NULL,
  "sentimentScore" DECIMAL(8,4),
  "riskType" TEXT,
  "confidence" DECIMAL(8,4),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("source", "url")
);

CREATE TABLE "AISignal" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT REFERENCES "User"("id") ON DELETE CASCADE,
  "portfolioId" TEXT REFERENCES "Portfolio"("id") ON DELETE CASCADE,
  "symbol" TEXT,
  "type" TEXT NOT NULL,
  "headline" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "signal" TEXT NOT NULL,
  "confidence" DECIMAL(8,4) NOT NULL,
  "rawJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "AINudge" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "portfolioId" TEXT REFERENCES "Portfolio"("id") ON DELETE CASCADE,
  "severity" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "actionLabel" TEXT,
  "linkedSymbols" TEXT[] NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "OrderIntent" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "walletAddress" TEXT NOT NULL,
  "portfolioId" TEXT REFERENCES "Portfolio"("id") ON DELETE SET NULL,
  "symbol" TEXT NOT NULL,
  "side" "OrderSide" NOT NULL,
  "orderType" "OrderType" NOT NULL,
  "amountUsd" DECIMAL(28,10),
  "quantity" DECIMAL(28,10),
  "estimatedPrice" DECIMAL(28,10) NOT NULL,
  "estimatedFees" DECIMAL(28,10) NOT NULL,
  "estimatedSlippage" DECIMAL(18,8) NOT NULL,
  "status" TEXT NOT NULL,
  "mode" "TradingMode" NOT NULL,
  "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
  "userConfirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ExecutedOrder" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "orderIntentId" TEXT NOT NULL REFERENCES "OrderIntent"("id") ON DELETE CASCADE,
  "provider" TEXT NOT NULL,
  "externalOrderId" TEXT,
  "status" TEXT NOT NULL,
  "fillPrice" DECIMAL(28,10),
  "fillQuantity" DECIMAL(28,10),
  "fees" DECIMAL(28,10),
  "rawResponse" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ProviderStatus" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "provider" TEXT NOT NULL UNIQUE,
  "status" "ProviderStatusValue" NOT NULL,
  "lastCheckedAt" TIMESTAMP(3) NOT NULL,
  "message" TEXT NOT NULL,
  "latencyMs" INTEGER
);

CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "metadataJson" JSONB NOT NULL,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Wallet_userId_idx" ON "Wallet"("userId");
CREATE INDEX "WalletNonce_walletAddress_idx" ON "WalletNonce"("walletAddress");
CREATE INDEX "WalletNonce_expiresAt_idx" ON "WalletNonce"("expiresAt");
CREATE INDEX "Portfolio_userId_idx" ON "Portfolio"("userId");
CREATE INDEX "Portfolio_walletAddress_idx" ON "Portfolio"("walletAddress");
CREATE INDEX "Position_symbol_idx" ON "Position"("symbol");
CREATE INDEX "PortfolioSnapshot_portfolioId_createdAt_idx" ON "PortfolioSnapshot"("portfolioId", "createdAt");
CREATE INDEX "Transaction_portfolioId_createdAt_idx" ON "Transaction"("portfolioId", "createdAt");
CREATE INDEX "Simulation_portfolioId_createdAt_idx" ON "Simulation"("portfolioId", "createdAt");
CREATE INDEX "Simulation_userId_idx" ON "Simulation"("userId");
CREATE INDEX "NewsEvent_publishedAt_idx" ON "NewsEvent"("publishedAt");
CREATE INDEX "NewsEvent_riskType_idx" ON "NewsEvent"("riskType");
CREATE INDEX "AISignal_userId_idx" ON "AISignal"("userId");
CREATE INDEX "AISignal_portfolioId_idx" ON "AISignal"("portfolioId");
CREATE INDEX "AISignal_symbol_idx" ON "AISignal"("symbol");
CREATE INDEX "AINudge_userId_readAt_createdAt_idx" ON "AINudge"("userId", "readAt", "createdAt");
CREATE INDEX "AINudge_portfolioId_idx" ON "AINudge"("portfolioId");
CREATE INDEX "OrderIntent_userId_createdAt_idx" ON "OrderIntent"("userId", "createdAt");
CREATE INDEX "OrderIntent_walletAddress_idx" ON "OrderIntent"("walletAddress");
CREATE INDEX "OrderIntent_status_idx" ON "OrderIntent"("status");
CREATE INDEX "ExecutedOrder_orderIntentId_idx" ON "ExecutedOrder"("orderIntentId");
CREATE INDEX "ExecutedOrder_status_idx" ON "ExecutedOrder"("status");
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
