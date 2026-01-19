-- Create mock_tests table to store test attempts
CREATE TABLE public.mock_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL, -- aptitude, technical, verbal
  subcategory TEXT, -- dsa, oop, dbms, os, cn, etc.
  difficulty TEXT NOT NULL DEFAULT 'medium', -- easy, medium, hard
  total_questions INTEGER NOT NULL DEFAULT 10,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  time_taken INTEGER, -- in seconds
  max_time INTEGER NOT NULL DEFAULT 600, -- 10 minutes default
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'in_progress', -- in_progress, completed
  score NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create mock_interviews table to store interview sessions
CREATE TABLE public.mock_interviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  interview_type TEXT NOT NULL, -- technical, hr, behavioral
  target_role TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  questions_asked INTEGER NOT NULL DEFAULT 0,
  feedback JSONB,
  overall_rating NUMERIC(3,1),
  status TEXT NOT NULL DEFAULT 'in_progress', -- in_progress, completed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.mock_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_interviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for mock_tests
CREATE POLICY "Users can view their own mock tests"
  ON public.mock_tests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own mock tests"
  ON public.mock_tests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mock tests"
  ON public.mock_tests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mock tests"
  ON public.mock_tests FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for mock_interviews
CREATE POLICY "Users can view their own mock interviews"
  ON public.mock_interviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own mock interviews"
  ON public.mock_interviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mock interviews"
  ON public.mock_interviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mock interviews"
  ON public.mock_interviews FOR DELETE
  USING (auth.uid() = user_id);