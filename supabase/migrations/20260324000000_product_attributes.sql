-- Product attributes migration
-- Adds structured fields scraped from the live WordPress site

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS pasvorm     text,
  ADD COLUMN IF NOT EXISTS hals        text,
  ADD COLUMN IF NOT EXISTS mouw        text,
  ADD COLUMN IF NOT EXISTS materialen  text[],
  ADD COLUMN IF NOT EXISTS kleur       text[],
  ADD COLUMN IF NOT EXISTS maten       text[],
  ADD COLUMN IF NOT EXISTS categorieen text[],
  ADD COLUMN IF NOT EXISTS sale_price  text,
  ADD COLUMN IF NOT EXISTS in_stock    boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN products.pasvorm     IS 'Silhouet: a-lijn | fit-and-flare | prinses | soepelvallend | zeemeermin';
COMMENT ON COLUMN products.hals        IS 'Halslijn: hooggesloten | boothals | diep-decollote | recht | v-hals';
COMMENT ON COLUMN products.mouw        IS 'Mouw: strapless | korte-mouwen | off-shoulder | schouderbandjes | mouwloos';
COMMENT ON COLUMN products.materialen  IS 'Stoffen: crepe | kant | chiffon | mikado | organza | satijn | tule';
COMMENT ON COLUMN products.kleur       IS 'Kleuren: wit | roze | champagne | beige | blauw | grijs | groen | bruin | bordeaux-roze';
COMMENT ON COLUMN products.maten       IS 'Beschikbare maten: 34 t/m 62';
COMMENT ON COLUMN products.categorieen IS 'Stijl-tags: klassiek | bohemian | strak | open-rug | sexy | simpel | vintage | romantisch | outlet | lange-sleep | met-split';
COMMENT ON COLUMN products.sale_price  IS 'Aanbiedingsprijs als tekst, bijv. "€ 995". NULL = geen aanbieding.';
COMMENT ON COLUMN products.in_stock    IS 'Op voorraad in de winkel';
