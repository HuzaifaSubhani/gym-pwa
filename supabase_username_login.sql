-- Run this in your Supabase SQL Editor to enable logging in via Username

CREATE OR REPLACE FUNCTION public.get_email_from_username(p_username text)
RETURNS text AS $$
DECLARE
  v_email text;
BEGIN
  SELECT auth.users.email INTO v_email
  FROM auth.users
  JOIN public.profiles ON auth.users.id = public.profiles.id
  WHERE public.profiles.username = p_username
  LIMIT 1;
  
  RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
