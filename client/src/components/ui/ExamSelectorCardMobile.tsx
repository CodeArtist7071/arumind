import { ChevronRight, Notebook, Plus, Zap } from "lucide-react";
import type { examProps } from "../../slice/examSlice";
import { useRef, useState, useEffect, useCallback } from "react";

interface ExamSelectorCardProps {
  targetRef?: React.RefObject<HTMLElement> | null;
  targetedExams: examProps[];
  onSelect: (exam: examProps) => void;
  onViewAll: () => void;
  loading?: boolean;
}

const ExamSkeleton = () => (
  <div className="shrink-0 w-[260px] snap-start">
    <div className="px-5 py-5 bg-surface-container-high/30 rounded-3xl animate-pulse border border-on-surface/5 h-[180px] flex flex-col gap-4">
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 17);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);

      // Update active dot
      const cardWidth = 268; // approx w-[260px] + gap
      const newIndex = Math.round(scrollLeft / cardWidth);
      setActiveIndex(newIndex);
    }
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll, { passive: true });
      window.addEventListener("resize", checkScroll);
      return () => {
        el.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
  }, [checkScroll, targetedExams]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.75;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="block md:hidden scroll-mt-15">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 px-1">
        <div className="space-y-0.5">
          <p className="text-[10px] font-technical font-black uppercase tracking-[0.25em] text-on-surface-variant opacity-50">
            Your Exams
          </p>
          <h3 className="text-lg font-black text-on-surface tracking-tight">
            Take Mock Tests
          </h3>
        </div>
        <button
          onClick={onViewAll}
          className="flex items-center gap-1.5 text-[10px] cursor-pointer font-technical bg-primary text-white px-3 py-2 rounded-full font-black uppercase tracking-widest hover:bg-primary/90 transition-all duration-300"
        >
          <Plus size={12} />
          Add
        </button>
      </div>

      {/* Scroll Container */}
      <div className="relative">
        {/* Left Arrow */}
        <button
          onClick={() => scroll("left")}
          className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center backdrop-blur-sm transition-opacity duration-300 ${
            canScrollLeft ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          aria-hidden={!canScrollLeft}
        >
          <ChevronRight className="size-4 text-primary rotate-180" />
        </button>

        {/* Right Arrow */}
        <button
          onClick={() => scroll("right")}
          className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center backdrop-blur-sm transition-opacity duration-300 ${
            canScrollRight ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          aria-hidden={!canScrollRight}
        >
          <ChevronRight className="size-4 text-primary" />
        </button>

        {/* Scrollable Track */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto px-1 pb-4 snap-x snap-mandatory scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <ExamSkeleton key={i} />)
          ) : targetedExams.length > 0 ? (
            targetedExams.map((exam, index) => {
              const palette = examColorPalette[index % examColorPalette.length];
              return (
                <div
                  key={exam.id}
                  className="shrink-0 w-[260px] snap-start"
                  onClick={() => onSelect(exam)}
                >
                  <div className="relative overflow-hidden rounded-3xl border border-on-surface/5 bg-surface-container-high/70 shadow-ambient cursor-pointer group transition-all duration-500 hover:shadow-ambient-lg hover:-translate-y-0.5 p-5">
                    {/* Background gradient blob */}
                    <div className={`absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br ${palette.gradient} -translate-y-8 translate-x-8`} />

                    <div className="relative z-10 flex flex-col gap-3">
                      {/* Top row: Icon + Type */}
                      <div className="flex items-center justify-between">
                        <div className={`size-10 rounded-2xl ${palette.iconBg} flex items-center justify-center shadow-sm transition-transform duration-500 group-hover:scale-110`}>
                          <Notebook className="size-5" />
                        </div>
                        <div className="flex items-center gap-1 opacity-50">
                          <Zap className="size-3 text-on-surface-variant" />
                          <span className="text-[9px] font-technical font-black uppercase tracking-wider text-on-surface-variant">{exam.type || "Govt"}</span>
                        </div>
                      </div>

                      {/* Exam title */}
                      <div>
                        <h4 className="font-black text-base text-on-surface tracking-tight leading-tight">
                          {exam.name}
                        </h4>
                        <p className="text-[11px] text-on-surface-variant font-medium opacity-55 line-clamp-1 mt-0.5">
                          {exam.full_name}
                        </p>
                      </div>

                      {/* Progress */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-technical font-black uppercase tracking-wider text-on-surface-variant opacity-40">Progress</span>
                          <span className="text-[9px] font-technical font-black text-on-surface-variant opacity-40">0%</span>
                        </div>
                        <div className="h-1.5 bg-on-surface/8 rounded-full overflow-hidden">
                          <div className={`h-full ${palette.bar} rounded-full`} style={{ width: "0%" }} />
                        </div>
                      </div>

                      {/* CTA Button */}
                      <div className="flex items-center justify-center w-full bg-primary group-hover:bg-primary/90 rounded-2xl text-white h-10 gap-1.5 transition-all duration-300 mt-1">
                        <span className="text-[10px] font-technical font-black uppercase tracking-widest">Start Mock Test</span>
                        <ChevronRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="shrink-0 w-[260px] snap-start py-10 px-5 text-center bg-surface-container-high/30 rounded-3xl border-2 border-dashed border-on-surface/8">
              <div className="size-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Notebook className="size-6 text-primary opacity-60" />
              </div>
              <h4 className="text-sm font-black text-on-surface mb-1.5">No exams yet</h4>
              <p className="text-xs text-on-surface-variant opacity-50 font-medium mb-4">Add exams to start preparing</p>
              <button
                onClick={onViewAll}
                className="text-[10px] font-technical bg-primary text-white px-4 py-2 rounded-full font-black uppercase tracking-widest hover:bg-primary/90 transition-all"
              >
                Add Exams
              </button>
            </div>
          )}
        </div>

        {/* Scroll Indicator Dots */}
        {targetedExams.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-1">
            {targetedExams.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === activeIndex ? "w-4 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-on-surface/20"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
