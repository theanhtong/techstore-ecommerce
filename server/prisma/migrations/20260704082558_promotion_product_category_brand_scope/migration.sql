/*
  Warnings:

  - You are about to drop the column `saleEndsAt` on the `product_variants` table. All the data in the column will be lost.
  - You are about to drop the column `salePrice` on the `product_variants` table. All the data in the column will be lost.
  - You are about to drop the column `saleStartsAt` on the `product_variants` table. All the data in the column will be lost.
  - You are about to drop the column `variantId` on the `promotion_products` table. All the data in the column will be lost.
  - Added the required column `scope` to the `promotion_products` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PromotionScope" AS ENUM ('PRODUCT', 'CATEGORY', 'BRAND');

-- DropForeignKey
ALTER TABLE "promotion_products" DROP CONSTRAINT "promotion_products_variantId_fkey";

-- AlterTable
ALTER TABLE "product_variants" DROP COLUMN "saleEndsAt",
DROP COLUMN "salePrice",
DROP COLUMN "saleStartsAt";

-- AlterTable
ALTER TABLE "promotion_products" DROP COLUMN "variantId",
ADD COLUMN     "brandId" UUID,
ADD COLUMN     "categoryId" UUID,
ADD COLUMN     "scope" "PromotionScope" NOT NULL;

-- AlterTable
ALTER TABLE "promotions" ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "promotion_products" ADD CONSTRAINT "promotion_products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_products" ADD CONSTRAINT "promotion_products_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
