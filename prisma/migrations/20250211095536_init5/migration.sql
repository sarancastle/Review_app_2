/*
  Warnings:

  - Added the required column `email` to the `Helpdesk` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Helpdesk` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

-- AlterTable
ALTER TABLE "Helpdesk" ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "status" "TicketStatus" NOT NULL DEFAULT 'OPEN';
