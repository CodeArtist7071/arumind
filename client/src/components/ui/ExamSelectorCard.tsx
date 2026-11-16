import { ChevronRight, Notebook, Plus, Zap, BookOpen } from "lucide-react";
import type { examProps } from "../../slice/examSlice";

interface ExamSelectorCardProps {
  targetRef?: React.RefObject<HTMLElement> | null;
  targetedExams: examProps[];
  onSelect: (exam: examProps) => void;
  onViewAll: () => void;
  loading?: boolean;
}

const ExamSkeleton = () => (
  <div className="p-6 w-full bg-surface-container-high/30 rounded-3xl animate-pulse border border-on-surface/5">
    <div className="flex flex-col gap-4">
      <div className="size-12 bg-surface-container-highest rounded-2xl" />
      <div className="space-y-2">
        <div className="h-5 bg-surface-container-highest rounded-lg w-32" />
        <div className="h-3 bg-surface-container-highest rounded w-48" />
      </div>
      <div className="h-2 bg-surface-container-highest rounded-full w-full mt-2" />
    </div>
  </div>
);

const examColorPalette = [
  { bg: "from-primary/10 to-primary/5", accent: "bg-primary", iconBg: "bg-primary/15 text-primary", bar: "bg-primary" },
  { bg: "from-blue-500/10 to-blue-500/5", accent: "bg-blue-500", iconBg: "bg-blue-500/15 text-blue-600", bar: "bg-blue-500" },
  { bg: "from-amber-500/10 to-amber-500/5", accent: "bg-amber-500", iconBg: "bg-amber-500/15 text-amber-600", bar: "bg-amber-500" },
  { bg: "from-violet-500/10 to-violet-500/5", accent: "bg-violet-500", iconBg: "bg-violet-500/15 text-violet-600", bar: "bg-violet-500" },
];

export const ExamSelectorCard = ({
  targetedExams,
  onSelect,
  onViewAll,
  loading,
}: ExamSelectorCardProps) => {
  return (
    <section className="hidden md:block scroll-mt-15">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 px-1">
        <div className="space-y-0.5">
          <h3 className="text-xs font-technical font-black uppercase tracking-[0.25em] text-on-surface-variant opacity-60">
            Your Target Exams
          </h3>
          <p className="text-lg font-black text-on-surface tracking-tight leading-tight">
            Continue Preparing
          </p>
        </div>
        <button
          onClick={onViewAll}
          className="flex items-center gap-2 cursor-pointer font-technical bg-primary text-white px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 active:scale-95 transition-all duration-300 shadow-md shadow-primary/20"
        >
          <Plus size={14} />
          Add Exam
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <ExamSkeleton key={i} />
          ))
        ) : targetedExams.length > 0 ? (
          targetedExams.map((exam, index) => {
            const palette = examColorPalette[index % examColorPalette.length];
            return (
              <div
                key={exam.id}
                onClick={() => onSelect(exam)}
                className="group relative cursor-pointer overflow-hidden rounded-3xl border border-on-surface/5 bg-surface-container-high/60 hover:bg-surface-container-high shadow-ambient hover:shadow-ambient-lg transition-all duration-500 hover:-translate-y-1 p-6"
              >
                {/* Background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${palette.bg} opacity-60 group-hover:opacity-100 transition-opacity duration-500`} />

                {/* Decorative circle */}
                <div className="absolute -top-6 -right-6 size-24 rounded-full bg-on-surface/3 group-hover:bg-on-surface/5 transition-colors duration-500" />

                <div className="relative z-10 flex flex-col gap-4">
                  {/* Icon + Action Row */}
                  <div className="flex items-start justify-between">
                    <div className={`size-12 rounded-2xl ${palette.iconBg} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500`}>
                      <Notebook className="size-6" />
                    </div>
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-on-surface/5 group-hover:bg-primary group-hover:text-white rounded-full transition-all duration-500">
                      <span className="text-[9px] font-technical font-black uppercase tracking-widest text-on-surface-variant group-hover:text-white transition-colors">Start Test</span>
                      <ChevronRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  {/* Exam Name */}
                  <div>
                    <h4 className="font-black text-xl text-on-surface tracking-tight leading-tight mb-1">
                      {exam.name}
                    </h4>
                    <p className="text-xs text-on-surface-variant opacity-60 font-medium leading-relaxed line-clamp-2">
                      {exam.full_name}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-technical font-black uppercase tracking-widest text-on-surface-variant opacity-50">Syllabus Progress</span>
                      <span className="text-[9px] font-technical font-black text-on-surface-variant opacity-50">0%</span>
                    </div>
                    <div className="h-1.5 bg-on-surface/8 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${palette.bar} rounded-full transition-all duration-1000`}
                        style={{ width: "0%" }}
                      />
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-3 pt-1">
                    <div className="flex items-center gap-1.5 text-on-surface-variant opacity-50">
                      <BookOpen className="size-3" />
                      <span className="text-[9px] font-technical font-black uppercase tracking-wider">Explore Subjects</span>
                    </div>
                    <div className="flex items-center gap-1 ml-auto">
                      <Zap className="size-3 text-on-surface-variant opacity-40" />
                      <span className="text-[9px] font-technical font-black text-on-surface-variant opacity-40 uppercase tracking-wider">{exam.type || "Govt"}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-14 text-center bg-surface-container-high/30 rounded-3xl border-2 border-dashed border-on-surface/8">
            <div className="size-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Notebook className="size-7 text-primary opacity-60" />
            </div>
            <h4 className="text-base font-black text-on-surface mb-1">No exams selected yet</h4>
            <p className="text-sm text-on-surface-variant opacity-50 font-medium mb-5">Add exams you're preparing for to get started.</p>
            <button
              onClick={onViewAll}
              className="text-xs font-technical bg-primary text-white px-6 py-2.5 rounded-full font-black uppercase tracking-widest hover:bg-primary/90 transition-all duration-300 shadow-md shadow-primary/20"
            >
              Add Exams Here
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
