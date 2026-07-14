import { createClient } from '@supabase/supabase-js';

import { mockSupabase } from './mockSupabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const isPlaceholder = !supabaseUrl || supabaseUrl.includes("placeholder-project") || !supabaseAnonKey;

export const supabase = isPlaceholder 
  ? (mockSupabase as any) 
  : createClient(supabaseUrl, supabaseAnonKey);
