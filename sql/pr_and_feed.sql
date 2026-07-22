-- ==========================================
-- PR Pinning & Community Feed Setup
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Add pinned_pr column to profiles (jsonb to store { name, weight, reps, date })
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'pinned_pr'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN pinned_pr jsonb DEFAULT NULL;
  END IF;
END $$;

-- 2. Create community_feed table for global feed posts
CREATE TABLE IF NOT EXISTS public.community_feed (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL DEFAULT 'pr_shared',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  likes text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 3. Enable RLS on community_feed
ALTER TABLE public.community_feed ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for community_feed
DROP POLICY IF EXISTS "Anyone can read community feed" ON public.community_feed;
CREATE POLICY "Anyone can read community feed"
  ON public.community_feed FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert own posts" ON public.community_feed;
CREATE POLICY "Users can insert own posts"
  ON public.community_feed FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own posts" ON public.community_feed;
CREATE POLICY "Users can update own posts"
  ON public.community_feed FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Users can delete own posts" ON public.community_feed;
CREATE POLICY "Users can delete own posts"
  ON public.community_feed FOR DELETE
  USING (auth.uid() = user_id);
