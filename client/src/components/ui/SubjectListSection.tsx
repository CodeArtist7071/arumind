import { useEffect, useState } from "react";
import {
  ChevronRight,
  BookOpen,
  GraduationCap,
  LayoutGrid,
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

interface SubjectListSectionProps {
  targetedExams: ExamWithSubjects[];
}

const subjectColors = [
  "from-emerald-500/15 to-emerald-500/5 border-emerald-500/15",
  "from-blue-500/15 to-blue-500/5 border-blue-500/15",
  "from-amber-500/15 to-amber-500/5 border-amber-500/15",
  "from-violet-500/15 to-violet-500/5 border-violet-500/15",
  "from-rose-500/15 to-rose-500/5 border-rose-500/15",
  "from-cyan-500/15 to-cyan-500/5 border-cyan-500/15",
];

const subjectIconColors = [
  "bg-emerald-500/15 text-emerald-600",
  "bg-blue-500/15 text-blue-600",
  "bg-amber-500/15 text-amber-600",
  "bg-violet-500/15 text-violet-600",
  "bg-rose-500/15 text-rose-600",
  "bg-cyan-500/15 text-cyan-600",
];

const SubjectSkeleton = () => (
  <div className="shrink-0 w-[220px] snap-start">
    <div className="h-[130px] bg-surface-container-high/40 rounded-2xl animate-pulse border border-on-surface/5" />
  </div>
);

export const SubjectListSection = ({
  targetedExams,
}: SubjectListSectionProps) => {
  const {
    data: subjectsData,
    loading: subjectsLoading,
  } = useSelector(
    (state: RootState) =>
      state.examSubject ?? { data: [], e_data: [], loading: false },
  );
  const dispatch = useDispatch<AppDispatch>();
  const hasMultipleExams = targetedExams.length > 1;

  const [activeExamId, setActiveExamId] = useState<string>(
    targetedExams[0]?.id || "",
  );

  useEffect(() => {
    if (activeExamId) {
      dispatch(fetchExamSubjects(activeExamId));
    }
  }, [activeExamId]);

  return (
    <section className="rounded-2xl">
      {/* Section Header */}
      <div className="flex justify-between items-center mb-4 px-1">
        <div className="space-y-0.5">
          <p className="text-[10px] font-technical font-black uppercase tracking-[0.25em] text-on-surface-variant opacity-50">
            Browse by Subject
          </p>
          <h3 className="text-lg font-black text-on-surface tracking-tight">
            Continue Learning
          </h3>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high rounded-full border border-on-surface/5">
          <LayoutGrid className="size-3.5 text-primary" />
          <span className="text-[9px] font-technical font-black uppercase tracking-wider text-on-surface-variant opacity-60">{subjectsData.length} Subjects</span>
        </div>
      </div>

      {/* Exam Tabs — only if multiple exams */}
      {hasMultipleExams && (
        <div className="flex gap-2 overflow-x-auto pb-3 mb-3" style={{ scrollbarWidth: "none" }}>
          {targetedExams.map((exam) => (
            <button
              key={exam.id}
              onClick={() => setActiveExamId(exam.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-[10px] font-technical font-black uppercase tracking-widest transition-all duration-300 ${
                activeExamId === exam.id
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "bg-surface-container-high/60 text-on-surface-variant hover:bg-surface-container-high border border-on-surface/5"
              }`}
            >
              <GraduationCap className="size-3" />
              {exam.name}
            </button>
          ))}
        </div>
      )}

      {/* Subject Cards — Horizontal scroll */}
      <div
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {subjectsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SubjectSkeleton key={i} />)
        ) : subjectsData.length > 0 ? (
          subjectsData.map((subject, index) => {
            const colorClass = subjectColors[index % subjectColors.length];
            const iconColor = subjectIconColors[index % subjectIconColors.length];
            return (
              <div key={index} className="shrink-0 w-[200px] snap-start">
                <div className={`h-[130px] bg-gradient-to-br ${colorClass} border rounded-2xl p-4 cursor-pointer group hover:scale-[1.02] hover:shadow-ambient transition-all duration-300 flex flex-col justify-between relative overflow-hidden`}>
                  {/* Decorative blob */}
                  <div className="absolute -bottom-4 -right-4 size-20 rounded-full bg-on-surface/3 group-hover:scale-125 transition-transform duration-500" />

                  <div className={`size-9 rounded-xl ${iconColor} flex items-center justify-center shadow-sm`}>
                    <BookOpen className="size-4" />
                  </div>

                  <div>
                    <h4 className="font-black text-sm text-on-surface tracking-tight leading-tight line-clamp-2">
                      {subject.subjects?.name || subject.name}
                    </h4>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[9px] font-technical font-black uppercase tracking-widest text-on-surface-variant opacity-50">Start Practice</span>
                      <ChevronRight className="size-3.5 text-on-surface-variant opacity-40 group-hover:translate-x-0.5 group-hover:opacity-80 transition-all duration-300" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : null}
      </div>

      {/* Empty State */}
      {!subjectsLoading && (!subjectsData || subjectsData.length === 0) && (
        <div className="py-10 text-center bg-surface-container-high/30 rounded-2xl border border-dashed border-on-surface/8">
          <BookOpen className="size-8 text-on-surface-variant opacity-25 mx-auto mb-3" />
          <h4 className="text-sm font-black text-on-surface-variant mb-1">No subjects yet</h4>
          <p className="text-xs text-on-surface-variant opacity-50">Subjects will appear once content is added</p>
        </div>
      )}
    </section>
  );
};
