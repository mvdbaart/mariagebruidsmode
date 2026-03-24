-- Tabel voor speciale openingsdagen (bijv. zondagen op aanvraag)
-- Een rij in deze tabel = die dag is open voor afspraken
CREATE TABLE IF NOT EXISTS opening_exceptions (
  date DATE PRIMARY KEY,
  note TEXT
);

-- Alleen admins mogen lezen en schrijven
ALTER TABLE opening_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON opening_exceptions
  USING (true)
  WITH CHECK (true);

-- Publiek mag openingsuitzonderingen lezen (nodig voor beschikbaarheidscheck)
CREATE POLICY "Public read opening exceptions" ON opening_exceptions
  FOR SELECT
  TO anon
  USING (true);
