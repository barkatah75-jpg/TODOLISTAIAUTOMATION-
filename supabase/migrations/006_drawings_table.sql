-- Migration 006: Drawings table
-- Referenced by lib/utils/subscription.ts and app/api/drawings/route.ts

CREATE TABLE IF NOT EXISTS public.drawings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           text NOT NULL DEFAULT 'My Drawing',
  image_url       text NOT NULL,
  thumbnail_url   text,
  file_size       integer,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drawings_user ON public.drawings(user_id, created_at DESC);

ALTER TABLE public.drawings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own drawings" ON public.drawings;
CREATE POLICY "Users manage own drawings" ON public.drawings
  FOR ALL USING (auth.uid() = user_id);

-- Parents can view children's drawings
DROP POLICY IF EXISTS "Parents see children drawings" ON public.drawings;
CREATE POLICY "Parents see children drawings" ON public.drawings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.family_links
    WHERE parent_id = auth.uid() AND child_id = drawings.user_id
  ));

-- Storage bucket policies (run in Supabase Dashboard → Storage → Policies)
-- These are applied via SQL for reference only:
-- Bucket: 'drawings' (public)
-- Policy: authenticated users can upload to their own folder (user_id/*)
