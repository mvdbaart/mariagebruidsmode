-- Website visitor tracking for flow & dropoff analysis

CREATE TABLE IF NOT EXISTS page_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  page_path TEXT NOT NULL,
  page_title TEXT,
  referrer TEXT,
  event_type TEXT NOT NULL, -- 'pageview' | 'cta_click' | 'form_start' | 'form_submit'
  metadata JSONB DEFAULT '{}', -- { label, href, element } for cta_click
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_events_session ON page_events(session_id);
CREATE INDEX IF NOT EXISTS idx_page_events_path ON page_events(page_path);
CREATE INDEX IF NOT EXISTS idx_page_events_created ON page_events(created_at);
CREATE INDEX IF NOT EXISTS idx_page_events_type ON page_events(event_type);

ALTER TABLE page_events ENABLE ROW LEVEL SECURITY;

-- Allow anonymous tracking inserts
DROP POLICY IF EXISTS "Public can insert page events" ON page_events;
CREATE POLICY "Public can insert page events" ON page_events FOR INSERT WITH CHECK (true);

-- Admin reads via service role key (bypasses RLS automatically)
