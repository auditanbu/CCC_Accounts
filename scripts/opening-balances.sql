-- Squad opening balances carried over from the Excel ledger.
--
-- "openingBalance" is positive when the player owes the team and negative when
-- they have paid in excess. The Excel sheet uses the opposite sign; the values
-- below are already flipped.
--
-- Safe to re-run: matched on name, so it corrects balances rather than
-- duplicating anyone. Run it in Railway: Postgres service -> Database -> Data,
-- paste, execute.

INSERT INTO "Player" (name, "jerseyNumber", "defaultMatchFee", "openingBalance", status, "updatedAt")
VALUES
  ('Karthik',   21, 300,  1800, 'ACTIVE', now()),
  ('Rajkumar',  22, 300,  1500, 'ACTIVE', now()),
  ('Prakash',    9, 300,  1000, 'ACTIVE', now()),
  ('Raj',       23, 300,   400, 'ACTIVE', now()),
  ('Mythish',   24, 300,   300, 'ACTIVE', now()),
  ('Santhosh',  25, 300,   200, 'ACTIVE', now()),
  ('Jeeva',     26, 300,   200, 'ACTIVE', now()),
  ('Mohan',     27, 300,  -670, 'ACTIVE', now()),
  ('Srirangan',333, 300,  -280, 'ACTIVE', now()),
  ('Anbu',       3, 300,  -200, 'ACTIVE', now()),
  ('Madhesh',   10, 300,  -200, 'ACTIVE', now()),
  ('Mani',      99, 300,  -150, 'ACTIVE', now())
ON CONFLICT ("jerseyNumber") DO UPDATE
  SET "openingBalance" = EXCLUDED."openingBalance",
      "updatedAt"      = now();

-- Expect: 5400 owed, 1500 credit, 3900 net.
SELECT
  sum("openingBalance") FILTER (WHERE "openingBalance" > 0) AS owed,
  -sum("openingBalance") FILTER (WHERE "openingBalance" < 0) AS credit,
  sum("openingBalance")                                      AS net_pending
FROM "Player";
