-- Records the outcome of a match once it's been played: result, both
-- scorecards as free text (a full ball-by-ball breakdown belongs on
-- Cricheroes, not in this ledger), and a link to that scorecard.
-- All four columns are nullable — an upcoming fixture has none of this yet.

-- CreateEnum
CREATE TYPE "MatchResult" AS ENUM ('WIN', 'LOSS', 'TIE', 'NO_RESULT');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "result" "MatchResult",
ADD COLUMN     "ourScore" TEXT,
ADD COLUMN     "opponentScore" TEXT,
ADD COLUMN     "cricheroesUrl" TEXT;
