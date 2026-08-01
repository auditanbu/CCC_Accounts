-- DropIndex
DROP INDEX "Player_jerseyNumber_key";

-- AlterTable
ALTER TABLE "Player" ALTER COLUMN "jerseyNumber" DROP NOT NULL;
