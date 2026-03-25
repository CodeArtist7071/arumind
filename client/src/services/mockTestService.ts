import { supabase } from "../utils/supabase";

export type DifficultyMode = "EASY" | "MODERATE" | "HARD";

interface SelectionRatios {
  attempted: number;
  unattempted: number;
}

const RATIOS: Record<DifficultyMode, SelectionRatios> = {
  EASY: { attempted: 0.6, unattempted: 0.4 },
  MODERATE: { attempted: 0.4, unattempted: 0.6 },
  HARD: { attempted: 0.2, unattempted: 0.8 },
};

export const generateMockTestQuestions = async (
  userId: string,
  examId: string,
  totalCount: number,
  mode: DifficultyMode
): Promise<string[]> => {
  try {
    // 1. Get all question IDs for this exam (Directly or via Subjects)
    const [directQ, subjectData] = await Promise.all([
      supabase.from("questions").select("id").eq("exam_id", examId),
      supabase.from("exam_subjects").select("subject_id").eq("exam_id", examId)
    ]);

    if (directQ.error) throw directQ.error;
    if (subjectData.error) throw subjectData.error;

    const subjectIds = subjectData.data.map(s => s.subject_id);
    let allQuestionIdsSet = new Set<string>(directQ.data.map(q => q.id));

    if (subjectIds.length > 0) {
      const { data: subjectQuestions, error: sqError } = await supabase
        .from("questions")
        .select("id")
        .in("subject_id", subjectIds);
      
      if (sqError) throw sqError;
      subjectQuestions?.forEach(q => allQuestionIdsSet.add(q.id));
    }

    const allQuestionIds = Array.from(allQuestionIdsSet);

    if (allQuestionIds.length === 0) {
      console.warn("No questions found for exam:", examId);
      return [];
    }

    // 2. Get attempted (correctly answered) questions for this user
    // We fetch all correct answers for the user and filter in JS to avoid massive .in queries
    const { data: attemptedData, error: aError } = await supabase
      .from("test_attempt_answers")
      .select(`
        question_id,
        test_attempts!inner(user_id)
      `)
      .eq("is_correct", true)
      .eq("test_attempts.user_id", userId);

    if (aError) throw aError;
    
    // Filter to only include questions belonging to this exam/subjects
    const attemptedIds = Array.from(new Set(
      (attemptedData || [])
        .map(a => a.question_id)
        .filter(id => allQuestionIdsSet.has(id))
    ));

    const unattemptedIds = allQuestionIds.filter(id => !attemptedIds.includes(id));

    // 3. Calculate target counts
    const ratio = RATIOS[mode];
    let targetAttempted = Math.round(totalCount * ratio.attempted);
    let targetUnattempted = totalCount - targetAttempted;

    // 4. Adjust if buckets are too small
    if (attemptedIds.length < targetAttempted) {
      targetUnattempted += targetAttempted - attemptedIds.length;
      targetAttempted = attemptedIds.length;
    }
    if (unattemptedIds.length < targetUnattempted) {
      targetAttempted += targetUnattempted - unattemptedIds.length;
      targetUnattempted = unattemptedIds.length;
    }

    // Ensure we don't exceed total available questions
    targetAttempted = Math.min(targetAttempted, attemptedIds.length);
    targetUnattempted = Math.min(targetUnattempted, unattemptedIds.length);

    // 5. Randomly pick from each bucket
    const shuffle = (array: string[]) => [...array].sort(() => Math.random() - 0.5);
    
    const selectedAttempted = shuffle(attemptedIds).slice(0, targetAttempted);
    const selectedUnattempted = shuffle(unattemptedIds).slice(0, targetUnattempted);

    return shuffle([...selectedAttempted, ...selectedUnattempted]);
  } catch (error) {
    console.error("Error generating mock test questions:", error);
    throw error;
  }
};

export const createMockTestSession = async (
  userId: string,
  examId: string,
  mode: DifficultyMode,
  questionCount: number,
  timeLimit: number
) => {
  const { data, error } = await supabase
    .from("test_attempts")
    .insert({
      user_id: userId,
      exam_id: examId,
      difficulty_mode: mode,
      total_questions: questionCount,
      is_mock_test: true,
      status: "STARTED",
      started_at: new Date().toISOString(),
      // We'll store the generated question list in the already existing question_ids column
      // We will generate the questions before calling this or inside this.
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};
