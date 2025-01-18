-- CreateTable
CREATE TABLE "tempUser" (
    "tempUser_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "otpExpiry" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tempUser_pkey" PRIMARY KEY ("tempUser_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tempUser_email_key" ON "tempUser"("email");
