import { supabase } from "../utils/supabase";

export const getQuestions = async (chapter_id: string) => {
  const { data, error } = await supabase
    .from("questions")
    .select(
      ` exam_id,
      subject_id,
      id,
      question,
      options,
      correct_answer,
      difficulty_level,
      marks
    `,
    )
    .eq("chapter_id", chapter_id);

  if (error) throw error;

  return data;
};