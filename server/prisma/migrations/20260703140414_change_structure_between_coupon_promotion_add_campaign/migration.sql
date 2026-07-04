/*
  Warnings:

  - You are about to drop the column `promotionId` on the `coupons` table. All the data in the column will be lost.
  - You are about to drop the column `endsAt` on the `promotions` table. All the data in the column will be lost.
  - You are about to drop the column `perUserLimit` on the `promotions` table. All the data in the column will be lost.
  - You are about to drop the column `startsAt` on the `promotions` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `promotions` table. All the data in the column will be lost.
  - You are about to drop the column `usageLimit` on the `promotions` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "coupons" DROP CONSTRAINT "coupons_promotionId_fkey";

-- AlterTable
ALTER TABLE "coupons" DROP COLUMN "promotionId",
ADD COLUMN     "campaignId" UUID;

-- AlterTable
ALTER TABLE "promotions" DROP COLUMN "endsAt",
DROP COLUMN "perUserLimit",
DROP COLUMN "startsAt",
DROP COLUMN "type",
DROP COLUMN "usageLimit",
ADD COLUMN     "campaignId" UUID;

-- DropEnum
DROP TYPE "PromotionType";

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
