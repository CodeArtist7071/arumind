import React from "react";
import { GridDailyFlow } from "./GridDailyFlow";
import { WEEK_COLORS } from "../constants";

interface GridDayHeaderRowProps {
  days: number[];
  dailyPercents: number[];
  viewYear: number;
  viewMonth: number;
  onSelectDate?: (date: Date) => void;
  selectedDate?: Date;
  onShowAddTask?: () => void;
  onShowMastery?: () => void;
}

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const GridDayHeaderRow: React.FC<GridDayHeaderRowProps> = ({
  days,
  dailyPercents,
  viewYear,
  viewMonth,
  onSelectDate,
  selectedDate,
  onShowAddTask,
  onShowMastery,
}) => {
  return (
    <>
      {/* Daily Flow Percentages */}
      <tr className="bg-white h-20 text-on-surface">
        <th className="sticky left-0 z-30 bg-white border-b border-slate-200 p-0 border-r shadow-sm w-[440px]">
          <div className="flex h-full w-full">
            <div className="w-[220px] flex flex-col items-center justify-center border-r border-slate-100 px-2 text-center">
               <span className="text-[10px] font-technical font-black uppercase text-slate-400 tracking-widest leading-none">Daily Done %</span>
            </div>
            <div className="w-[90px] border-r border-slate-100 flex items-center justify-center p-2 text-center">
               <span className="text-[9px] font-technical font-black uppercase text-slate-400">Start Time</span>
            </div>
            <div className="w-[90px] border-r border-slate-100 flex items-center justify-center p-2 text-center">
               <span className="text-[9px] font-technical font-black uppercase text-slate-400">End Time</span>
            </div>
            <div className="w-[40px] flex items-center justify-center border-slate-100 px-2 text-center">
               {/* Spacer for Delete Action */}
            </div>
          </div>
        </th>
        {days.map((day, idx) => {
          const weekIdx = Math.floor(idx / 7);
          const color = WEEK_COLORS[weekIdx] || WEEK_COLORS[WEEK_COLORS.length - 1];
          return (
            <th key={idx} className="border-b border-slate-100 p-0 w-[36px]" style={{ backgroundColor: `${color}4d` }}>
              <GridDailyFlow percent={dailyPercents[idx] || 0} color={color} />
            </th>
          );
        })}
        <th colSpan={2} className="sticky right-0 z-30 bg-white border-b border-slate-200 border-l p-0 text-center shadow-left">
           <div className="flex flex-col items-center justify-center h-full">
              <span className="text-[10px] font-technical font-black uppercase text-slate-800 tracking-widest">Streaks</span>
           </div>
        </th>
      </tr>

      {/* Weekday Names & Date Numbers */}
      <tr className="bg-slate-50 min-h-[80px]">
        <th className="sticky left-0 z-30 bg-slate-100 border-b border-slate-300 p-0 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-left w-[440px]">
          <div className="flex h-full w-full">
            <div className="w-[220px] p-3 pl-6 border-r border-slate-200">
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800">Habits</span>
            </div>
            <div className="w-[90px] border-r border-slate-200 p-3 flex items-end justify-center">
               <span className="text-[9px] font-technical font-black uppercase text-slate-500 mb-0.5 whitespace-nowrap">Start</span>
            </div>
            <div className="w-[90px] p-3 flex items-end justify-center border-r border-slate-200">
               <span className="text-[9px] font-technical font-black uppercase text-slate-500 mb-0.5 whitespace-nowrap">End</span>
            </div>
            <div className="w-[40px] p-3 flex items-end justify-center">
               {/* Action Spacer */}
            </div>
          </div>
        </th>
        {days.map((day, idx) => {
          const date = new Date(viewYear, viewMonth - 1, day);
          const weekdayIdx = date.getDay();
          const isToday = new Date().toDateString() === date.toDateString();
          const isSelected = selectedDate &&
            selectedDate.getDate() === day &&
            selectedDate.getMonth() + 1 === viewMonth &&
            selectedDate.getFullYear() === viewYear;
          const weekIdx = Math.floor(idx / 7);
          const color = WEEK_COLORS[weekIdx] || WEEK_COLORS[WEEK_COLORS.length - 1];

          return (
            <th
              key={idx}
              onClick={() => onSelectDate?.(date)}
              className={`p-1 text-center font-normal cursor-pointer transition-all duration-300 ease-in-out border-b border-slate-200 hover:bg-slate-200/50 ${
                isSelected ? "ring-2 ring-inset ring-slate-800 bg-slate-100 shadow-inner scale-105 z-10" : isToday ? "bg-slate-200" : ""
              }`}
              style={{ backgroundColor: !isSelected && !isToday ? `${color}90` : undefined }}
            >
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter" style={{ color: color }}>
                {WEEKDAY_NAMES[weekdayIdx]}
              </div>
              <div className="text-[11px] font-black text-slate-800">{day}</div>
            </th>
          );
        })}
        <th className="sticky right-[40px] z-30 bg-slate-50 border-b border-slate-200 border-l px-2 text-[9px] font-technical font-black text-slate-400">Current</th>
        <th className="sticky right-0 z-30 bg-slate-50 border-b border-slate-200 px-2 text-[9px] font-technical font-black text-slate-400">Max</th>
      </tr>
    </>
  );
};
