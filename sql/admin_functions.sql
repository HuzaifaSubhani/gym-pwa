-- Drop existing functions if they exist to ensure clean replacement
DROP FUNCTION IF EXISTS admin_get_users();
DROP FUNCTION IF EXISTS admin_delete_user(uuid);

-- Function: admin_get_users
-- Purpose: Safely fetches all user profiles, joins with auth.users to retrieve email,
-- and aggregates total workout logs to determine activity.
-- Only executable by users who have is_admin = true in their profile.
CREATE OR REPLACE FUNCTION admin_get_users()
RETURNS TABLE (
  id uuid,
  username text,
  avatar_url text,
  is_admin boolean,
  email text,
  created_at timestamptz,
  workout_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ) THEN
    RAISE EXCEPTION 'Not authorized. Only admins can access this data.';
  END IF;

  RETURN QUERY
  SELECT 
    p.id, 
    p.username, 
    p.avatar_url, 
    p.is_admin, 
    au.email::text, 
    p.created_at,
    COUNT(wl.id) as workout_count
  FROM public.profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  LEFT JOIN public.workout_logs wl ON p.id = wl.user_id
  GROUP BY p.id, p.username, p.avatar_url, p.is_admin, au.email, p.created_at
  ORDER BY p.created_at DESC;
END;
$$;

-- Function: admin_delete_user
-- Purpose: Safely deletes a target user from the auth.users table.
-- Supabase automatically cascades this deletion to the public.profiles and other linked tables
-- if foreign keys were set up with ON DELETE CASCADE.
-- Only executable by users who have is_admin = true in their profile.
CREATE OR REPLACE FUNCTION admin_delete_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ) THEN
    RAISE EXCEPTION 'Not authorized. Only admins can perform deletions.';
  END IF;

  -- Prevent admin from deleting themselves accidentally
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own admin account.';
  END IF;

  -- Dynamic deletion of dependent records to avoid FK constraint errors
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workout_logs') THEN
    EXECUTE 'DELETE FROM public.workout_logs WHERE user_id = $1' USING target_user_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'programs') THEN
    EXECUTE 'DELETE FROM public.programs WHERE creator_id = $1' USING target_user_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'challenges') THEN
    EXECUTE 'DELETE FROM public.challenges WHERE challenger_id = $1 OR challenged_id = $1' USING target_user_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'community_feed') THEN
    EXECUTE 'DELETE FROM public.community_feed WHERE user_id = $1' USING target_user_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'feed_comments') THEN
    EXECUTE 'DELETE FROM public.feed_comments WHERE user_id = $1' USING target_user_id;
  END IF;

  -- Delete from public.profiles manually since there is no ON DELETE CASCADE set up
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- Delete from auth.users
  DELETE FROM auth.users WHERE auth.users.id = target_user_id;
END;
$$;
