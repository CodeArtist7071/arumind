import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";

/**
 * A specialized hook for orchestrating the hierarchical curriculum lattice.
 * Synchronizes Exams, Subjects, and metadata counts to provide a smart administrative view.
 */
export function useCurriculumLattice() {
  const [exams, setExams] = useState<any[]>([]);
  const [questionCountsByChapter, setQuestionCountsByChapter] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLatticeData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch core exams manifestation
      const { data: examsData, error: examsError } = await supabase
        .from("exams")
        .select("*")
        .is("is_active", true);
      if (examsError) throw examsError;

      // 2. Fetch subjects globally
      const { data: subjectsData, error: subjectsError } = await supabase
        .from("subjects")
        .select("*");
      if (subjectsError) throw subjectsError;

      // 3. Fetch links between exams and subjects
      const { data: linksData, error: linksError } = await supabase
        .from("exam_subjects")
        .select("*");
      if (linksError) throw linksError;

      // 4. Fetch chapter metadata for counting
      const { data: chaptersData, error: chaptersError } = await supabase
        .from("chapters")
        .select("id, subject_id");
      if (chaptersError) throw chaptersError;

      // 5. Fetch every chapter reference in pages (Supabase applies a row limit).
      const questionCounts: Record<string, number> = {};
      const questionPageSize = 1000;
      for (let from = 0; ; from += questionPageSize) {
        const { data: questionsData, error: questionsError } = await supabase
          .from("questions")
          .select("chapter_id")
          .range(from, from + questionPageSize - 1);
        if (questionsError) throw questionsError;
        for (const question of questionsData ?? []) {
          questionCounts[question.chapter_id] = (questionCounts[question.chapter_id] ?? 0) + 1;
        }
        if (!questionsData || questionsData.length < questionPageSize) break;
      }
      setQuestionCountsByChapter(questionCounts);

      // Orchestrate the curriculum manifestation
      const processedExams = examsData.map((exam) => {
        const associatedSubjectIds = linksData
          .filter((l) => l.exam_id === exam.id)
          .map((l) => l.subject_id);

        const associatedSubjects = subjectsData
          .filter((s) => associatedSubjectIds.includes(s.id))
          .map((s) => {
            const subjectChapters = chaptersData.filter((c) => c.subject_id === s.id);
            const chapterIds = subjectChapters.map((c) => c.id);
            const questionCount = chapterIds.reduce(
              (count, chapterId) => count + (questionCounts[chapterId] ?? 0),
              0,
            );

            return {
              ...s,
              chapterCount: subjectChapters.length,
              questionCount,
            };
          });

        return {
          ...exam,
          subjects: associatedSubjects,
          totalChapters: associatedSubjects.reduce((acc, s) => acc + s.chapterCount, 0),
          totalQuestions: associatedSubjects.reduce((acc, s) => acc + s.questionCount, 0),
        };
      });

      setExams(processedExams);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLatticeData();
  }, [fetchLatticeData]);

  return { exams, questionCountsByChapter, loading, error, refresh: fetchLatticeData };
}
