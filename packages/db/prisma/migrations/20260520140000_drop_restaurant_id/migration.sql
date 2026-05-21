-- Single-restaurant refactor: drop restaurantId from every child table.
-- See .claude/plans/drop-restaurant-id.md for the full plan.

-- DropForeignKey
ALTER TABLE "MenuCategory" DROP CONSTRAINT "MenuCategory_restaurantId_fkey";

-- DropForeignKey
ALTER TABLE "OperatingHours" DROP CONSTRAINT "OperatingHours_restaurantId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_restaurantId_fkey";

-- DropForeignKey
ALTER TABLE "Promotion" DROP CONSTRAINT "Promotion_restaurantId_fkey";

-- DropForeignKey
ALTER TABLE "Reservation" DROP CONSTRAINT "Reservation_restaurantId_fkey";

-- DropForeignKey
ALTER TABLE "Table" DROP CONSTRAINT "Table_restaurantId_fkey";

-- DropIndex
DROP INDEX "AuditLog_restaurantId_createdAt_idx";

-- DropIndex
DROP INDEX "ContactMessage_restaurantId_createdAt_idx";

-- DropIndex
DROP INDEX "DailyMetric_restaurantId_date_idx";

-- DropIndex
DROP INDEX "DailyMetric_restaurantId_date_key";

-- DropIndex
DROP INDEX "MenuCategory_restaurantId_slug_key";

-- DropIndex
DROP INDEX "OperatingHours_restaurantId_dayOfWeek_key";

-- DropIndex
DROP INDEX "Order_restaurantId_status_createdAt_idx";

-- DropIndex
DROP INDEX "Promotion_restaurantId_isArchived_idx";

-- DropIndex
DROP INDEX "Reservation_restaurantId_startAt_idx";

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "restaurantId";

-- AlterTable
ALTER TABLE "Cart" DROP COLUMN "restaurantId";

-- AlterTable
ALTER TABLE "ContactMessage" DROP COLUMN "restaurantId";

-- AlterTable
ALTER TABLE "DailyMetric" DROP COLUMN "restaurantId";

-- AlterTable
ALTER TABLE "Export" DROP COLUMN "restaurantId";

-- AlterTable
ALTER TABLE "MenuCategory" DROP COLUMN "restaurantId";

-- AlterTable
ALTER TABLE "OperatingHours" DROP COLUMN "restaurantId";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "restaurantId";

-- AlterTable
ALTER TABLE "Promotion" DROP COLUMN "restaurantId";

-- AlterTable
ALTER TABLE "Reservation" DROP COLUMN "restaurantId";

-- AlterTable
ALTER TABLE "StaffInvite" DROP COLUMN "restaurantId";

-- AlterTable
ALTER TABLE "Table" DROP COLUMN "restaurantId";

-- CreateIndex
CREATE INDEX "ContactMessage_createdAt_idx" ON "ContactMessage"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMetric_date_key" ON "DailyMetric"("date");

-- CreateIndex
CREATE UNIQUE INDEX "MenuCategory_slug_key" ON "MenuCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "OperatingHours_dayOfWeek_key" ON "OperatingHours"("dayOfWeek");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Promotion_isArchived_idx" ON "Promotion"("isArchived");

-- CreateIndex
CREATE INDEX "Reservation_startAt_idx" ON "Reservation"("startAt");
