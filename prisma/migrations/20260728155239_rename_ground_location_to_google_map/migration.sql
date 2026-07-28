-- The location field had been used to hold Google Maps links, so it becomes
-- googleMapUrl and location is freed up for the place name.
--
-- Adding a column and copying across, rather than renaming, because only the
-- rows that actually hold a link should move: anything already written as a
-- place name stays where it is.

-- AlterTable
ALTER TABLE "Ground" ADD COLUMN "googleMapUrl" TEXT;

-- Move existing link-shaped values into the new column and clear them from
-- location, which is now for the place name.
UPDATE "Ground"
   SET "googleMapUrl" = "location",
       "location"     = NULL
 WHERE "location" ILIKE 'http://%'
    OR "location" ILIKE 'https://%';
