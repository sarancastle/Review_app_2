-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAFF');

-- CreateTable
CREATE TABLE "Employees" (
    "employee_id" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "employeeEmail" TEXT NOT NULL,
    "employeePhoneNumber" TEXT NOT NULL,
    "employeePassword" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "responsibleEmployeeId" TEXT,

    CONSTRAINT "Employees_pkey" PRIMARY KEY ("employee_id")
);

-- CreateTable
CREATE TABLE "User" (
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "otp" TEXT,
    "otpExpiry" TIMESTAMP(3),
    "subscriptionStartDate" TIMESTAMP(3) NOT NULL,
    "subscriptionEndDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "employee_id" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "Helpdesk" (
    "helpdesk_id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "Helpdesk_pkey" PRIMARY KEY ("helpdesk_id")
);

-- CreateTable
CREATE TABLE "Token" (
    "token_id" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("token_id")
);

-- CreateTable
CREATE TABLE "Dashboard" (
    "dashboard_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dashboard_pkey" PRIMARY KEY ("dashboard_id")
);

-- CreateTable
CREATE TABLE "Review" (
    "review_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dashboard_id" TEXT NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("review_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employees_employee_id_key" ON "Employees"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "Employees_employeeEmail_key" ON "Employees"("employeeEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Employees_referralCode_key" ON "Employees"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "Employees_responsibleEmployeeId_key" ON "Employees"("responsibleEmployeeId");

-- CreateIndex
CREATE UNIQUE INDEX "User_user_id_key" ON "User"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Token_token_id_key" ON "Token"("token_id");

-- CreateIndex
CREATE UNIQUE INDEX "Dashboard_dashboard_id_key" ON "Dashboard"("dashboard_id");

-- CreateIndex
CREATE UNIQUE INDEX "Dashboard_user_id_key" ON "Dashboard"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Review_review_id_key" ON "Review"("review_id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employees"("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Helpdesk" ADD CONSTRAINT "Helpdesk_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dashboard" ADD CONSTRAINT "Dashboard_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "Dashboard"("dashboard_id") ON DELETE RESTRICT ON UPDATE CASCADE;
