import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const listofExams = targetedExams.map((exam) => exam.id);
  const examIdsKey = listofExams.join(",");

  const [activeSubjectId, setActiveSubjectId] = useState<string>(
    subjectData[0]?.subject_id || subjectData[0]?.subjects?.id || "",
  );

  const filteredChaptersData = chaptersData.filter(
    (chapter) => chapter.subjects?.id === activeSubjectId,
  );

  useEffect(() => {
    if (listofExams.length) dispatch(fetchExamSubjects(listofExams));
  }, [dispatch, examIdsKey]);

  // Auto-select first subject when data loads
  useEffect(() => {
    if (subjectData.length > 0 && !activeSubjectId) {
      setActiveSubjectId(subjectData[0]?.subject_id || subjectData[0]?.subjects?.id || "");
    }
  }, [subjectData]);

  return (
    <section className="mb-6 block overflow-hidden rounded-2xl border border-outline-variant/10 bg-surface-container-low/60 shadow-ambient md:hidden">
      {/* Section Header */}
      <div className="border-b border-outline-variant/10 px-4 py-4 sm:px-5">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Chapter Wise Practice
            </p>
            <h3 className="text-lg font-bold tracking-tight text-on-surface">
              Pick a Chapter
            </h3>
          </div>
          <div className="grid size-10 place-items-center rounded-xl bg-primary/10">
            <BookOpen className="size-5 text-primary" />
          </div>
        </div>
      </div>

      {/* Subject Tabs */}
      {subjectData.length > 0 && (
        <div className="px-4 pt-4 pb-2">
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {subjectData.map((subject, index) => (
              <button
                type="button"
                key={index}
                onClick={() => setActiveSubjectId(subject.subjects?.id)}
                className={`flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                  activeSubjectId === subject.subjects?.id
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "bg-surface-container-highest text-on-surface-variant hover:bg-on-surface/10"
                }`}
              >
                <GraduationCap className="size-4" />
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
              <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-container-highest/40" />
            ))}
          </div>
        ) : filteredChaptersData.length > 0 ? (
          <div className="max-h-[min(60vh,520px)] space-y-2 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {filteredChaptersData.map((chapter, index) => (
              <button
                type="button"
                key={index}
                onClick={() => {
                  const linkedExamIds = chapter.subjects?.exam_subjects?.map((link: any) => link.exam_id) ?? [];
                  const exam = targetedExams.find((targetedExam) => linkedExamIds.includes(targetedExam.id)) ?? targetedExams[0];
                  if (exam) navigate(`/user/dashboard/exam/${exam.id}`, { state: { autoOpenChapterId: chapter.id } });
                }}
                className="group flex min-h-14 w-full items-center gap-3 rounded-xl border border-outline-variant/10 bg-surface-container-high/50 px-3.5 py-3 text-left transition-colors hover:bg-surface-container-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary active:bg-primary/5"
              >
                {/* Chapter Index */}
                <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <span className="text-sm font-semibold">{index + 1}</span>
                </div>

                {/* Chapter Name */}
                <div className="flex-1 min-w-0">
                  <h4 className="truncate text-base font-semibold leading-snug text-on-surface">
                    {chapter.name}
                  </h4>
                </div>

                {/* Arrow */}
                <ChevronRight className="size-4 text-on-surface-variant opacity-30 group-hover:text-primary group-hover:opacity-80 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0" />
              </button>
            ))}
          </div>
        ) : subjectData.length > 0 ? (
          <div className="py-8 text-center">
            <Hash className="size-7 text-on-surface-variant opacity-25 mx-auto mb-2" />
            <p className="text-base font-semibold text-on-surface-variant">No chapters yet</p>
            <p className="mt-1 text-sm text-on-surface-variant/70">Select a subject to see chapters.</p>
          </div>
        ) : (
          <div className="py-8 text-center">
            <BookOpen className="size-7 text-on-surface-variant opacity-25 mx-auto mb-2" />
            <p className="text-base font-semibold text-on-surface-variant">No subjects available</p>
            <p className="mt-1 text-sm text-on-surface-variant/70">Content will appear once added.</p>
          </div>
        )}
      </div>
    </section>
  );
};
