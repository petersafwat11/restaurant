/*
  Warnings:

  - You are about to drop the column `estimatedDeliveryMinutes` on the `Restaurant` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedPickupMinutes` on the `Restaurant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Restaurant" DROP COLUMN "estimatedDeliveryMinutes",
DROP COLUMN "estimatedPickupMinutes",
ADD COLUMN     "estimatedDeliveryMinutesMax" INTEGER,
ADD COLUMN     "estimatedDeliveryMinutesMin" INTEGER,
ADD COLUMN     "estimatedPickupMinutesMax" INTEGER,
ADD COLUMN     "estimatedPickupMinutesMin" INTEGER;
