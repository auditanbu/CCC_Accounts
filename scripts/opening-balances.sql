-- Opening balances carried over from the Excel ledger.
--
-- "openingBalance" is positive when the player owes the team and negative when
-- they have paid in excess. The Excel sheet uses the opposite sign; the values
-- below are already flipped.
--
-- Matches on NAME and only ever UPDATEs. It will not create players and cannot
-- overwrite the wrong one — jersey numbers are assigned in the app and must not
-- be assumed here. Names matching nobody are listed by the report below rather
-- than failing silently.
--
-- Run it in Railway: Postgres service -> Database -> Data, paste, execute.
-- Safe to re-run.

WITH incoming(name, opening) AS (
  VALUES
    -- owed to the team
    ('Karthik',   1800),
    ('Rajkumar',  1500),
    ('Prakash',   1000),
    ('Raj',        400),
    ('Mythish',    300),
    ('Santhosh',   200),
    ('Jeeva',      200),
    -- paid in excess, carried as credit
    ('Mohan',     -670),
    ('Srirangan', -280),
    ('Anbu',      -200),
    ('Madhesh',   -200),
    ('Mani',      -150)
)
UPDATE "Player" p
   SET "openingBalance" = i.opening,
       "updatedAt"      = now()
  FROM incoming i
 WHERE p.name = i.name;

-- Report: every intended name, and whether it landed.
WITH incoming(name, opening) AS (
  VALUES
    ('Karthik',1800),('Rajkumar',1500),('Prakash',1000),('Raj',400),
    ('Mythish',300),('Santhosh',200),('Jeeva',200),('Mohan',-670),
    ('Srirangan',-280),('Anbu',-200),('Madhesh',-200),('Mani',-150)
)
SELECT i.name,
       i.opening          AS intended,
       p."openingBalance" AS stored,
       CASE WHEN p.id IS NULL THEN 'NO PLAYER WITH THIS NAME' ELSE 'ok' END AS result
  FROM incoming i
  LEFT JOIN "Player" p ON p.name = i.name
 ORDER BY result DESC, i.opening DESC;

-- Totals. Expect: owed 5400, credit 1500, net 3900.
SELECT
  COALESCE(sum("openingBalance") FILTER (WHERE "openingBalance" > 0), 0)  AS owed,
  COALESCE(-sum("openingBalance") FILTER (WHERE "openingBalance" < 0), 0) AS credit,
  COALESCE(sum("openingBalance"), 0)                                     AS net_pending
FROM "Player";
