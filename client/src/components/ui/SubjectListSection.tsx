import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

const SubjectSkeleton = () => (
  <div className="w-64 shrink-0 snap-start">
    <div className="h-36 animate-pulse rounded-2xl border border-outline-variant/10 bg-surface-container-high/40" />
  </div>
);

// Keep the colorful subject-card treatment from the dashboard, starting with
// the leaf-green brand color and rotating through distinct soft accents.
const subjectCardColors = [
  { card: "from-primary/15 via-primary/5 to-surface-container-low", border: "border-primary/20 hover:border-primary/40", icon: "bg-primary/15 text-primary", action: "text-primary" },
  { card: "from-blue-500/15 via-blue-500/5 to-surface-container-low", border: "border-blue-500/20 hover:border-blue-500/40", icon: "bg-blue-500/15 text-blue-600", action: "text-blue-600" },
  { card: "from-amber-500/15 via-amber-500/5 to-surface-container-low", border: "border-amber-500/20 hover:border-amber-500/40", icon: "bg-amber-500/15 text-amber-600", action: "text-amber-600" },
  { card: "from-violet-500/15 via-violet-500/5 to-surface-container-low", border: "border-violet-500/20 hover:border-violet-500/40", icon: "bg-violet-500/15 text-violet-600", action: "text-violet-600" },
];

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
  const navigate = useNavigate();
  const hasMultipleExams = targetedExams.length > 1;

  const [activeExamId, setActiveExamId] = useState<string>(
    targetedExams[0]?.id || "",
  );

  useEffect(() => {
    if (activeExamId) {
      dispatch(fetchExamSubjects(activeExamId));
    }
  }, [activeExamId, dispatch]);

  return (
    <section className="rounded-2xl border border-outline-variant/10 bg-surface-container-low/60 p-4 sm:p-5">
      {/* Section Header */}
      <div className="flex justify-between items-center mb-4 px-1">
        <div className="space-y-0.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Browse by Subject
          </p>
          <h3 className="text-lg font-bold tracking-tight text-on-surface">
            Continue Learning
          </h3>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-outline-variant/10 bg-surface-container-high px-3 py-2">
          <LayoutGrid className="size-4 text-primary" />
          <span className="text-xs font-medium text-on-surface-variant">{subjectsData.length} subjects</span>
        </div>
      </div>

      {/* Exam Tabs — only if multiple exams */}
      {hasMultipleExams && (
        <div className="flex gap-2 overflow-x-auto pb-3 mb-3" style={{ scrollbarWidth: "none" }}>
          {targetedExams.map((exam) => (
            <button
              type="button"
              key={exam.id}
              onClick={() => setActiveExamId(exam.id)}
              className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                activeExamId === exam.id
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "bg-surface-container-high/60 text-on-surface-variant hover:bg-surface-container-high border border-on-surface/5"
              }`}
            >
              <GraduationCap className="size-4" />
              {exam.name}
            </button>
          ))}
        </div>
      )}

      {/* Subject Cards — Horizontal scroll */}
      <div
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {subjectsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SubjectSkeleton key={i} />)
        ) : subjectsData.length > 0 ? (
          subjectsData.map((subject, index) => {
            const colors = subjectCardColors[index % subjectCardColors.length];
            return (
              <button key={subject.subject_id ?? subject.subjects?.id ?? subject.id} type="button" onClick={() => navigate(`/user/dashboard/exam/${activeExamId}`)} className={`group flex min-h-36 w-64 shrink-0 snap-start flex-col justify-between rounded-2xl border bg-gradient-to-br ${colors.card} ${colors.border} p-4 text-left transition hover:shadow-ambient focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}>
                <span className={`grid size-10 place-items-center rounded-xl ${colors.icon}`}><BookOpen className="size-5" /></span>
                <span className="block min-w-0">
                  <span className="line-clamp-2 block text-base font-semibold leading-snug text-on-surface">{subject.subjects?.name || subject.name}</span>
                  <span className={`mt-2 flex items-center justify-between gap-2 text-sm font-medium ${colors.action}`}><span>Explore chapters</span><ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" /></span>
                </span>
              </button>
            );
          })
        ) : null}
      </div>

      {/* Empty State */}
      {!subjectsLoading && (!subjectsData || subjectsData.length === 0) && (
        <div className="rounded-2xl border border-dashed border-outline-variant/20 bg-surface-container-high/30 py-10 text-center">
          <BookOpen className="size-8 text-on-surface-variant opacity-25 mx-auto mb-3" />
          <h4 className="mb-1 text-base font-semibold text-on-surface-variant">No subjects yet</h4>
          <p className="text-sm text-on-surface-variant/70">Subjects will appear once content is added.</p>
        </div>
      )}
    </section>
  );
};
