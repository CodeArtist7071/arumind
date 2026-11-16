import { Clock, Sparkles, ChevronRight, Edit3, Trash, AlertCircle, Flame } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { format12h } from "../../utils/format12h";
import type { Habit } from "../studyPlanner/types";

const priorityConfig = {
  HIGH: { label: "High", color: "bg-red-500/15 text-red-600 border-red-500/20", dot: "bg-red-500" },
  MEDIUM: { label: "Medium", color: "bg-amber-500/15 text-amber-600 border-amber-500/20", dot: "bg-amber-500" },
  LOW: { label: "Low", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20", dot: "bg-emerald-500" },
};

const CountdownRing = ({ timeLeftStr, isDue }: { timeLeftStr: string; isDue: boolean }) => {
  if (isDue) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/15 rounded-full border border-emerald-500/20">
        <div className="size-1.5 bg-emerald-500 rounded-full animate-pulse" />
        <span className="text-[9px] font-technical font-black uppercase tracking-widest text-emerald-600">Live Now</span>
      </div>
    );
  }
  if (!timeLeftStr) return null;
  return (
    <div className="flex items-center gap-1 text-[9px] font-mono tabular-nums text-on-surface-variant opacity-50">
      <Clock size={9} />
      <span>{timeLeftStr}</span>
    </div>
  );
};

export const UpcomingMockTest = ({
  habits,
  progress,
  onDelete,
  onNavigate,
  onEdit,
}: {
  habits: Habit[];
  progress: Record<string, boolean[]>;
  onDelete: (id: string, isMastery: boolean) => Promise<void>;
  onNavigate: (examId: string, chapterId?: string) => void;
  onEdit: (habit: Habit, day: number) => void;
}) => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentMonthIdx = currentTime.getMonth();
  const currentYear = currentTime.getFullYear();

  const masteryTests = React.useMemo(() => {
    return habits
      .filter((h) => h.is_mastery)
      .map((h) => {
        const prog = progress[h.id] || [];
        const scheduledDayIdx = prog.indexOf(true);
        const day = scheduledDayIdx === -1 ? 0 : scheduledDayIdx + 1;
        const monthName = new Date().toLocaleString("default", { month: "short" });

        const scheduledDate = new Date(currentYear, currentMonthIdx, day);
        if (h.start_time) {
          const [hh, mm] = h.start_time.split(":").map(Number);
          scheduledDate.setHours(hh, mm, 0, 0);
        }
        const isDue = currentTime >= scheduledDate;

        let timeLeftStr = "";
        if (!isDue && day > 0) {
          const diff = scheduledDate.getTime() - currentTime.getTime();
          const hrs = Math.floor(diff / 3600000);
          const mins = Math.floor((diff % 3600000) / 60000);
          const secs = Math.floor((diff % 60000) / 1000);
          if (hrs > 24) {
            timeLeftStr = `${Math.round(hrs / 24)}d left`;
          } else {
            timeLeftStr = `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
          }
        }

        return {
          id: h.id,
          month: monthName,
          displayDate: day === 0 ? "–" : day.toString(),
          scheduledDay: day,
          title: h.name,
          displayTime: h.start_time ? format12h(h.start_time) : "TBD",
          startTimeRaw: h.start_time,
          examId: h.exam_id,
          chapterId: h.chapter_id,
          priority: h.priority as keyof typeof priorityConfig,
          isDue,
          timeLeftStr,
          rawHabit: h,
        };
      })
      .sort((a, b) => Number(a.displayDate) - Number(b.displayDate));
  }, [habits, progress, currentTime]);

  return (
    <section>
      {/* Header */}
      <div className="flex justify-between items-center mb-5 px-1">
        <div className="space-y-0.5">
          <p className="text-[10px] font-technical font-black uppercase tracking-[0.25em] text-on-surface-variant opacity-50">
            Scheduled
          </p>
          <h3 className="text-lg font-black text-on-surface tracking-tight">
            Upcoming Tests
          </h3>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/15">
          <Clock className="size-3 text-primary" />
          <span className="text-[9px] font-technical font-black uppercase tracking-wider text-primary">{masteryTests.length} Scheduled</span>
        </div>
      </div>

      <div className="rounded-3xl overflow-hidden border border-on-surface/5 bg-surface-container-high/60 shadow-ambient">
        {/* Test cards */}
        <div className="divide-y divide-on-surface/5 max-h-[420px] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {masteryTests.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="size-14 bg-primary/8 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="size-7 text-primary opacity-50" />
              </div>
              <p className="text-sm font-black text-on-surface mb-1">Schedule is Clear</p>
              <p className="text-xs text-on-surface-variant opacity-50 font-medium">No tests scheduled for now.</p>
            </div>
          ) : (
            masteryTests.map((mock) => {
              const pConfig = priorityConfig[mock.priority] || priorityConfig.MEDIUM;
              return (
                <div
                  key={mock.id}
                  className={`relative px-4 py-4 group hover:bg-surface-container-highest/40 transition-all duration-300 ${mock.isDue ? "bg-emerald-500/5" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Date block */}
                    <div className={`flex flex-col items-center justify-center min-w-[52px] py-2.5 rounded-2xl flex-shrink-0 transition-all duration-500 border ${mock.isDue ? "bg-emerald-500/15 border-emerald-500/20" : "bg-surface-container-highest/60 border-on-surface/5 group-hover:bg-primary/10 group-hover:border-primary/15"}`}>
                      <span className={`text-[9px] font-technical font-black uppercase tracking-widest mb-0.5 ${mock.isDue ? "text-emerald-600" : "text-on-surface-variant opacity-50 group-hover:text-primary group-hover:opacity-100"}`}>
                        {mock.month}
                      </span>
                      <span className={`text-2xl font-technical font-black tracking-tighter leading-none ${mock.isDue ? "text-emerald-600" : "text-on-surface group-hover:text-primary"} transition-colors duration-300`}>
                        {mock.displayDate}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex items-start gap-2 mb-1.5">
                        <h4 className="font-black text-sm text-on-surface tracking-tight leading-tight flex-1 line-clamp-2">
                          {mock.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Priority badge */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${pConfig.color}`}>
                          <div className={`size-1.5 rounded-full ${pConfig.dot}`} />
                          {pConfig.label}
                        </span>
                        {/* Time */}
                        {mock.displayTime !== "TBD" && (
                          <span className="flex items-center gap-1 text-[9px] font-technical font-black text-on-surface-variant opacity-50">
                            <Clock size={9} />
                            {mock.displayTime}
                          </span>
                        )}
                        {/* Countdown / Live */}
                        <CountdownRing isDue={mock.isDue} timeLeftStr={mock.timeLeftStr} />
                      </div>
                    </div>
                  </div>

                  {/* Hover Actions */}
                  <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={() => mock.examId && onNavigate(mock.examId, mock.chapterId)}
                      disabled={!mock.isDue}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-technical font-black uppercase tracking-widest transition-all ${
                        mock.isDue
                          ? "bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/20"
                          : "bg-surface-container-highest text-on-surface-variant opacity-50 cursor-not-allowed"
                      }`}
                      title={mock.isDue ? "Start test" : `Opens in ${mock.timeLeftStr}`}
                    >
                      {mock.isDue ? (
                        <>
                          <Flame size={11} />
                          Start Now
                        </>
                      ) : (
                        <>
                          <AlertCircle size={11} />
                          Not Yet
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => onEdit(mock.rawHabit, mock.scheduledDay)}
                      className="size-8 rounded-xl bg-surface-container-highest hover:bg-on-surface/10 flex items-center justify-center text-on-surface-variant transition-colors"
                      title="Reschedule"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={() => onDelete(mock.id, true)}
                      className="size-8 rounded-xl bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-500 transition-colors"
                      title="Remove"
                    >
                      <Trash size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer CTA */}
        <div className="border-t border-on-surface/5 px-4 py-4">
          <button
            onClick={() => navigate("../study-planner")}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-surface-container-highest/60 hover:bg-primary/10 text-on-surface-variant hover:text-primary text-[10px] font-technical font-black uppercase tracking-widest transition-all duration-300 group"
          >
            Open Study Planner
            <ChevronRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
};