-- CreateEnum
CREATE TYPE "EbayPolicyType" AS ENUM ('PAYMENT', 'FULFILLMENT', 'RETURN');

-- AlterTable
ALTER TABLE "EbayCredential" ADD COLUMN     "defaultCategoryId" TEXT,
ADD COLUMN     "defaultFulfillmentPolicyId" TEXT,
ADD COLUMN     "defaultPaymentPolicyId" TEXT,
ADD COLUMN     "defaultReturnPolicyId" TEXT;

-- CreateTable
CREATE TABLE "EbaySellerPolicy" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "marketplaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EbayPolicyType" NOT NULL,
    "isDefault" BOOLEAN,
    "policyData" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EbaySellerPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EbaySellerPolicy_type_marketplaceId_policyId_key" ON "EbaySellerPolicy"("type", "marketplaceId", "policyId");
