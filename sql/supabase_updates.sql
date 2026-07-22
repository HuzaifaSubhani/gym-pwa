-- 1. Ensure Usernames are Unique
-- (Note: If this fails, it means there are already duplicate usernames in your database. 
-- You must manually delete or rename the duplicates before running this!)
ALTER TABLE profiles ADD CONSTRAINT unique_username UNIQUE (username);

-- 2. Add Avatar Position column for cropping/focusing
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_position INTEGER DEFAULT 50;

-- 3. Create a secure RPC function to allow users to delete their own accounts
CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE SQL SECURITY DEFINER
AS $$
   -- Deleting from auth.users will automatically cascade and delete their profile 
   -- and workout logs if you set up cascading deletes previously.
   DELETE FROM auth.users WHERE id = auth.uid();
$$;
