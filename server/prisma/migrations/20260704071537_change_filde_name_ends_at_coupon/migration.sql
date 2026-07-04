/*
  Warnings:

  - You are about to drop the column `expiresAt` on the `coupons` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "coupons" DROP COLUMN "expiresAt",
ADD COLUMN     "endsAt" TIMESTAMP(3);
