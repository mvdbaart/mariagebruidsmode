-- =============================================================================
-- Redirect Engine v2: 404 monitor + suggestion system
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. redirect_404_log
--    One row per unique path. Repeated hits increment hit_count.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.redirect_404_log (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  path           text        NOT NULL,
  query_string   text,
  referer        text,
  user_agent     text,
  suggestions    jsonb,
  hit_count      integer     NOT NULL DEFAULT 1,
  first_seen_at  timestamptz NOT NULL DEFAULT now(),
  last_seen_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.redirect_404_log ENABLE ROW LEVEL SECURITY;

-- Unique on path so we can upsert by path
CREATE UNIQUE INDEX IF NOT EXISTS redirect_404_log_path_idx
  ON public.redirect_404_log (path);

CREATE INDEX IF NOT EXISTS redirect_404_log_last_seen_idx
  ON public.redirect_404_log (last_seen_at DESC);

CREATE INDEX IF NOT EXISTS redirect_404_log_hit_count_idx
  ON public.redirect_404_log (hit_count DESC);

-- ---------------------------------------------------------------------------
-- 2. redirect_suggestions
--    Holds low/medium-confidence mappings waiting for human review.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.redirect_suggestions (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  from_path   text          NOT NULL,
  to_path     text          NOT NULL,
  confidence  numeric(4,3)  NOT NULL,
  source      text          NOT NULL DEFAULT 'sitemap', -- 'sitemap' | '404'
  status      text          NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  note        text,
  created_at  timestamptz   NOT NULL DEFAULT now(),
  updated_at  timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE public.redirect_suggestions ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS redirect_suggestions_from_path_idx
  ON public.redirect_suggestions (from_path);

CREATE INDEX IF NOT EXISTS redirect_suggestions_status_idx
  ON public.redirect_suggestions (status, confidence DESC);

-- Reuse existing set_updated_at trigger function
CREATE TRIGGER redirect_suggestions_updated_at
  BEFORE UPDATE ON public.redirect_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. upsert_404_log function
--    Inserts a new log entry or increments hit_count on conflict.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_404_log(
  p_path         text,
  p_query_string text,
  p_referer      text,
  p_user_agent   text,
  p_suggestions  jsonb
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.redirect_404_log
    (path, query_string, referer, user_agent, suggestions, hit_count, first_seen_at, last_seen_at)
  VALUES
    (p_path, p_query_string, p_referer, p_user_agent, p_suggestions, 1, now(), now())
  ON CONFLICT (path) DO UPDATE SET
    hit_count      = redirect_404_log.hit_count + 1,
    last_seen_at   = now(),
    -- Keep the most recent request metadata
    query_string   = EXCLUDED.query_string,
    referer        = EXCLUDED.referer,
    user_agent     = EXCLUDED.user_agent,
    suggestions    = EXCLUDED.suggestions;
$$;
