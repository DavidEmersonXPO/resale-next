-- CreateTable
CREATE TABLE "EbayPolicyRefreshLog" (
    "id" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EbayPolicyRefreshLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EbayPolicyRefreshLog_createdAt_idx" ON "EbayPolicyRefreshLog"("createdAt");
