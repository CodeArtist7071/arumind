import type { DifficultyLevel } from "../utils/adaptiveDifficulty";
import { supabase } from "../utils/supabase";

export const getMockTestQuestions = async (
  examId: string,
  totalQuestions = 100,
  userId?: string  // optional — if provided, weights toward weak areas
) => {
  // Standard OPSC distribution
  const distribution = {
    Easy:     Math.round(totalQuestions * 0.40),  // 40
    Moderate: Math.round(totalQuestions * 0.40),  // 40
    Hard:     Math.round(totalQuestions * 0.20),  // 20
  };

  // If user has ability data, fetch more questions from weak chapters
  let weakChapterIds: string[] = [];
  if (userId) {
    const { data: abilities } = await supabase
      .from("user_ability")
      .select("chapter_id, theta")
      .eq("user_id", userId)
      .eq("exam_id", examId)
      .lt("theta", 0.4); // weak chapters only

    weakChapterIds = abilities?.map((a) => a.chapter_id) ?? [];
  }

  const fetchForDifficulty = async (
    difficulty: DifficultyLevel,
    count: number
  ) => {
    // If user has weak chapters, fetch 60% from those, 40% from all
    const weakCount = weakChapterIds.length > 0
      ? Math.round(count * 0.6)
      : 0;
    const generalCount = count - weakCount;

    const results: any[] = [];

    if (weakCount > 0) {
      const { data } = await supabase
        .from("questions")
        .select("id, question, options, correct_answer, difficulty_level, marks, chapter_id, subject_id")
        .eq("exam_id", examId)
        .eq("difficulty_level", difficulty)
        .eq("is_active", true)
        .in("chapter_id", weakChapterIds)
        .limit(weakCount);
      results.push(...(data ?? []));
    }

    if (generalCount > 0) {
      const existingIds = results.map((r) => r.id);
      let query = supabase
        .from("questions")
        .select("id, question, options, correct_answer, difficulty_level, marks, chapter_id, subject_id")
        .eq("exam_id", examId)
        .eq("difficulty_level", difficulty)
        .eq("is_active", true)
        .limit(generalCount);

      if (existingIds.length > 0) {
        query = query.not("id", "in", `(${existingIds.join(",")})`);
      }

      const { data } = await query;
      results.push(...(data ?? []));
    }

    return results;
  };

  const [easy, moderate, hard] = await Promise.all([
    fetchForDifficulty("Easy", distribution.Easy),
    fetchForDifficulty("Moderate", distribution.Moderate),
    fetchForDifficulty("Hard", distribution.Hard),
  ]);

  // Merge and shuffle
  const all = [...easy, ...moderate, ...hard];
  return all.sort(() => Math.random() - 0.5);
};
