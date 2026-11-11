-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "currency" SET DEFAULT 'XAF';

-- AlterTable
ALTER TABLE "Pharmacy" ADD COLUMN     "code" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "code" TEXT;

-- AlterTable
ALTER TABLE "SearchSession" ADD COLUMN     "freePreview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "label" TEXT,
ADD COLUMN     "unlockedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Unlock" ADD COLUMN     "creditId" TEXT;

-- AlterTable
ALTER TABLE "Withdrawal" ALTER COLUMN "currency" SET DEFAULT 'XAF';

-- CreateTable
CREATE TABLE "Credit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "searchSessionId" TEXT,
    "pharmacyId" TEXT,
    "note" TEXT,
    "grantedById" TEXT,
    "usedAt" TIMESTAMP(3),
    "usedOnSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Credit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Credit_userId_usedAt_idx" ON "Credit"("userId", "usedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Credit_userId_searchSessionId_reason_key" ON "Credit"("userId", "searchSessionId", "reason");

-- CreateIndex
CREATE UNIQUE INDEX "Pharmacy_code_key" ON "Pharmacy"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Unlock_creditId_key" ON "Unlock"("creditId");

-- AddForeignKey
ALTER TABLE "Credit" ADD CONSTRAINT "Credit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Devise du Gabon (FCFA CEMAC)
UPDATE "Order" SET "currency" = 'XAF' WHERE "currency" = 'XOF';
UPDATE "Withdrawal" SET "currency" = 'XAF' WHERE "currency" = 'XOF';
