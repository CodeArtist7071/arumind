import { ChevronRight, Notebook, Plus, Zap } from "lucide-react";
import type { examProps } from "../../slice/examSlice";

interface ExamSelectorCardProps {
  targetRef?: React.RefObject<HTMLElement> | null;
  targetedExams: examProps[];
  onSelect: (exam: examProps) => void;
  onViewAll: () => void;
  loading?: boolean;
}

const ExamSkeleton = () => (
  <div className="w-full">
    <div className="px-5 py-5 bg-surface-container-high/30 rounded-2xl animate-pulse border border-on-surface/5 min-h-[180px] flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="size-10 bg-surface-container-highest rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-surface-container-highest rounded w-28" />
          <div className="h-3 bg-surface-container-highest rounded w-40" />
        </div>
      </div>
      <div className="h-2 bg-surface-container-highest rounded-full w-full mt-auto" />
    </div>
  </div>
);

const examColorPalette = [
  { gradient: "from-primary/20 via-primary/10 to-transparent", iconBg: "bg-primary/15 text-primary", bar: "bg-primary", dot: "bg-primary" },
  { gradient: "from-blue-500/20 via-blue-500/10 to-transparent", iconBg: "bg-blue-500/15 text-blue-600", bar: "bg-blue-500", dot: "bg-blue-500" },
  { gradient: "from-amber-500/20 via-amber-500/10 to-transparent", iconBg: "bg-amber-500/15 text-amber-600", bar: "bg-amber-500", dot: "bg-amber-500" },
  { gradient: "from-violet-500/20 via-violet-500/10 to-transparent", iconBg: "bg-violet-500/15 text-violet-600", bar: "bg-violet-500", dot: "bg-violet-500" },
];

export const ExamSelectorCardMobile = ({
  targetedExams,
  onSelect,
  onViewAll,
  loading,
}: ExamSelectorCardProps) => {
  return (
    <section className="block md:hidden scroll-mt-15">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 px-1">
        <div className="space-y-0.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Your Exams
          </p>
          <h3 className="text-lg font-bold tracking-tight text-on-surface">
            Take Mock Tests
          </h3>
        </div>
        <button
          onClick={onViewAll}
          className="flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-white transition-all duration-300 hover:bg-primary/90"
        >
          <Plus size={12} />
          Add
        </button>
      </div>

      {/* Mobile exam list: vertically stacked for quick scanning */}
      <div className="grid gap-3 px-1 pb-2">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <ExamSkeleton key={i} />)
          ) : targetedExams.length > 0 ? (
            targetedExams.map((exam, index) => {
              const palette = examColorPalette[index % examColorPalette.length];
              return (
                <button
                  type="button"
                  key={exam.id}
                  className="relative w-full overflow-hidden rounded-2xl border border-primary/15 bg-surface-container-high/70 p-4 text-left shadow-sm transition hover:border-primary/30 hover:shadow-ambient focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:p-5"
                  onClick={() => onSelect(exam)}
                >
                  <div className="group relative flex flex-col gap-4">
                    {/* Background gradient blob */}
                    <div className={`absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br ${palette.gradient} -translate-y-8 translate-x-8`} />

                    <div className="relative z-10 flex flex-col gap-3">
                      {/* Top row: Icon + Type */}
                      <div className="flex items-center justify-between">
                        <div className={`size-10 rounded-2xl ${palette.iconBg} flex items-center justify-center shadow-sm transition-transform duration-500 group-hover:scale-110`}>
                          <Notebook className="size-5" />
                        </div>
                      <div className="flex items-center gap-1.5 text-on-surface-variant/80">
                          <Zap className="size-4" />
                          <span className="text-xs font-medium">{exam.type || "Govt"}</span>
                        </div>
                      </div>

                      {/* Exam title */}
                      <div>
                        <h4 className="text-lg font-semibold leading-snug tracking-tight text-on-surface">
                          {exam.name}
                        </h4>
                        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-on-surface-variant/80">
                          {exam.full_name}
                        </p>
                      </div>

                      {/* Progress */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-on-surface-variant">Progress</span>
                          <span className="text-xs font-semibold text-on-surface-variant">0%</span>
                        </div>
                        <div className="h-1.5 bg-on-surface/8 rounded-full overflow-hidden">
                          <div className={`h-full ${palette.bar} rounded-full`} style={{ width: "0%" }} />
                        </div>
                      </div>

                      {/* CTA Button */}
                      <div className="mt-1 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white transition-colors group-hover:bg-primary/90">
                        <span>Start mock test</span>
                        <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="w-full py-8 px-5 text-center bg-surface-container-high/30 rounded-2xl border border-dashed border-on-surface/10">
              <div className="size-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Notebook className="size-6 text-primary opacity-60" />
              </div>
              <h4 className="text-sm font-black text-on-surface mb-1.5">No exams yet</h4>
              <p className="mb-4 text-sm font-medium text-on-surface-variant/70">Add exams to start preparing.</p>
              <button
                onClick={onViewAll}
                className="min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-white transition-all hover:bg-primary/90"
              >
                Add Exams
              </button>
            </div>
          )}
      </div>
    </section>
  );
};
