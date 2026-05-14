-- Sprint 8 — analytics rollups, exports, audit log.

CREATE TABLE "DailyMetric" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "orderCount" INTEGER NOT NULL DEFAULT 0,
  "newCustomerCount" INTEGER NOT NULL DEFAULT 0,
  "completedOrderCount" INTEGER NOT NULL DEFAULT 0,
  "cancelledOrderCount" INTEGER NOT NULL DEFAULT 0,
  "refundedOrderCount" INTEGER NOT NULL DEFAULT 0,
  "avgPrepMinutes" DOUBLE PRECISION,
  "avgOrderValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "paymentMethodBreakdown" JSONB NOT NULL DEFAULT '{}',
  "topItems" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DailyMetric_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyMetric_restaurantId_date_key" ON "DailyMetric"("restaurantId", "date");
CREATE INDEX "DailyMetric_restaurantId_date_idx" ON "DailyMetric"("restaurantId", "date");

CREATE TABLE "Export" (
  "id" TEXT NOT NULL,
  "requestedByUserId" TEXT NOT NULL,
  "restaurantId" TEXT,
  "kind" TEXT NOT NULL,
  "params" JSONB NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'queued',
  "filePath" TEXT,
  "fileSize" INTEGER,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Export_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Export_requestedByUserId_createdAt_idx" ON "Export"("requestedByUserId", "createdAt");
CREATE INDEX "Export_status_expiresAt_idx" ON "Export"("status", "expiresAt");

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "restaurantId" TEXT,
  "action" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "beforeJson" JSONB,
  "afterJson" JSONB,
  "ip" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_restaurantId_createdAt_idx" ON "AuditLog"("restaurantId", "createdAt");
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
