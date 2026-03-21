-- Allow public homepage to read active hero slides while keeping inactive slides hidden
DROP POLICY IF EXISTS "Public can view active hero slides" ON public.hero_slides;

CREATE POLICY "Public can view active hero slides"
  ON public.hero_slides
  FOR SELECT
  USING (is_active = true);
