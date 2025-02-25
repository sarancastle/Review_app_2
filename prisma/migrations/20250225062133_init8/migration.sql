/*
  Warnings:

  - You are about to drop the `TempOrder` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "TempOrder";

-- CreateTable
CREATE TABLE "Temporder" (
    "tempOrder_id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "referralCode" TEXT,
    "password" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Temporder_pkey" PRIMARY KEY ("tempOrder_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Temporder_email_key" ON "Temporder"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Temporder_orderId_key" ON "Temporder"("orderId");
