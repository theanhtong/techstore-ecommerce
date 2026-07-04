-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "startsAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "promotions" ADD COLUMN     "endsAt" TIMESTAMP(3),
ADD COLUMN     "startsAt" TIMESTAMP(3);
