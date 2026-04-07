ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS title_font TEXT;

UPDATE public.collections
SET title_font = CASE WHEN type = 'suit' THEN 'tailored' ELSE 'bridal' END
WHERE title_font IS NULL OR title_font NOT IN ('bridal', 'tailored');

ALTER TABLE public.collections
  ALTER COLUMN title_font SET DEFAULT 'bridal';

ALTER TABLE public.collections
  ALTER COLUMN title_font SET NOT NULL;
