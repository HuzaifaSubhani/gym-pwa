-- ==========================================
-- Feed Comments Setup
-- Run this in your Supabase SQL Editor
-- ==========================================

CREATE TABLE IF NOT EXISTS public.feed_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES public.community_feed(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  parent_id uuid REFERENCES public.feed_comments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can read comments" ON public.feed_comments;
CREATE POLICY "Anyone can read comments"
  ON public.feed_comments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert own comments" ON public.feed_comments;
CREATE POLICY "Users can insert own comments"
  ON public.feed_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own comments" ON public.feed_comments;
CREATE POLICY "Users can update own comments"
  ON public.feed_comments FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.feed_comments;
CREATE POLICY "Users can delete own comments"
  ON public.feed_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Create a function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_feed_comments_modtime ON public.feed_comments;
CREATE TRIGGER update_feed_comments_modtime
BEFORE UPDATE ON public.feed_comments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
