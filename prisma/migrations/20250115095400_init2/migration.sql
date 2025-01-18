-- CreateTable
CREATE TABLE "Token" (
    "token_id" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("token_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Token_token_id_key" ON "Token"("token_id");
