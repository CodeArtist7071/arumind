import { useCallback, useEffect, useState } from "react";
import { supabase } from "../utils/supabase";

export interface ChapterQuestionStatus {
  id: string;
  name: string;
  subjectName: string;
  activeCount: number;
  inactiveCount: number;
}

const PAGE_SIZE = 1000;

export function useChapterQuestionStatus() {
  const [chapters, setChapters] = useState<ChapterQuestionStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [chapterRows, subjectRows] = await Promise.all([
        (async () => {
          const rows: any[] = [];
          for (let from = 0; ; from += PAGE_SIZE) {
            const { data, error: queryError } = await supabase
              .from("chapters")
              .select("id, name, subject_id")
              .order("id", { ascending: true })
              .range(from, from + PAGE_SIZE - 1);
            if (queryError) throw queryError;
            rows.push(...(data ?? []));
            if (!data || data.length < PAGE_SIZE) return rows;
          }
        })(),
        (async () => {
          const rows: any[] = [];
          for (let from = 0; ; from += PAGE_SIZE) {
            const { data, error: queryError } = await supabase
              .from("subjects")
              .select("id, name")
              .order("id", { ascending: true })
              .range(from, from + PAGE_SIZE - 1);
            if (queryError) throw queryError;
            rows.push(...(data ?? []));
            if (!data || data.length < PAGE_SIZE) return rows;
          }
        })(),
      ]);

      const counts = new Map<string, { active: number; inactive: number }>();
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error: queryError } = await supabase
          .from("questions")
          .select("chapter_id, is_active")
          .order("id", { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
        if (queryError) throw queryError;
        for (const question of data ?? []) {
          const chapterCount = counts.get(question.chapter_id) ?? { active: 0, inactive: 0 };
          if (question.is_active) chapterCount.active += 1;
          else chapterCount.inactive += 1;
          counts.set(question.chapter_id, chapterCount);
        }
        if (!data || data.length < PAGE_SIZE) break;
      }

      const subjectNameById = new Map(subjectRows.map((subject: any) => [subject.id, subject.name]));
      setChapters(chapterRows.map((chapter: any) => {
        const count = counts.get(chapter.id) ?? { active: 0, inactive: 0 };
        return {
          id: chapter.id,
          name: chapter.name,
          subjectName: subjectNameById.get(chapter.subject_id) ?? "Unknown subject",
          activeCount: count.active,
          inactiveCount: count.inactive,
        };
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load chapter question counts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { chapters, loading, error, refresh };
}
