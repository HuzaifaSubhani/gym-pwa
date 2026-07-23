ALTER TABLE public.challenges 
ADD COLUMN IF NOT EXISTS duration_days INT DEFAULT 7;
