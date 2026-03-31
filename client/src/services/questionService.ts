import type { DifficultyLevel } from "../utils/adaptiveDifficulty";
import { supabase } from "../utils/supabase";

// services/questionService.ts

export const getQuestions = async (
  chapter_id: string,
  language: "en" | "od" = "en"
) => {
  const { data, error } = await supabase
    .from("questions")
    .select(`
      id,
      exam_id,
      subject_id,
      chapter_id,
      correct_answer,
      difficulty_level,
      marks,
      negative_marks,
      options,
      question,
      question_number,
      diagram_url,
      diagram_present,
      odia_questions (
        question,
        options
      )
    `)
    .eq("chapter_id", chapter_id)
    .eq("is_active", true)
    .order("question_number").limit(30);

  if (error) throw error;

  // If Odia requested, swap in translated text where available
  if (language === "od") {
    return data?.map((q) => {
      const translation = q.odia_questions?.[0];
      return {
        ...q,
        question: translation?.question ?? q.question,  // fallback to English
        options: translation?.options ?? q.options,
      };
    });
  }

  return data;
};

export const getFilteredQuestions = async (userId: string, limit = 30)=> {
  try {
    // Step 1: Get all correctly answered question IDs for this user
   const { data: correctAnswers, error:err1 } = await supabase
  .from("test_attempt_answers")
  .select(`
    question_id,
    test_attempts!inner(user_id)
  `)
  .eq("is_correct", true)
  .filter("test_attempts.user_id", "eq", userId);

    if (err1) throw err1;
    console.log("correctAnswers",correctAnswers);
    const correctQuestionIds = correctAnswers?.map((a) => a.question_id) || [];
    console.log("correctQuestionIds",correctQuestionIds)
    // Step 2: Fetch 30 questions excluding correctly answered ones
    let query = supabase.from("questions").select("*").limit(limit);

    if (correctQuestionIds.length > 0) {
      query = query.not("id", "in", `(${correctQuestionIds.join(",")})`);
    }

    const { data: questions, error: err2 } = await query;
    if (err2) throw err2;

    return questions;
  } catch (error) {
    console.error("Error fetching unmastered questions:", error);
    return [];
  }
}
// ── Fetch ability score for a chapter ──────────────────────────────────────
export const getUserAbility = async (
  userId: string,
  chapterId: string
): Promise<{ theta: number; streak: number; total_seen: number; total_correct: number } | null> => {
  const { data } = await supabase
    .from("user_ability")
    .select("theta, streak, total_seen, total_correct")
    .eq("user_id", userId)
    .eq("chapter_id", chapterId)
    .maybeSingle();

  return data;
};

// ── Upsert ability after each answer ───────────────────────────────────────
export const saveUserAbility = async (
  userId: string,
  examId: string,
  chapterId: string,
  ability: { theta: number; streak: number; total_seen: number; total_correct: number }
) => {
  await supabase.from("user_ability").upsert(
    {
      user_id:       userId,
      exam_id:       examId,
      chapter_id:    chapterId,
      theta:         ability.theta,
      streak:        ability.streak,
      total_seen:    ability.total_seen,
      total_correct: ability.total_correct,
      last_updated:  new Date().toISOString(),
    },
    { onConflict: "user_id,chapter_id" }
  );
};

// ── Adaptive question fetch ─────────────────────────────────────────────────
export const getAdaptiveQuestions = async (
  chapterId: string,
  difficulty: DifficultyLevel,
  excludeIds: string[] = [],   // already seen this session
  limit = 1,
  language: "en" | "od" = "en"
) => {
  const table = language === "od" ? "odia_questions" : "questions";

  let query = supabase
    .from(table)
    .select(`
      id,
      exam_id,
      subject_id,
      chapter_id,
      question,
      options,
      correct_answer,
      difficulty_level,
      marks,
      negative_marks,
      diagram_url,
      diagram_present
    `)
    .eq("chapter_id", chapterId)
    .eq("difficulty_level", difficulty)
    .eq("is_active", true);

  // Exclude already-seen questions this session
  if (excludeIds.length > 0) {
    query = query.not("id", "in", `(${excludeIds.join(",")})`);
  }

  // Random order so same questions don't repeat in same order
  query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;

  // If no questions at this difficulty, fall back to adjacent level
  if (!data || data.length === 0) {
    const fallback: DifficultyLevel =
      difficulty === "Hard" ? "Moderate"
      : difficulty === "Easy" ? "Moderate"
      : "Easy";

    const { data: fallbackData } = await supabase
      .from(table)
      .select("id, exam_id, subject_id, chapter_id, question, options, correct_answer, difficulty_level, marks, negative_marks, diagram_url, diagram_present")
      .eq("chapter_id", chapterId)
      .eq("difficulty_level", fallback)
      .eq("is_active", true)
      .not("id", "in", excludeIds.length > 0 ? `(${excludeIds.join(",")})` : "(null)")
      .limit(limit);

    return fallbackData ?? [];
  }

  return data;
};

// ── Compute initial theta from past attempts ────────────────────────────────
export const computeInitialTheta = async (
  userId: string,
  chapterId: string
): Promise<number> => {
  const { data: attempts } = await supabase
    .from("test_attempts")
    .select("id")
    .eq("user_id", userId)
    .eq("chapter_id", chapterId)
    .eq("status", "COMPLETED");

  if (!attempts?.length) return 0.3; // default — start at Easy-Moderate boundary

  const attemptIds = attempts.map((a) => a.id);

  const { data: answers } = await supabase
    .from("test_attempt_answers")
    .select("selected_option, questions(correct_answer)")
    .in("attempt_id", attemptIds);

  if (!answers?.length) return 0.3;

  const correct = answers.filter(
    (a) => a.selected_option === (a.questions as any)?.correct_answer
  ).length;

  const accuracy = correct / answers.length;

  // Map accuracy to theta — past 80% accuracy = start at Hard
  return parseFloat(Math.min(0.95, accuracy * 1.1).toFixed(4));
};




// services/questionService.ts

export const seedAbilityFromMockTest = async (
  userId: string,
  examId: string,
  attemptId: string
) => {
  // Get all answers from this mock attempt with question difficulty
  const { data: answers } = await supabase
    .from("test_attempt_answers")
    .select(`
      selected_option,
      questions (
        id,
        chapter_id,
        correct_answer,
        difficulty_level
      )
    `)
    .eq("attempt_id", attemptId);

  if (!answers?.length) return;

  // Group by chapter
  const byChapter: Record<string, typeof answers> = {};
  answers.forEach((a) => {
    const q = a.questions as any;
    if (!q?.chapter_id) return;
    if (!byChapter[q.chapter_id]) byChapter[q.chapter_id] = [];
    byChapter[q.chapter_id].push(a);
  });

  // For each chapter compute and save theta
  const upserts = Object.entries(byChapter).map(([chapterId, chAnswers]) => {
    let correct = 0;
    let total = 0;

    chAnswers.forEach((a) => {
      const q = a.questions as any;
      if (!a.selected_option) return; // skipped
      total++;
      if (a.selected_option === q.correct_answer) correct++;
    });

    const accuracy = total > 0 ? correct / total : 0;
    // Scale to 0.1–0.85 — don't go full 1.0 from one test
    const theta = parseFloat(
      Math.min(0.85, Math.max(0.1, accuracy * 0.9)).toFixed(4)
    );

    return {
      user_id: userId,
      exam_id: examId,
      chapter_id: chapterId,
      theta,
      streak: 0,
      total_seen: total,
      total_correct: correct,
      last_updated: new Date().toISOString(),
    };
  });

  // Upsert all chapters at once
  await supabase
    .from("user_ability")
    .upsert(upserts, { onConflict: "user_id,chapter_id" });
};

export const getQuestionsByIds = async (ids: string[]) => {
  const { data, error } = await supabase
    .from("questions")
    .select(`
      id,
      exam_id,
      subject_id,
      chapter_id,
      correct_answer,
      difficulty_level,
      marks,
      negative_marks,
      options,
      question,
      question_number,
      diagram_url,
      diagram_present,
      odia_questions (
        question,
        options
      )
    `)
    .in("id", ids);

  if (error) throw error;
  return data;
};
