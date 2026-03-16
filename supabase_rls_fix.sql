-- 1. FIX: Enable RLS and add policies for BOTH tables
-- Run this in the Supabase SQL Editor

-- FIX FOR test_attempt_answers (Error 42501)
ALTER TABLE test_attempt_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow users to manage their own answers" ON test_attempt_answers;

CREATE POLICY "Allow users to manage their own answers" ON test_attempt_answers
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM test_attempts WHERE test_attempts.id = test_attempt_answers.attempt_id AND test_attempts.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM test_attempts WHERE test_attempts.id = test_attempt_answers.attempt_id AND test_attempts.user_id = auth.uid()));

-- FIX FOR test_attempts (The "No rows updated" warning)
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own attempts" ON test_attempts;

CREATE POLICY "Users can manage their own attempts" ON test_attempts
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. IMPORTANT: CHECK YOUR ENUM VALUES
-- You changed the code to "COMPLETED" and "STARTED" (ALL CAPS).
-- If your Supabase Enum only has "started" and "submitted" (lowercase), 
-- you must either change the code back to lowercase or update your Enum in Supabase.
