import { useEffect, useState } from "react";
import {
  ChevronRight,
  BookOpen,
  GraduationCap,
  Hash,
} from "lucide-react";
import type { examProps } from "../../slice/examSlice";
import type { AppDispatch, RootState } from "../../store";
import { useDispatch, useSelector } from "react-redux";
import { fetchExamSubjects } from "../../slice/examSubjectSlice";

interface Subject {
  id: string;
  name: string;
  totalChapters: number;
  totalQuestions: number;
  progress: number;
  icon: string;
}

interface ExamWithSubjects extends examProps {
  subjects: Subject[];
}

interface ChapterListSectionProps {
  targetedExams: ExamWithSubjects[];
}

export const ChapterListSection = ({
  targetedExams,
}: ChapterListSectionProps) => {
  const {
    data: subjectData,
    e_data: chaptersData,
    loading: subjectsLoading,
  } = useSelector(
    (state: RootState) =>
      state.examSubject ?? { data: [], e_data: [], loading: false },
  );
  const dispatch = useDispatch<AppDispatch>();
  const hasMultipleExams = targetedExams.length > 1;
  const listofExams = targetedExams.map((exam) => exam.id);

  const [activeSubjectId, setActiveSubjectId] = useState<string>(
    subjectData[0]?.subject_id || subjectData[0]?.subjects?.id || "",
  );

  const filteredChaptersData = chaptersData.filter(
    (chapter) => chapter.subjects?.id === activeSubjectId,
  );

  useEffect(() => {
    dispatch(fetchExamSubjects(listofExams));
  }, [activeSubjectId]);

  // Auto-select first subject when data loads
  useEffect(() => {
    if (subjectData.length > 0 && !activeSubjectId) {
      setActiveSubjectId(subjectData[0]?.subject_id || subjectData[0]?.subjects?.id || "");
    }
  }, [subjectData]);

  return (
    <section className="block md:hidden mb-6 rounded-3xl overflow-hidden border border-on-surface/5 bg-surface-container-high/60 shadow-ambient">
      {/* Section Header */}
      <div className="px-5 pt-5 pb-4 border-b border-on-surface/5">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[10px] font-technical font-black uppercase tracking-[0.25em] text-on-surface-variant opacity-50">
              Chapter Wise Practice
            </p>
            <h3 className="text-base font-black text-on-surface tracking-tight">
              Pick a Chapter
            </h3>
          </div>
          <div className="size-9 bg-primary/10 rounded-xl flex items-center justify-center">
            <BookOpen className="size-4 text-primary" />
          </div>
        </div>
      </div>

      {/* Subject Tabs */}
      {subjectData.length > 0 && (
        <div className="px-4 pt-4 pb-3">
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {subjectData.map((subject, index) => (
              <button
                key={index}
                onClick={() => setActiveSubjectId(subject.subjects?.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-[10px] font-technical font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${
                  activeSubjectId === subject.subjects?.id
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "bg-surface-container-highest text-on-surface-variant hover:bg-on-surface/10"
                }`}
              >
                <GraduationCap className="size-3" />
                {subject.subjects?.name || "Subject"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chapter List */}
      <div className="px-4 pb-4">
        {subjectsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 bg-surface-container-highest/40 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredChaptersData.length > 0 ? (
          <div className="space-y-2 max-h-[280px] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {filteredChaptersData.map((chapter, index) => (
              <div
                key={index}
                className="flex items-center gap-3 px-4 py-3.5 bg-surface-container-highest/40 rounded-2xl hover:bg-surface-container-highest cursor-pointer group transition-all duration-200 active:scale-[0.98]"
              >
                {/* Chapter Index */}
                <div className="size-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-technical font-black">{index + 1}</span>
                </div>

                {/* Chapter Name */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-sm text-on-surface tracking-tight truncate leading-tight">
                    {chapter.name}
                  </h4>
                </div>

                {/* Arrow */}
                <ChevronRight className="size-4 text-on-surface-variant opacity-30 group-hover:text-primary group-hover:opacity-80 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : subjectData.length > 0 ? (
          <div className="py-8 text-center">
            <Hash className="size-7 text-on-surface-variant opacity-25 mx-auto mb-2" />
            <p className="text-sm font-black text-on-surface-variant opacity-50">No chapters yet</p>
            <p className="text-xs text-on-surface-variant opacity-35 mt-0.5">Select a subject to see chapters</p>
          </div>
        ) : (
          <div className="py-8 text-center">
            <BookOpen className="size-7 text-on-surface-variant opacity-25 mx-auto mb-2" />
            <p className="text-sm font-black text-on-surface-variant opacity-50">No subjects available</p>
            <p className="text-xs text-on-surface-variant opacity-35 mt-0.5">Content will appear once added</p>
          </div>
        )}
      </div>
    </section>
  );
};
