-- Saved field placements from the field set planner. A table of its own:
-- nothing references it and it references nothing, so the ledger is
-- untouched.

-- CreateTable
CREATE TABLE "FieldSet" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "savedBy" TEXT NOT NULL,
    "ownerKey" TEXT,
    "byAdmin" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FieldSet_ownerKey_idx" ON "FieldSet"("ownerKey");

