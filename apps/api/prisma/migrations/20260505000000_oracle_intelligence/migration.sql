CREATE TABLE "SourceMetadata" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "credibility" DECIMAL(8,4) NOT NULL DEFAULT 0.5,
    "url" TEXT,
    "configStatus" TEXT NOT NULL,
    "lastFetchedAt" TIMESTAMP(3),
    "rawJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceMetadata_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NormalizedSignal" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "summary" TEXT,
    "category" TEXT,
    "entitiesJson" JSONB NOT NULL,
    "sentiment" TEXT NOT NULL,
    "urgencyScore" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "confidenceScore" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "marketImpactScore" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "geoRiskScore" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "crowdingScore" DECIMAL(8,4),
    "divergenceScore" DECIMAL(8,4),
    "affectedAssets" TEXT[] NOT NULL,
    "affectedSectors" TEXT[] NOT NULL,
    "suggestedAction" TEXT NOT NULL,
    "timeHorizon" TEXT NOT NULL,
    "portfolioExposure" DECIMAL(8,4),
    "oracleSummary" TEXT,
    "userAlertRequired" BOOLEAN NOT NULL DEFAULT false,
    "dedupeKey" TEXT NOT NULL,
    "rawJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NormalizedSignal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OracleCard" (
    "id" TEXT NOT NULL,
    "signalId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "whyItMatters" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceCredibility" DECIMAL(8,4) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "affectedCountries" TEXT[] NOT NULL,
    "affectedSectors" TEXT[] NOT NULL,
    "affectedAssets" TEXT[] NOT NULL,
    "direction" TEXT NOT NULL,
    "urgencyScore" DECIMAL(8,4) NOT NULL,
    "confidenceScore" DECIMAL(8,4) NOT NULL,
    "marketImpactScore" DECIMAL(8,4) NOT NULL,
    "geoRiskScore" DECIMAL(8,4) NOT NULL,
    "timeHorizon" TEXT NOT NULL,
    "suggestedAction" TEXT NOT NULL,
    "portfolioExposure" DECIMAL(8,4),
    "marketAlreadyPricing" BOOLEAN,
    "predictionDivergence" DECIMAL(8,4),
    "crowdingScore" DECIMAL(8,4),
    "majorityReport" TEXT,
    "contrarianView" TEXT,
    "rawJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OracleCard_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WatchlistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "assetClass" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchlistItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApprovalAction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "portfolioId" TEXT,
    "actionType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "simulationId" TEXT,
    "orderIntentId" TEXT,
    "rationale" TEXT NOT NULL,
    "metadataJson" JSONB NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalAction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VoiceCommandHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "walletAddress" TEXT,
    "commandText" TEXT NOT NULL,
    "responseText" TEXT,
    "toolName" TEXT,
    "toolArgsJson" JSONB,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceCommandHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SourceMetadata_sourceType_sourceName_provider_key" ON "SourceMetadata"("sourceType", "sourceName", "provider");
CREATE INDEX "SourceMetadata_sourceType_idx" ON "SourceMetadata"("sourceType");
CREATE INDEX "SourceMetadata_configStatus_idx" ON "SourceMetadata"("configStatus");
CREATE UNIQUE INDEX "NormalizedSignal_dedupeKey_key" ON "NormalizedSignal"("dedupeKey");
CREATE INDEX "NormalizedSignal_sourceType_publishedAt_idx" ON "NormalizedSignal"("sourceType", "publishedAt");
CREATE INDEX "NormalizedSignal_category_idx" ON "NormalizedSignal"("category");
CREATE INDEX "NormalizedSignal_sentiment_idx" ON "NormalizedSignal"("sentiment");
CREATE INDEX "NormalizedSignal_userAlertRequired_ingestedAt_idx" ON "NormalizedSignal"("userAlertRequired", "ingestedAt");
CREATE INDEX "OracleCard_signalId_idx" ON "OracleCard"("signalId");
CREATE INDEX "OracleCard_createdAt_idx" ON "OracleCard"("createdAt");
CREATE INDEX "OracleCard_sourceType_idx" ON "OracleCard"("sourceType");
CREATE INDEX "OracleCard_direction_idx" ON "OracleCard"("direction");
CREATE INDEX "OracleCard_suggestedAction_idx" ON "OracleCard"("suggestedAction");
CREATE UNIQUE INDEX "WatchlistItem_userId_symbol_key" ON "WatchlistItem"("userId", "symbol");
CREATE INDEX "WatchlistItem_walletAddress_idx" ON "WatchlistItem"("walletAddress");
CREATE INDEX "ApprovalAction_userId_status_createdAt_idx" ON "ApprovalAction"("userId", "status", "createdAt");
CREATE INDEX "ApprovalAction_walletAddress_idx" ON "ApprovalAction"("walletAddress");
CREATE INDEX "ApprovalAction_sourceType_sourceId_idx" ON "ApprovalAction"("sourceType", "sourceId");
CREATE INDEX "VoiceCommandHistory_userId_createdAt_idx" ON "VoiceCommandHistory"("userId", "createdAt");
CREATE INDEX "VoiceCommandHistory_walletAddress_idx" ON "VoiceCommandHistory"("walletAddress");

ALTER TABLE "OracleCard" ADD CONSTRAINT "OracleCard_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "NormalizedSignal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalAction" ADD CONSTRAINT "ApprovalAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VoiceCommandHistory" ADD CONSTRAINT "VoiceCommandHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
