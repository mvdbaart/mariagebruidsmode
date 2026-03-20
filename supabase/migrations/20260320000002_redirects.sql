CREATE TABLE public.redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_path text NOT NULL,
  to_path text NOT NULL,
  status_code integer NOT NULL DEFAULT 301,
  match_type text NOT NULL DEFAULT 'exact',
  is_active boolean NOT NULL DEFAULT true,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.redirects ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX redirects_from_path_type_idx ON public.redirects(from_path, match_type);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER redirects_updated_at
  BEFORE UPDATE ON public.redirects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Pre-seed: statische paginawijzigingen (301)
INSERT INTO public.redirects (from_path, to_path, status_code, match_type, note) VALUES
  ('/privacy-verklaring',          '/privacy',          301, 'exact',  'WordPress privacy pagina'),
  ('/bruidsmode/trouwjurken',      '/trouwjurken',      301, 'exact',  'WordPress categoriepagina'),
  ('/bruidsmode/trouwpakken',      '/trouwpakken',      301, 'exact',  'WordPress categoriepagina'),
  ('/bruidsmode/bruidsmeisjes-jurken', '/kinderjurkjes', 301, 'exact', 'WordPress categoriepagina'),
  ('/online-bruidsmode',           '/trouwjurken',      301, 'exact',  'WordPress overzichtspagina'),
  ('/over-ons/ons-team',           '/over-ons',         301, 'exact',  'WordPress subpagina'),
  ('/over-ons/onze-winkel',        '/over-ons',         301, 'exact',  'WordPress subpagina'),
  ('/over-ons/contact',            '/afspraak-maken',   301, 'exact',  'WordPress contactpagina'),
  ('/mijn-account',                '/login',            301, 'exact',  'WooCommerce accountpagina'),
  ('/veelgestelde-vragen',         '/over-ons',         301, 'exact',  'WordPress FAQ pagina'),
  ('/betalingsopties',             '/over-ons',         301, 'exact',  'WordPress betalingspagina'),
  -- Functionele WooCommerce-pagina's (302)
  ('/cart',                        '/',                 302, 'exact',  'WooCommerce winkelwagen'),
  ('/afrekenen',                   '/afspraak-maken',   302, 'exact',  'WooCommerce afrekenpagina'),
  ('/bedankpagina',                '/',                 302, 'exact',  'WooCommerce bedankpagina'),
  -- Prefix-redirects (301)
  ('/online-bruidsmode/',          '/trouwjurken',      301, 'prefix', 'WordPress online bruidsmode categorie'),
  ('/bruidsmode/trouwjurken/',     '/trouwjurken',      301, 'prefix', 'WordPress trouwjurken sub-URLs'),
  ('/bruidsmode-eigenschap/',      '/trouwjurken',      301, 'prefix', 'WooCommerce producteigenschap taxonomie'),
  ('/bruidsmode-label/',           '/trouwjurken',      301, 'prefix', 'WooCommerce label taxonomie');
