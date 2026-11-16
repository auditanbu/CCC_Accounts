-- CreateTable
CREATE TABLE "MatchIncome" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchIncome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchIncome_matchId_idx" ON "MatchIncome"("matchId");

-- CreateIndex
CREATE INDEX "MatchIncome_category_idx" ON "MatchIncome"("category");

-- AddForeignKey
ALTER TABLE "MatchIncome" ADD CONSTRAINT "MatchIncome_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
