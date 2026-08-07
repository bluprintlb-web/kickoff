-- Make OrderItem.variantId nullable and switch its delete behavior from
-- RESTRICT to SET NULL, so a real (hard) product/variant delete no longer
-- fails with a foreign-key error when that variant has order history --
-- the order row and its item (with the historical unitPrice/quantity)
-- survive, just with variantId set to null.

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_variantId_fkey";

-- AlterTable
ALTER TABLE "OrderItem" ALTER COLUMN "variantId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
