/*
  Warnings:

  - A unique constraint covering the columns `[orderId]` on the table `Revenue` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Revenue_orderId_key" ON "Revenue"("orderId");
