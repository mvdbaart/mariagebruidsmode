-- Landing pages A/B testing system

-- Landing pages (test containers)
CREATE TABLE IF NOT EXISTS landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | active | paused | completed
  auto_select_winner BOOLEAN DEFAULT false,
  winner_variant_id UUID,
  min_views INT DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Variants for each landing page
CREATE TABLE IF NOT EXISTS landing_page_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_control BOOLEAN DEFAULT false,
  traffic_percentage INT NOT NULL DEFAULT 50,
  show_header BOOLEAN DEFAULT true,
  show_footer BOOLEAN DEFAULT true,
  blocks JSONB DEFAULT '[]',
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK for winner_variant_id after variants table exists
ALTER TABLE landing_pages
  ADD CONSTRAINT IF NOT EXISTS fk_winner_variant
  FOREIGN KEY (winner_variant_id) REFERENCES landing_page_variants(id)
  ON DELETE SET NULL;

-- Analytics events
CREATE TABLE IF NOT EXISTS landing_page_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES landing_page_variants(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'view' | 'cta_click' | 'conversion'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lp_events_variant ON landing_page_events(variant_id);
CREATE INDEX IF NOT EXISTS idx_lp_events_session ON landing_page_events(session_id);
CREATE INDEX IF NOT EXISTS idx_lp_variants_page ON landing_page_variants(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_lp_slug ON landing_pages(slug);

-- RLS
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_page_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_page_events ENABLE ROW LEVEL SECURITY;

-- Public policies (anonymous tracking)
DROP POLICY IF EXISTS "Public can insert events" ON landing_page_events;
CREATE POLICY "Public can insert events" ON landing_page_events FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view events" ON landing_page_events;
CREATE POLICY "Public can view events" ON landing_page_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view landing pages" ON landing_pages;
CREATE POLICY "Public can view landing pages" ON landing_pages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view variants" ON landing_page_variants;
CREATE POLICY "Public can view variants" ON landing_page_variants FOR SELECT USING (true);

-- Updated_at trigger (reuse existing function if exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_landing_pages_updated_at ON landing_pages;
CREATE TRIGGER update_landing_pages_updated_at
  BEFORE UPDATE ON landing_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_landing_page_variants_updated_at ON landing_page_variants;
CREATE TRIGGER update_landing_page_variants_updated_at
  BEFORE UPDATE ON landing_page_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
