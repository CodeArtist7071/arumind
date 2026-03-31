import { Clock, Sparkles, ChevronRight, Edit3, Trash } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { format12h } from "../../utils/format12h";
import type { Habit } from "../studyPlanner/TrackerGrid";

export const UpcomingMockTest = ({ 
  habits, 
  progress,
  onDelete, 
  onNavigate,
  onEdit
}: { 
  habits: Habit[], 
  progress: Record<string, boolean[]>,
  onDelete: (id: string, isMastery: boolean) => Promise<void>,
  onNavigate: (examId: string, chapterId?: string) => void,
  onEdit: (habit: Habit, day: number) => void
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
        const day = scheduledDayIdx === -1 ? 0 : (scheduledDayIdx + 1);
        const monthName = new Date().toLocaleString('default', { month: 'short' });
        
        // Final Time-Lock Manifestation
        const scheduledDate = new Date(currentYear, currentMonthIdx, day);
        if (h.start_time) {
          const [hh, mm] = h.start_time.split(":").map(Number);
          scheduledDate.setHours(hh, mm, 0, 0);
        }
        const isDue = currentTime >= scheduledDate;

        // Countdown Logic Manifestation
        let timeLeftStr = "";
        if (!isDue && day > 0) {
            const diff = scheduledDate.getTime() - currentTime.getTime();
            const hrs = Math.floor(diff / 3600000);
            const mins = Math.floor((diff % 3600000) / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            
            if (hrs > 24) {
               timeLeftStr = `Starts in ${Math.round(hrs / 24)}d`;
            } else {
               timeLeftStr = `${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
            }
        }

        return {
          id: h.id,
          month: monthName,
          displayDate: day === 0 ? "-" : day.toString(),
          scheduledDay: day,
          title: h.name,
          displayTime: h.start_time ? format12h(h.start_time) : "TBD",
          startTimeRaw: h.start_time,
          examId: h.exam_id,
          chapterId: h.chapter_id,
          priority: h.priority,
          isDue,
          timeLeftStr,
          rawHabit: h
        };
      })
      .sort((a, b) => Number(a.displayDate) - Number(b.displayDate));
  }, [habits, progress, currentTime]);

  return (
    <section>
      <div className="flex justify-between items-center mb-8 px-2">
        <h3 className="text-[11px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-60">Scheduled Tests</h3>
        <div className="flex items-center gap-2">
           <span className="text-[8px] font-black uppercase tracking-widest text-[#16a34a] opacity-60">Live Manifestations</span>
           <Clock className="size-3.5 text-primary animate-pulse" />
        </div>
      </div>
      <div className="bg-primary/95 backdrop-blur-md rounded-4xl overflow-hidden shadow-ambient p-3 ring-1 ring-white/10">
        <div className="space-y-2 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
          {masteryTests.length === 0 ? (
            <div className="px-6 py-12 text-center text-white/40">
              <p className="text-[10px] font-technical font-black uppercase tracking-widest font-narrative mb-2">Botanical Garden Quiet</p>
              <p className="text-xs italic opacity-60">No mastery chapter tests scheduled for this cycle.</p>
            </div>
          ) : masteryTests.map((mock) => (
            <div
              key={mock.id}
              className="px-3 py-2 flex items-center gap-6 hover:bg-white transition-all duration-500 group rounded-3xl relative"
            >
              <div className="flex flex-col items-center justify-center min-w-20 bg-surface-container-high py-3 rounded-3xl group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm border border-black/5">
                <span className="text-[10px] font-technical font-black uppercase tracking-[0.2em] mb-1 opacity-50 group-hover:text-white/80 group-hover:opacity-100">
                  {mock.month}
                </span>
                <span className="text-3xl font-technical font-black group-hover:text-white tracking-tighter">
                  {mock.displayDate}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xl font-black text-white group-hover:text-primary transition-colors truncate tracking-tighter leading-tight mb-1">
                  {mock.title}
                </h4>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-technical uppercase tracking-[0.2em] text-white group-hover:text-on-surface-variant font-black opacity-60">
                    {mock.displayTime}
                  </p>
                  {mock.isDue ? (
                     <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-[#4ade80] animate-pulse">
                        <Sparkles size={8} /> Live Now
                     </span>
                  ) : (
                     <div className="flex items-center gap-1 text-[8px] font-mono tabular-nums uppercase tracking-widest text-white/40 group-hover:text-primary/40">
                        <Clock size={8} /> {mock.timeLeftStr}
                     </div>
                  )}
                </div>
              </div>
              
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 p-1.5 rounded-2xl shadow-sm">
                <button 
                  onClick={() => mock.examId && onNavigate(mock.examId, mock.chapterId)}
                  disabled={!mock.isDue}
                  className={`p-1.5 rounded-xl transition-all ${
                    mock.isDue 
                    ? "text-[#16a34a] hover:bg-green-50 shadow-sm" 
                    : "text-slate-300 cursor-not-allowed grayscale"
                  }`}
                  title={mock.isDue ? "Give test now" : `This manifestation will open in ${mock.timeLeftStr}.`}
                >
                  <ChevronRight size={14} className={mock.isDue ? "animate-bounce-x" : ""} />
                </button>
                <button 
                  onClick={() => onEdit(mock.rawHabit, mock.scheduledDay)}
                  className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
                  title="Update the date and time"
                >
                  <Edit3 size={14} />
                </button>
                <button 
                  onClick={() => onDelete(mock.id, true)}
                  className="p-1.5 hover:bg-red-50 rounded-xl text-red-400 transition-colors"
                  title="Vaporize from Schedule"
                >
                  <Trash size={14} />
                </button>
              </div>

              {/* Status Hint Manifestation */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none translate-y-2 group-hover:translate-y-0 z-10 w-max">
                 <div className="bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg">
                    {mock.isDue ? "Window is synchronized" : `Manifestation pending: ${mock.timeLeftStr}`}
                 </div>
              </div>
            </div>
          ))}
        </div>
        <button 
          onClick={() => navigate("../study-planner")}
          className="w-full py-8 text-[10px] font-technical font-black uppercase tracking-[0.4em] text-white hover:text-white/70 transition-all duration-500 opacity-60 hover:opacity-100"
        >
          Manifest All Activity →
        </button>
      </div>
    </section>
  );
};