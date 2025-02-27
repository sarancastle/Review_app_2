/*
  Warnings:

  - Added the required column `employee_id` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userName` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "employee_id" TEXT NOT NULL,
ADD COLUMN     "userName" TEXT NOT NULL;
