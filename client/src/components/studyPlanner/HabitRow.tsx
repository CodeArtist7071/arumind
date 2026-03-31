import { Bell, CheckSquare, Loader, Pen, Trash } from "lucide-react";
import { format12h } from "../../utils/format12h";
import { supabase } from "../../utils/supabase";
import { WEEK_COLORS, type Habit } from "./TrackerGrid";
import { updateUserLocally } from "../../slice/userSlice";

export const HabitRow = ({
  habit,
  progress,
  renderedDays,
  startDay,
  daysInMonth,
  viewMonth,
  viewYear,
  currentMonth,
  currentYear,
  today,
  unlockPastDays,
  deletingId,
  connected,
  user,
  selectedDate,
  onToggle,
  editHabit,
  removeEvent,
  onRefresh,
  dispatch,
}: {
  habit: Habit & { currentStreak: number; maxStreak: number };
  progress: boolean[];
  renderedDays: number[];
  startDay: number;
  daysInMonth: number;
  viewMonth: number;
  viewYear: number;
  currentMonth: number;
  currentYear: number;
  today: number;
  unlockPastDays: boolean;
  deletingId: string | null;
  connected: boolean;
  user: any;
  selectedDate?: Date;
  onToggle: (id: string, idx: number) => void;
  editHabit: (h: Habit) => void;
  removeEvent: (id: string) => Promise<void>;
  onRefresh: () => void;
  dispatch: any;
}) => {
  const isOneOff = (habit as any).is_recurring === false;
  const isHabitToday = viewMonth === currentMonth && viewYear === currentYear;
  // A one-off task is only editable if it matches 'today' or grid is unlocked
  const canEdit = !isOneOff || isHabitToday || unlockPastDays;

  return (
    <tr className="group hover:bg-[#f0fff4]/30 relative transition-colors">
      <td className="sticky left-0 z-20 bg-surface-container-high group-hover:bg-[#f0fff4]/50 border-green-500 p-0 align-middle transition-colors">
        <div className="flex items-center justify-between bg-surface-container-high border-b border-on-surface/20 px-2 py-1.5 min-h-[44px]">
          <div className="grid grid-cols-[160px_70px_70px] items-center gap-2 min-w-0 pr-2">
            
            {/* Column 1: Routine Name & Priority Stack */}
            <div className="flex flex-col min-w-0">
              <div className="text-[11px] font-bold text-on-surface leading-tight truncate" title={habit.name}>
                  {habit.name}
              </div>
              <div className="mt-1">
                <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${
                  habit.priority === "HIGH" ? "bg-red-100/80 text-red-700" : 
                  habit.priority === "MEDIUM" ? "bg-yellow-100/80 text-yellow-700" : 
                  "bg-on-surface/5 text-on-surface-variant/60"}`}>
                  {habit.priority}
                </span>
              </div>
            </div>

            {/* Column 2: Start Time */}
            <div className="text-[9px] font-bold text-on-surface/60">
               {habit.start_time ? format12h(habit.start_time) : "--"}
            </div>

            {/* Column 3: End Time */}
            <div className="text-[9px] font-bold text-on-surface/60">
               {habit.end_time ? format12h(habit.end_time) : "--"}
            </div>
          </div>

          <div className="flex gap-0.5 transition-opacity bg-surface/40 rounded p-0.5 mr-1">
            <button 
              disabled={!canEdit}
              onClick={() => canEdit && editHabit(habit)} 
              className={`p-1 rounded transition-colors ${canEdit ? "text-slate-400 hover:text-primary hover:bg-green-50" : "text-slate-200 cursor-not-allowed"}`} 
              title={canEdit ? "Edit Routine" : "One-off tasks can only be edited on their scheduled day"}
            >
              <Pen size={12} />
            </button>
            <button 
              disabled={!canEdit}
              onClick={async () => {
                if (!canEdit) return;
                if (connected) {
                  const { data: prof } = await supabase.from("profiles").select("google_calendar_event_ids").eq("id", user?.id).single();
                  const gcId = (prof?.google_calendar_event_ids as any)?.[habit.id];
                  if (gcId) { 
                    await removeEvent(gcId); 
                    const newIds = { ...(prof?.google_calendar_event_ids as any) };
                    delete newIds[habit.id];
                    await supabase.from("profiles").update({ google_calendar_event_ids: newIds }).eq("id", user?.id); 
                    dispatch(updateUserLocally({ google_calendar_event_ids: newIds }));
                  }
                }
                await supabase.from(habit.is_mastery ? "user_mastery" : "study_habits").delete().eq("id", habit.id);
                onRefresh();
              }} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete Routine">
              {deletingId === habit.id ? <Loader className="animate-spin size-3" /> : <Trash size={12} />}
            </button>
          </div>
        </div>
      </td>
      {renderedDays.map((day) => {
        const actualDayIdx = day - 1;
        const isToday = viewMonth === currentMonth && viewYear === currentYear && (actualDayIdx + 1) === today;
        const isSelected = selectedDate && selectedDate.getDate() === actualDayIdx + 1 && selectedDate.getMonth() + 1 === viewMonth && selectedDate.getFullYear() === viewYear;
        const isEditable = isToday || unlockPastDays;
        const isDone = progress[actualDayIdx];
        const weekIdx = Math.floor(actualDayIdx / 7);
        const bgClass = isSelected ? "bg-green-100/50" : isToday ? "bg-surface" : WEEK_COLORS[Math.min(weekIdx, 4)].replace("200", "50").replace("bg-slate-200", "bg-transparent");
        const cellOpacity = isEditable ? "opacity-100" : "opacity-60 dark:opacity-80 grayscale-[0.5]";
        const checkedBorderClass = WEEK_COLORS[Math.min(weekIdx, 4)].replace("bg-", "border-").replace("200", "500");
        const checkedTextClass = WEEK_COLORS[Math.min(weekIdx, 4)].replace("bg-", "text-").replace("200", "600");

        return (
          <td key={actualDayIdx} className={`  border-b border-on-surface/10 ${bgClass} ${isToday ? "ring-2 ring-inset ring-green-600/40 bg-green-50/30" : ""} ${isSelected ? "ring-2 ring-inset ring-green-600/30 shadow-inner" : ""} ${cellOpacity} transition-all`}>
            <label className={`w-full h-full flex items-center justify-center p-1 ${isEditable ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
              <input 
                type="checkbox" 
                className="hidden" 
                disabled={!isEditable} 
                checked={isDone || false} 
                onChange={() => isEditable && onToggle(habit.id, actualDayIdx)} 
              />
              <div className={`size-[16px] bg-surface-container-high  ${isDone ? checkedBorderClass : "border-slate-300"} rounded-sm flex items-center justify-center shadow-sm relative transition-all ${isEditable ? 'hover:border-green-400 hover:shadow-md' : ''} ${!isEditable && !isDone ? "bg-surface-container-low border-slate-200 opacity-50" : ""}`}>
                {isDone && (
                  habit.is_mastery ? (
                    <div className="absolute -inset-1 flex items-center justify-center  bg-green-50 rounded-sm border border-green-200 shadow-sm animate-pulse z-10" title={`Test at ${habit.start_time}`}>
                      <Bell className="text-primary size-[12px]" strokeWidth={3} />
                    </div>
                  ) : (
                    <CheckSquare className={`${checkedTextClass} size-[18px] absolute -top-px -left-px bg-surface rounded-sm`} strokeWidth={3} />
                  )
                )}
              </div>
            </label>
          </td>
        );
      })}
      <td className="sticky right-8 z-20 border-l border-b border-[#2d7334]/20 bg-emerald-50 text-center font-mono text-[11px] font-bold text-slate-700 outline outline-transparent -outline-offset-1 shadow-[-1px_0_0_0_#cbd5e1]">{habit.currentStreak}</td>
      <td className="sticky right-0 z-20 border-l border-b border-[#2d7334]/20 bg-emerald-50 text-center font-mono text-[11px] font-bold text-slate-700 outline outline-transparent -outline-offset-1 shadow-[-1px_0_0_0_#cbd5e1]">{habit.maxStreak}</td>
    </tr>
  );
}