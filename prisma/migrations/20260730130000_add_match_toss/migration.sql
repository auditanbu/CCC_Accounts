-- Who won the toss and what they chose to do with it — entered alongside
-- the match result. Nullable, like the rest of the result fields: an
-- upcoming fixture has neither yet.

-- CreateEnum
CREATE TYPE "TossWinner" AS ENUM ('US', 'OPPONENT');

-- CreateEnum
CREATE TYPE "TossDecision" AS ENUM ('BAT', 'BOWL');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "tossWonBy" "TossWinner",
ADD COLUMN     "tossDecision" "TossDecision";
