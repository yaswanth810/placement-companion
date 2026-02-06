-- Add code and language columns to coding_problems table
ALTER TABLE public.coding_problems 
ADD COLUMN IF NOT EXISTS code TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'python';