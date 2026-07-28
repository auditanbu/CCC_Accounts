-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "totalMatches" INTEGER;

-- CreateTable
CREATE TABLE "_TournamentGrounds" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_TournamentGrounds_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_TournamentGrounds_B_index" ON "_TournamentGrounds"("B");

-- AddForeignKey
ALTER TABLE "_TournamentGrounds" ADD CONSTRAINT "_TournamentGrounds_A_fkey" FOREIGN KEY ("A") REFERENCES "Ground"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TournamentGrounds" ADD CONSTRAINT "_TournamentGrounds_B_fkey" FOREIGN KEY ("B") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
