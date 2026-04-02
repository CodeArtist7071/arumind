import React, { useMemo, useRef, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Target,
  Zap,
  Award,
  Calendar,
  MoreVertical,
  CheckCircle2
} from "lucide-react";
import type { Habit } from "../../pages/userPanel/StudyPlanner";

interface MobileStudyPlannerProps {
  habits: Habit[];
  progress: Record<string, boolean[]>;
  onToggle: (id: string, index: number) => void;
  viewMonth: number;
  viewYear: number;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onMonthChange: (direction: "prev" | "next") => void;
  stats: {
    totalCompleted: number;
    currentStreak: number;
    xp: number;
    level: number;
    xpInLevel: number;
  };
  onAddHabit: (mode: "routine" | "test") => void;
  onSync: (habit: Habit) => void;
  onSyncAll: () => void;
  isSettingUp: boolean;
  hasPrevMonthTasks: boolean;
  onCopyPrevious: () => void;
  onStartFresh: () => void;
  masteryOnly: (Habit & { scheduledDay: number })[];
}

export const MobileStudyPlanner: React.FC<MobileStudyPlannerProps> = ({
  habits,
  progress,
  onToggle,
  viewMonth,
  viewYear,
  selectedDate,
  onSelectDate,
  onMonthChange,
  stats,
  onAddHabit,
  onSync,
  onSyncAll,
  isSettingUp,
  hasPrevMonthTasks,
  onCopyPrevious,
  onStartFresh,
  masteryOnly
}) => {
  const [isMilestoneOpen, setIsMilestoneOpen] = React.useState(false);
  const [isAddExpanded, setIsAddExpanded] = React.useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = new Date();
  const isCurrentMonth = today.getMonth() + 1 === viewMonth && today.getFullYear() === viewYear;

  const monthName = useMemo(() => {
    return new Date(viewYear, viewMonth - 1).toLocaleString('default', { month: 'long' });
  }, [viewMonth, viewYear]);

  // Generate days for the Month Ribbon
  const daysInMonth = useMemo(() => {
    const date = new Date(viewYear, viewMonth, 0);
    return date.getDate();
  }, [viewMonth, viewYear]);

  const days = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(viewYear, viewMonth - 1, i + 1);
      return {
        dayNum: i + 1,
        dayName: date.toLocaleString('default', { weekday: 'short' }),
        date: date
      };
    });
  }, [daysInMonth, viewMonth, viewYear]);

  // Auto-scroll to selected date on mount or change
  useEffect(() => {
    if (scrollRef.current) {
      const selectedEl = scrollRef.current.querySelector('[data-selected="true"]');
      if (selectedEl) {
        selectedEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [selectedDate]);

  const dailyTasks = useMemo(() => {
    const dayIndex = selectedDate.getDate() - 1;
    return habits.map(h => ({
      ...h,
      isCompleted: progress[h.id]?.[dayIndex] || false
    }));
  }, [habits, progress, selectedDate]);

  return (
    <>
      <div className="relative p-2 animate-reveal bg-surface">

        {/* 0. Setup Ritual: Botanical Overlay */}
        {isSettingUp && (
          <div className="absolute inset-x-2 bottom-0 z-40 p-1 animate-in fade-in zoom-in-95 duration-1000 ease-botanical">
            <div className="bg-surface-container-high/95 backdrop-blur-xl rounded-[3rem] p-8 shadow-ambient-lg border border-primary/10 text-center space-y-6">
              <div className="size-16 bg-primary/10 rounded-4xl flex items-center justify-center mx-auto text-primary">
                <Calendar className="size-8" />
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tighter text-on-surface">Initialize Cycle</h3>
                <p className="text-[10px] font-technical font-black uppercase tracking-widest text-on-surface-variant opacity-60 mt-2">New manifestation for {monthName}</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {hasPrevMonthTasks && (
                  <button
                    onClick={onCopyPrevious}
                    className="w-full py-4 bg-primary text-white rounded-full font-technical font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20 active:scale-95 transition-all"
                  >
                    Synchronize Prev Month
                  </button>
                )}
                <button
                  onClick={onStartFresh}
                  className="w-full py-4 bg-surface-container-low text-on-surface rounded-full font-technical font-black text-[11px] uppercase tracking-[0.2em] active:scale-95 transition-all"
                >
                  Manifest Fresh Start
                </button>
              </div>
            </div>
          </div>
        )}
      <div className="sticky top-0 z-30 bg-surface/80 backdrop-blur-xl pb-2 animate-reveal">
        {/* 1. Month Ritual: Botanical Header */}
        <header className="flex items-center justify-between p-4 whitespace-nowrap overflow-x-auto custom-scrollbar-hide">
          <div className="flex flex-col">
            <h2 className="text-2xl font-black text-on-surface tracking-tighter leading-none">
              {monthName} <span className="text-primary/40 font-technical text-lg">{viewYear}</span>
            </h2>
            <p className="text-[10px] font-technical font-black uppercase tracking-[0.3em] text-on-surface-variant opacity-40 mt-1">
              Persisting Rituals
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onMonthChange("prev")}
              className="size-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant active:bg-primary active:text-white transition-all shadow-sm"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => onMonthChange("next")}
              className="size-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant active:bg-primary active:text-white transition-all shadow-sm"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </header>

        {/* 2. Date Ribbon: Horizontal Scroller */}
        <section
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto custom-scrollbar-hide px-4 py-2"
        >
          {days.map((d) => {
            const isSelected = selectedDate.getDate() === d.dayNum;
            const isToday = isCurrentMonth && today.getDate() === d.dayNum;

            return (
              <button
                key={d.dayNum}
                data-selected={isSelected}
                onClick={() => onSelectDate(d.date)}
                className={`min-w-[50px] min-h-[50px] flex flex-col items-center gap-2 p-4 rounded-4xl transition-all duration-500 ease-botanical relative group touch-manipulation cursor-pointer ${isSelected
                    ? "bg-primary text-white shadow-ambient-lg scale-110 z-10"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high active:scale-95"
                  }`}
              >
                {/* Visual Manifestation: Liquid Background */}
                {isSelected && (
                  <div className="absolute inset-0 bg-primary rounded-4xl -z-10 animate-in fade-in zoom-in-95 duration-500 ease-botanical" />
                )}
                <span className={`text-[10px] font-technical font-black uppercase tracking-widest ${isSelected ? "text-white/60" : "opacity-40"}`}>
                  {d.dayName}
                </span>
                <span className="text-2xl font-technical font-black tracking-tighter">
                  {d.dayNum}
                </span>
                {isToday && !isSelected && (
                  <div className="absolute -top-1 size-3 bg-primary rounded-full ring-2 ring-surface animate-pulse" />
                )}
                {isSelected && (
                  <div className="absolute -bottom-1 size-2 bg-white rounded-full" />
                )}
              </button>
            );
          })}
        </section>
      </div>

        {/* 3. Growth Summary Pod */}
        {/* <section className="bg-surface-container-low rounded-[3rem] p-6 shadow-ambient mx-2">
        <div className="flex items-center justify-between mb-6">
           <div className="flex items-center gap-3">
              <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                 <Zap className="size-5" />
              </div>
              <div>
                 <p className="text-[10px] font-technical font-black uppercase tracking-widest text-on-surface-variant opacity-40">Core Level</p>
                 <p className="text-xl font-technical font-black text-on-surface tracking-tighter">Growth Stage {stats.level}</p>
              </div>
           </div>
           <div className="text-right">
              <p className="text-[10px] font-technical font-black uppercase tracking-widest text-tertiary">Active Streak</p>
              <div className="flex items-center justify-end gap-1">
                 <span className="text-2xl font-technical font-black text-on-surface">{stats.currentStreak}</span>
                 <span className="text-xl">🔥</span>
              </div>
           </div>
        </div>
        
        <div className="space-y-2">
           <div className="flex justify-between items-end px-1">
              <span className="text-[8px] font-technical font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-40">XP Manifestation</span>
              <span className="text-[10px] font-technical font-black text-primary uppercase tracking-widest">{stats.xpInLevel} / 500</span>
           </div>
           <div className="h-2.5 w-full bg-surface-container-highest rounded-full overflow-hidden p-0.5 shadow-inner">
              <div 
                className="h-full bg-linear-to-r from-primary to-primary-container rounded-full transition-all duration-1000" 
                style={{ width: `${(stats.xpInLevel / 500) * 100}%` }}
              />
           </div>
        </div>
      </section> */}



        {/* 5. Mobile Dynamic FAB Cluster: Speed Dial Ritual */}

        {/* 6. Mobile Milestone Overlay: mastery tests */}
        <div className={`fixed inset-0 z-60 transition-all duration-700 ease-botanical ${isMilestoneOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
          <div className="absolute inset-0 bg-on-surface/5 backdrop-blur-sm transition-opacity duration-700" onClick={() => setIsMilestoneOpen(false)} />
          <div className={`absolute bottom-0 left-0 right-0 max-h-[85vh] bg-surface-container-high/95 backdrop-blur-3xl shadow-ambient-lg rounded-t-[3.5rem] border-t border-on-surface/5 px-6 py-10 transform transition-all duration-700 ease-botanical overflow-y-auto ${isMilestoneOpen ? "translate-y-0" : "translate-y-full opacity-0"}`}>
            <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-2xl font-black tracking-tighter text-on-surface leading-none">Monthly Milestones</h3>
                <p className="text-[10px] font-technical font-black uppercase tracking-widest text-primary mt-2">Active Cycle: {monthName}</p>
              </div>
              <button onClick={() => setIsMilestoneOpen(false)} className="size-10 rounded-full bg-on-surface/5 flex items-center justify-center"><ChevronLeft className="size-5 rotate-270" /></button>
            </div>

            <div className="space-y-4 pb-10">
              {masteryOnly.length === 0 ? (
                <p className="text-[10px] font-technical font-black text-on-surface-variant opacity-40 text-center py-10 uppercase tracking-widest animate-in fade-in duration-700">Zero milestones manifested</p>
              ) : (
                masteryOnly.map((test, index) => (
                  <button
                    key={test.id}
                    onClick={() => {
                      onSelectDate(new Date(viewYear, viewMonth - 1, test.scheduledDay));
                      setIsMilestoneOpen(false);
                    }}
                    className={`w-full text-left p-5 rounded-4xl border border-outline-variant/10 transition-all duration-500 ease-botanical animate-in fade-in slide-in-from-right-4 fill-mode-forwards ${selectedDate.getDate() === test.scheduledDay ? "bg-primary text-white shadow-lg scale-[1.02]" : "bg-white hover:bg-surface-container-low active:scale-95"
                      }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`text-2xl font-technical font-black transition-opacity duration-500 ${selectedDate.getDate() === test.scheduledDay ? "opacity-100" : "opacity-40"}`}>{test.scheduledDay}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black tracking-tight truncate">{test.name}</p>
                        <p className={`text-[9px] font-technical font-black uppercase tracking-widest opacity-60 transition-colors ${selectedDate.getDate() === test.scheduledDay ? "text-white" : "text-primary"}`}>Day {test.scheduledDay} • {test.start_time || "Flexible"}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
              <button
                onClick={() => { setIsMilestoneOpen(false); onAddHabit("test"); }}
                className="w-full py-4 mt-6 bg-tertiary text-on-tertiary rounded-full font-technical font-black text-[11px] uppercase tracking-widest shadow-lg shadow-tertiary/20 active:scale-95 transition-all"
              >
                Add Milestone +
              </button>
            </div>
          </div>
        </div>
      {/* 4. Task Manifest Card Stack */}
      <section className="space-y-4 px-2 pb-20">
        <div className="flex items-center justify-between px-2 opacity-60">
          <h3 className="text-[10px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant">Daily Task Manifesto</h3>
          <div className="flex items-center gap-4">
            <button
              onClick={onSyncAll}
              className="text-[10px] font-technical font-black text-primary hover:underline uppercase tracking-widest active:scale-95 transition-all"
            >
              Sync All
            </button>
            <span className="text-[10px] font-technical font-black text-on-surface-variant/40">
              {dailyTasks.filter(t => t.isCompleted).length} / {dailyTasks.length} Done
            </span>
          </div>
        </div>

        {dailyTasks.length === 0 ? (
          <div className="py-20 text-center bg-surface-container-low rounded-4xl border border-dashed border-primary/20 p-8">
            <Award className="size-10 text-primary/40 mx-auto mb-4 opacity-40" />
            <p className="text-[10px] font-technical font-black uppercase tracking-widest text-on-surface-variant opacity-40">Zero manifests observed for this date</p>
            <button
              onClick={() => onAddHabit("routine")}
              className="mt-6 text-xs font-black text-primary uppercase tracking-widest hover:underline"
            >
              + Initialize Ritual
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {dailyTasks.map((task, index) => (
              <div
                key={task.id}
                onClick={() => onToggle(task.id, selectedDate.getDate() - 1)}
                className={`group p-4 rounded-4xl transition-all duration-500 ease-botanical border border-outline-variant/10 active:scale-95 shadow-sm flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 fill-mode-forwards ${task.isCompleted
                    ? "bg-primary/5 border-primary/20 scale-[0.98] opacity-80"
                    : "bg-surface-container-lowest hover:scale-[1.01] hover:shadow-ambient"
                  }`}
                style={{ 
                  animationDelay: `${index * 80}ms`,
                  animationDuration: '600ms'
                }}
              >
                <div className="flex items-center gap-5">
                  <div className={`size-10 rounded-2xl flex items-center justify-center transition-all duration-500 ease-botanical ${task.isCompleted ? "bg-primary text-white scale-110 shadow-lg shadow-primary/20" : "bg-surface-container-high text-on-surface-variant/40"
                    }`}>
                    {task.isCompleted ? <CheckCircle2 size={24} className="animate-in zoom-in-50 duration-300" /> : <Target size={24} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-black tracking-tight leading-none mb-1.5 transition-all duration-500 ${task.isCompleted ? "text-primary/60 line-through grayscale italic" : "text-on-surface"
                      }`}>
                      {task.name}
                    </h4>
                    <div className="flex items-center gap-3">
                      <span className={`text-[8px] font-technical font-black uppercase tracking-widest px-2 py-0.5 rounded-full transition-colors duration-500 ${task.priority === 'HIGH' ? 'bg-red-500/10 text-red-600' : 'bg-surface-container-highest text-on-surface-variant/60'
                        }`}>
                        {task.priority}
                      </span>
                      <span className="text-[8px] font-technical font-black uppercase tracking-widest text-on-surface-variant opacity-40">
                        {task.start_time || "Flexible"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onSync(task); }}
                    className="size-10 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant/60 hover:text-primary active:scale-90 transition-all duration-300"
                  >
                    <Calendar size={16} />
                  </button>
                  <button className="text-on-surface-variant/20 hover:text-primary transition-colors duration-300">
                    <MoreVertical size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
    </>
  );
};
