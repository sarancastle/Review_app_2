/*
  Warnings:

  - You are about to drop the `tempUser` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `referralCode` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `staff_id` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "referralCode" TEXT NOT NULL,
ADD COLUMN     "staff_id" TEXT NOT NULL;

-- DropTable
DROP TABLE "tempUser";

-- CreateTable
CREATE TABLE "Admin" (
    "admin_id" TEXT NOT NULL,
    "adminName" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "adminPhoneNumber" TEXT NOT NULL,
    "adminPassword" TEXT NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("admin_id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "staff_id" TEXT NOT NULL,
    "staffName" TEXT NOT NULL,
    "staffEmail" TEXT NOT NULL,
    "staffPhoneNumber" TEXT NOT NULL,
    "staffPassword" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("staff_id")
);

-- CreateTable
CREATE TABLE "Helpdesk" (
    "helpdesk_id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "Helpdesk_pkey" PRIMARY KEY ("helpdesk_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_admin_id_key" ON "Admin"("admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_adminEmail_key" ON "Admin"("adminEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_staff_id_key" ON "Staff"("staff_id");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_staffEmail_key" ON "Staff"("staffEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_referralCode_key" ON "Staff"("referralCode");

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "Admin"("admin_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "Staff"("staff_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Helpdesk" ADD CONSTRAINT "Helpdesk_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
