-- CreateTable
CREATE TABLE "EbayCredential" (
    "id" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "refreshTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "ebayUserId" TEXT,
    "ebayUserEmail" TEXT,
    "environment" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EbayCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EbaySyncLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requestUrl" TEXT,
    "requestMethod" TEXT,
    "requestData" TEXT,
    "responseCode" INTEGER,
    "responseData" TEXT,
    "errorMessage" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EbaySyncLog_pkey" PRIMARY KEY ("id")
);
