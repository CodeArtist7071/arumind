import { X, Sparkles, CheckSquare, Clock, BookOpen, Brain, RotateCcw, ClipboardCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { format12h } from "../../utils/format12h";
import { useNavigate } from "react-router";
import { type Habit } from "../studyPlanner/types";

const categoryConfig: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  theory: {
    label: "Theory",
    icon: <BookOpen size={12} />,
    color: "text-blue-600",
    bg: "bg-blue-500/15 border-blue-500/20",
  },
  mcq: {
    label: "MCQ",
    icon: <Brain size={12} />,
    color: "text-violet-600",
    bg: "bg-violet-500/15 border-violet-500/20",
  },
  revision: {
    label: "Revision",
    icon: <RotateCcw size={12} />,
    color: "text-amber-600",
    bg: "bg-amber-500/15 border-amber-500/20",
  },
  mock: {
    label: "Mock Test",
    icon: <ClipboardCheck size={12} />,
    color: "text-emerald-600",
    bg: "bg-emerald-500/15 border-emerald-500/20",
  },
};

export const DashboardDailyRoutine = ({
  targetedExams,
  dailyRituals,
  progress,
  today,
  handleToggle,
  isOpen,
  onClose,
}: {
  targetedExams: any;
  dailyRituals: Habit[];
  progress: Record<string, boolean[]>;
  today: number;
  handleToggle: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [selectedExamInDrawer, setSelectedExamInDrawer] = useState<string | null>(null);
  const navigate = useNavigate();

  const filteredRitualsInDrawer = useMemo(() => {
    if (!selectedExamInDrawer) return dailyRituals;
    return dailyRituals.filter((h) => !h.exam_id || h.exam_id === selectedExamInDrawer);
  }, [dailyRituals, selectedExamInDrawer]);

  // Completion stats
  const doneCount = filteredRitualsInDrawer.filter((h) => progress[h.id]?.[today - 1]).length;
  const totalCount = filteredRitualsInDrawer.length;
  const completionPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const circumference = 2 * Math.PI * 20; // radius=20
  const strokeDash = (completionPercent / 100) * circumference;

  return (
    <div
      className={`fixed inset-0 z-60 transition-all duration-700 ease-botanical ${
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-on-surface/10 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className={`absolute top-0 right-0 h-full w-full max-w-[380px] bg-surface-container-high backdrop-blur-3xl shadow-ambient-lg border-l border-on-surface/5 flex flex-col transform transition-transform duration-700 ease-botanical ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="px-6 pt-8 pb-5 border-b border-on-surface/5">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-[10px] font-technical font-black uppercase tracking-[0.25em] text-on-surface-variant opacity-50 mb-0.5">
                {new Date().toLocaleDateString("default", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <h3 className="text-2xl font-black tracking-tighter text-on-surface leading-tight">
                Daily Routine
              </h3>
            </div>
            {/* Close */}
            <button
              onClick={onClose}
              className="size-9 rounded-xl bg-on-surface/5 hover:bg-on-surface/10 flex items-center justify-center transition-colors mt-1"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Progress Ring + Stats */}
          <div className="flex items-center gap-5 p-4 bg-surface-container-highest/40 rounded-2xl">
            {/* SVG Ring */}
            <div className="relative size-14 flex-shrink-0">
              <svg className="size-full -rotate-90" viewBox="0 0 48 48">
                <circle
                  cx="24" cy="24" r="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-on-surface/8"
                />
                <circle
                  cx="24" cy="24" r="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${strokeDash} ${circumference}`}
                  className="text-primary transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-technical font-black text-on-surface">{completionPercent}%</span>
              </div>
            </div>
            <div>
              <p className="text-xl font-black text-on-surface tracking-tight">
                {doneCount} / {totalCount}
                <span className="text-sm font-medium text-on-surface-variant opacity-50 ml-1">done</span>
              </p>
              <p className="text-xs text-on-surface-variant opacity-50 font-medium mt-0.5">
                {totalCount - doneCount === 0
                  ? "All tasks complete! 🎉"
                  : `${totalCount - doneCount} tasks remaining today`}
              </p>
            </div>
          </div>
        </div>

        {/* Exam Filter Tabs */}
        {targetedExams.length > 1 && (
          <div className="px-6 pt-4 pb-2">
            <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              <button
                onClick={() => setSelectedExamInDrawer(null)}
                className={`shrink-0 px-3 py-1.5 rounded-full font-technical font-black text-[9px] uppercase tracking-widest transition-all ${
                  !selectedExamInDrawer
                    ? "bg-primary text-white shadow-sm shadow-primary/20"
                    : "bg-on-surface/5 text-on-surface-variant hover:bg-on-surface/10"
                }`}
              >
                All
              </button>
              {targetedExams.map((ex: any) => (
                <button
                  key={ex.id}
                  onClick={() => setSelectedExamInDrawer(ex.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full font-technical font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${
                    selectedExamInDrawer === ex.id
                      ? "bg-primary text-white shadow-sm shadow-primary/20"
                      : "bg-on-surface/5 text-on-surface-variant hover:bg-on-surface/10"
                  }`}
                >
                  {ex.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Habit List */}
        <div className="flex-1 overflow-y-auto px-5 py-3" style={{ scrollbarWidth: "none" }}>
          {filteredRitualsInDrawer.length === 0 ? (
            <div className="py-12 text-center">
              <div className="size-14 bg-primary/8 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="size-7 text-primary opacity-40" />
              </div>
              <p className="text-sm font-black text-on-surface mb-1">No tasks for today</p>
              <p className="text-xs text-on-surface-variant opacity-50 font-medium">Add tasks in the Study Planner.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredRitualsInDrawer.map((habit) => {
                const isDone = progress[habit.id]?.[today - 1];
                const catConfig = categoryConfig[habit.category || "theory"];
                return (
                  <label
                    key={habit.id}
                    className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl cursor-pointer transition-all duration-400 ${
                      isDone
                        ? "bg-on-surface/3 opacity-60"
                        : "bg-surface-container-highest/60 hover:bg-surface-container-highest shadow-sm"
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="relative size-5 shrink-0">
                      <input
                        className="peer hidden"
                        type="checkbox"
                        checked={isDone || false}
                        onChange={() => handleToggle(habit.id)}
                      />
                      <div className={`size-full rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${
                        isDone
                          ? "bg-primary border-primary"
                          : "border-on-surface/20 bg-transparent hover:border-primary/40"
                      }`}>
                        {isDone && <CheckSquare className="size-3.5 text-white" strokeWidth={3} />}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-black tracking-tight block truncate transition-all duration-300 ${
                        isDone ? "line-through text-on-surface-variant opacity-40" : "text-on-surface"
                      }`}>
                        {habit.name}
                      </span>
                      {habit.start_time && (
                        <span className="flex items-center gap-1 text-[9px] font-technical font-black text-on-surface-variant opacity-50 mt-0.5">
                          <Clock size={8} />
                          {format12h(habit.start_time)}
                          {habit.end_time && ` – ${format12h(habit.end_time)}`}
                        </span>
                      )}
                    </div>

                    {/* Category badge */}
                    {catConfig && (
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest flex-shrink-0 ${catConfig.bg} ${catConfig.color}`}>
                        {catConfig.icon}
                        <span className="hidden sm:inline">{catConfig.label}</span>
                      </div>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="px-5 py-5 border-t border-on-surface/5">
          <button
            onClick={() => {
              onClose();
              navigate(`../plan-study/${selectedExamInDrawer || dailyRituals[0]?.exam_id}`);
            }}
            className="w-full py-4 bg-primary text-on-primary rounded-2xl font-technical font-black text-[11px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all duration-300"
          >
            Open Master Planner
          </button>
        </div>
      </div>
    </div>
  );
};