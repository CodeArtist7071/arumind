import React from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { GoogleCalendarButton } from "../ui/GoogleCalenderButton";

interface GridHeaderProps {
  monthName: string;
  viewYear: number;
  viewMonth: number;
  overallProgress: string;
  onMonthChange: (direction: "prev" | "next") => void;
  viewMode: 'monthly' | 'weekly';
  setViewMode: (mode: 'monthly' | 'weekly') => void;
  activeWeek: number;
  setActiveWeek: (week: number) => void;
  unlockPastDays: boolean;
  setUnlockPastDays: (unlock: boolean) => void;
}

export const GridHeader: React.FC<GridHeaderProps> = ({
  monthName,
  viewYear,
  viewMonth,
  overallProgress,
  onMonthChange,
  viewMode,
  setViewMode,
  activeWeek,
  setActiveWeek,
  unlockPastDays,
  setUnlockPastDays
}) => {
  return (
    <>
      {/* SPREADSHEET HEADER: Editorial Botanical */}
      <div className="bg-primary text-on-primary flex items-center justify-between px-8 py-6 shadow-ambient shrink-0 relative">
        <div className="absolute z-100 top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Calendar color="" size={120} />
        </div>
        <div className="w-1/3 flex flex-col relative z-10">
          <span className="text-[12px] font-technical font-black tracking-[0.4em] uppercase opacity-60 mb-1">Current Progress</span>
          <div className="text-4xl font-technical font-black tracking-tighter leading-none">{overallProgress}%</div>
        </div>

        <div className="w-1/3 flex justify-center items-center gap-6 relative z-10">
          <button
            onClick={() => {
              if (viewMode === 'monthly') {
                onMonthChange("prev");
              } else {
                if (activeWeek > 0) setActiveWeek(activeWeek - 1);
                else {
                  onMonthChange("prev");
                  setActiveWeek(4);
                }
              }
            }}
            className="p-2 hover:bg-white/10 rounded-full transition-all cursor-pointer active:scale-90"
          >
            <ChevronLeft size={32} />
          </button>
          <div className="flex flex-col items-center">
            <h1 className="text-4xl font-black tracking-tighter uppercase">{monthName}</h1>
            {viewMode === 'weekly' && (
              <span className="text-[10px] font-technical font-black uppercase tracking-[0.3em] text-secondary-container mt-1">Week {activeWeek + 1}</span>
            )}
          </div>
          <button
            onClick={() => {
              if (viewMode === 'monthly') {
                onMonthChange("next");
              } else {
                if (activeWeek < 4) setActiveWeek(activeWeek + 1);
                else {
                  onMonthChange("next");
                  setActiveWeek(0);
                }
              }
            }}
            className="p-2 hover:bg-white/10 rounded-full transition-all cursor-pointer active:scale-90"
          >
            <ChevronRight size={32} />
          </button>
        </div>

        <div className="w-1/3 flex justify-end items-center gap-4 relative z-10">
          <GoogleCalendarButton />
          <div className="flex flex-col items-end gap-2 px-6 border-l border-white/10 ml-4">
            <div className="text-2xl font-black tracking-tighter leading-none text-right flex flex-col items-end">
              <span className="text-[10px] font-technical uppercase tracking-[0.2em] opacity-40">Arumind Portal</span>
              <span className="font-narrative italic text-secondary-container">Planner</span>
            </div>
            <button
              onClick={() => setUnlockPastDays(!unlockPastDays)}
              className={`text-[9px] px-3 py-1.5 rounded-full border uppercase font-technical font-black transition-all ${unlockPastDays ? 'bg-tertiary/30 text-white border-tertiary shadow-lg' : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white'}`}
            >
              {unlockPastDays ? "🔓 Unlocked" : "🔒 Locked"}
            </button>
          </div>
        </div>
      </div>

      {/* MASTER PROGRESS BAR: Technical Trough */}
      <div className="w-full bg-primary-container/30 h-10 flex items-center px-6 gap-6 shrink-0 overflow-hidden border-y border-outline-variant/10 shadow-inner">
        <div className="w-[180px] shrink-0 text-[10px] font-technical font-black text-primary uppercase tracking-[0.2em]">Syllabus Score</div>
        <div className="flex-1 h-2.5 bg-on-surface/5 rounded-full overflow-hidden relative border border-outline-variant/5">
          <div
            className="h-full bg-linear-to-r from-primary to-primary-container transition-all duration-1000 ease-out shadow-sm relative"
            style={{ width: `${overallProgress}%` }}
          >
            <div className="absolute inset-0 bg-white/10 animate-pulse" />
          </div>
        </div>
        <div className="w-16 shrink-0 flex items-center justify-start">
          <span className="text-[10px] font-technical font-black text-primary tracking-widest">{overallProgress}%</span>
        </div>
      </div>
    </>
  );
};
