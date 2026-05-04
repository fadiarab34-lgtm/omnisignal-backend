CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "walletAddress" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "tokenSymbol" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "treasuryAddress" TEXT NOT NULL,
    "expectedAmountToken" DECIMAL(28,10) NOT NULL,
    "amountUsd" DECIMAL(28,10) NOT NULL,
    "status" TEXT NOT NULL,
    "txHash" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "rawJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PremiumSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PremiumSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessagingLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalChatId" TEXT,
    "linkCode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linkedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessagingLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Payment_txHash_key" ON "Payment"("txHash");
CREATE INDEX "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt");
CREATE INDEX "Payment_walletAddress_createdAt_idx" ON "Payment"("walletAddress", "createdAt");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE UNIQUE INDEX "PremiumSubscription_userId_walletAddress_plan_key" ON "PremiumSubscription"("userId", "walletAddress", "plan");
CREATE INDEX "PremiumSubscription_walletAddress_idx" ON "PremiumSubscription"("walletAddress");
CREATE INDEX "PremiumSubscription_status_expiresAt_idx" ON "PremiumSubscription"("status", "expiresAt");
CREATE UNIQUE INDEX "MessagingLink_linkCode_key" ON "MessagingLink"("linkCode");
CREATE INDEX "MessagingLink_userId_provider_idx" ON "MessagingLink"("userId", "provider");
CREATE INDEX "MessagingLink_externalChatId_provider_idx" ON "MessagingLink"("externalChatId", "provider");
CREATE INDEX "MessagingLink_walletAddress_idx" ON "MessagingLink"("walletAddress");

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "PremiumSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PremiumSubscription" ADD CONSTRAINT "PremiumSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PremiumSubscription" ADD CONSTRAINT "PremiumSubscription_walletAddress_fkey" FOREIGN KEY ("walletAddress") REFERENCES "Wallet"("address") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessagingLink" ADD CONSTRAINT "MessagingLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
