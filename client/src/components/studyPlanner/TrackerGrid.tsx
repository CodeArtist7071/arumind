import {
  Pen,
  Trash,
  Star,
  Zap,
  Infinity as InfinityIcon,
  Search,
  Filter,
  Plus,
  Flame,
  X,
  CheckSquare,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  CheckCheck,
  CircleCheck,
  Calendar,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "../../utils/supabase";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../../store";
import { fetchUserProfile } from "../../slice/userSlice";
import MasterySelector from "./MasterySelector";
import { useParams } from "react-router";
import { AlertPopup } from "../ui/AlertPopup";
import { Button } from "../ui/Button";
import { AddTask } from "./AddTask";

type Priority = "HIGH" | "MEDIUM" | "LOW";
type Category = "theory" | "mcq" | "revision" | "mock";

export interface Habit {
  id: string;
  name: string;
  priority: Priority;
  category: Category;
  start_time?: string;
  end_time?: string;
  is_mastery?: boolean;
  chapter_id?: string;
}

type FormValues = {
  habit: string;
  priority: Priority;
  // category: Category;
  start_time: string;
  end_time: string;
};

interface TrackerGridProps {
  initialHabits?: Habit[];
  initialProgress?: Record<string, boolean[]>;
  onToggle: (id: string, index: number) => void;
  onRefresh: () => void;
  isLoading?: boolean;
  viewMonth: number;
  viewYear: number;
  onMonthChange: (direction: "prev" | "next") => void;
  isSettingUp?: boolean;
  onCopyPrevious?: () => void;
  onStartFresh?: () => void;
  autoOpenAddModal?: boolean;
  onModalOpenHandled?: () => void;
  hasPrevMonthTasks?: boolean;
  isPastMonth?: boolean;
  onShowMastery?: () => void;
  onShowAddTask?: () => void;
}

const WEEK_COLORS = [
  "bg-blue-100/50", // Week 1
  "bg-purple-100/50", // Week 2
  "bg-red-100/50", // Week 3
  "bg-orange-100/50", // Week 4
  "bg-slate-100/50", // Extras
];

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function TrackerGrid({
  initialHabits = [],
  initialProgress = {},
  onToggle,
  onRefresh,
  isLoading = false,
  viewMonth,
  viewYear,
  onMonthChange,
  isSettingUp = false,
  onCopyPrevious,
  onStartFresh,
  autoOpenAddModal = false,
  onModalOpenHandled,
  hasPrevMonthTasks = false,
  isPastMonth = false,
}: TrackerGridProps) {
  const { eid: examId } = useParams();
  const dispatch = useDispatch<AppDispatch>();
  const { user, profile, loading } = useSelector((state: RootState) => state.user);

  // --- Real-Time Calendar Logic ---
  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const currentYear = now.getFullYear();
  const currentMonth = currentMonthIdx + 1;
  const today = now.getDate();
  const [enableTask, setEnableTask] = useState(false);
  const monthName = new Date(viewYear, viewMonth - 1).toLocaleString("default", { month: "long" });
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const startWeekdayIdx = new Date(viewYear, viewMonth - 1, 1).getDay();
  const [taskDelete, setTaskDelete] = useState(false);

  // Auto-open modal if requested by parent (e.g. after Fresh Start)
  useEffect(() => {
    if (autoOpenAddModal) {
      setEnableTask(true);
      onModalOpenHandled?.();
    }
  }, [autoOpenAddModal, onModalOpenHandled]);

  const startDay = useMemo(() => {
    if (!profile?.planner_start_date) return today;

    const startDate = new Date(profile.planner_start_date);
    const startM = startDate.getMonth() + 1;
    const startY = startDate.getFullYear();
    const startD = startDate.getDate();

    // If viewing the month when they first started, start from that day
    if (viewYear === startY && viewMonth === startM) {
      return startD;
    }

    // If viewing a month AFTER they started, show the full month (1-31)
    if (viewYear > startY || (viewYear === startY && viewMonth > startM)) {
      return 1;
    }

    // Otherwise (future month) or default, show from today if it's current month
    if (viewMonth === currentMonth && viewYear === currentYear) {
      return today;
    }

    return 1;
  }, [viewMonth, viewYear, currentMonth, currentYear, today, profile?.planner_start_date]);

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const rotatedDays = days.slice(startDay - 1);

  const { register, handleSubmit, reset, setValue } = useForm<FormValues>({
    defaultValues: {
      priority: "MEDIUM",
      // category: "theory",
    },
  });

  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSelector, setShowSelector] = useState(false);

  // --- Calculations ---

  const filteredHabits = initialHabits.filter((h) =>
    h.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const dailyStats = useMemo(() => {
    return rotatedDays.map((_, dayIdx) => {
      const actualDayIdx = (startDay - 1 + dayIdx) % daysInMonth;
      const isToday =
        viewMonth === currentMonth &&
        viewYear === currentYear &&
        actualDayIdx === today - 1;
      let completed = 0;
      initialHabits.forEach((h) => {
        if (initialProgress[h.id]?.[actualDayIdx]) completed++;
      });
      const total = initialHabits.length || 1;
      const percent = Math.round((completed / total) * 100);
      return { completed, total, percent };
    });
  }, [initialHabits, initialProgress, rotatedDays, startDay, daysInMonth]);

  const overallProgress = useMemo(() => {
    let totalCells = initialHabits.length * daysInMonth;
    let completedCells = 0;
    initialHabits.forEach((h) => {
      initialProgress[h.id]?.forEach((done) => {
        if (done) completedCells++;
      });
    });
    return totalCells === 0
      ? 0
      : ((completedCells / totalCells) * 100).toFixed(1);
  }, [initialHabits, initialProgress, daysInMonth]);

  const activeDaysCount = useMemo(() => {
    let count = 0;
    rotatedDays.forEach((_, dayIdx) => {
      const actualDayIdx = (startDay - 1 + dayIdx) % daysInMonth;
      const isAnyDone = initialHabits.some(
        (h) => initialProgress[h.id]?.[actualDayIdx],
      );
      if (isAnyDone) count++;
    });
    return count;
  }, [initialHabits, initialProgress, rotatedDays, startDay, daysInMonth]);

  const habitsWithStreaks = useMemo(() => {
    return filteredHabits.map((h) => {
      const progress = initialProgress[h.id] || [];
      let currentStreak = 0;
      let maxStreak = 0;
      let tempStreak = 0;

      // Max Streak
      progress.forEach((done) => {
        if (done) {
          tempStreak++;
          maxStreak = Math.max(maxStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      });

      // Current Streak (going back from the last day that has a record)
      for (let i = progress.length - 1; i >= 0; i--) {
        if (progress[i]) {
          currentStreak++;
        } else if (currentStreak > 0 || i < progress.length - 2) {
          // we stop if we hit a false,
          // but we might want to check if "today" is even reached yet.
          // Simplified: just count consecutive trues from the end.
          break;
        }
      }

      return { ...h, currentStreak, maxStreak };
    });
  }, [filteredHabits, initialProgress]);

  const weeklyProgress = useMemo(() => {
    const weeks = [0, 0, 0, 0, 0].map(() => ({ completed: 0, total: 0 }));
    initialHabits.forEach((h) => {
      days.forEach((day, i) => {
        const weekIdx = i < 28 ? Math.floor(i / 7) : 4;
        weeks[weekIdx].total++;
        if (initialProgress[h.id]?.[i]) weeks[weekIdx].completed++;
      });
    });
    return weeks.map((w) =>
      w.total === 0 ? 0 : Math.round((w.completed / w.total) * 100),
    );
  }, [initialHabits, initialProgress, rotatedDays, startDay, daysInMonth]);

  // --- Actions ---

  async function onSubmit(data: FormValues) {
    console.log("datasss....", data)
    const name = data.habit.trim();
    if (!name) return;
    if (!user?.id) return;

    try {
      if (editingHabitId) {
        const habit = initialHabits.find((h) => h.id === editingHabitId);
        if (!habit) return;
        const table = habit.is_mastery ? "user_mastery" : "study_habits";
        await supabase
          .from(table)
          .update({
            name: habit.is_mastery ? undefined : name,
            priority: data.priority,
            // category: data.category,
            start_time: data.start_time || null,
            end_time: data.end_time || null,
          })
          .eq("id", editingHabitId);
        setEditingHabitId(null);
      } else {
        if (!profile?.planner_start_date) {
          await supabase
            .from("profiles")
            .update({ planner_start_date: new Date().toISOString() })
            .eq("id", user.id);
          dispatch(fetchUserProfile());
        }
        await supabase.from("study_habits").insert({
          user_id: user.id,
          name,
          priority: data.priority,
          // category: data.category,
          start_time: data.start_time || null,
          end_time: data.end_time || null,
          progress: Array(31).fill(false),
          month: viewMonth,
          year: viewYear,
          exam_id: examId,
        });
      }
      reset();
      onRefresh();
    } catch (err) {
      console.error(err);
    }
    setEnableTask(false);
  }

  async function handleAddMastery(chapter: any) {
    if (!user?.id) return;
    try {
      if (!profile?.planner_start_date) {
        await supabase
          .from("profiles")
          .update({ planner_start_date: new Date().toISOString() })
          .eq("id", user.id);
        dispatch(fetchUserProfile());
      }
      
      await supabase.from("user_mastery").insert({
        user_id: user.id,
        chapter_id: chapter.id,
        priority: "MEDIUM",
        start_time: null,
        end_time: null,
        progress: Array(31).fill(false),
        month: viewMonth,
        year: viewYear,
        exam_id: examId,
      });
      
      setShowSelector(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  }

  function editHabit(habit: Habit) {
    setEnableTask(true);
    setEditingHabitId(habit.id);
    setValue("habit", habit.name);
    setValue("priority", habit.priority);
    // setValue("category", habit.category);
    setValue("start_time", habit.start_time || "");
    setValue("end_time", habit.end_time || "");
    window.scrollTo({ top: 300, behavior: "smooth" });
  }

  return (
    <div className=" text-slate-800 flex flex-col min-w-300">
        {/* --- TOP HEADER --- */}
        <div className="bg-green-800 rounded-xl text-white p-4 flex flex-col gap-2">
          <div className="flex justify-between items-end">
            <div className="p-2 rounded-lg">
              <div className="space-y-2 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-[#1a57db] rounded-full text-sm font-bold uppercase flex items-center gap-2">
                    <Sparkles size={12} />
                    Beta Preview
                  </div>
                  <span className={`text-slate-400 text-md font-semibold uppercase ${isLoading ? "animate-pulse" : ""}`}>
                    {user?.identities?.[0]?.identity_data?.name || "Student"}'s Academy
                  </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white dark:text-white flex items-center gap-4">
                  Academic{" "}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onMonthChange("prev")}
                      className="p-1 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <span className={`text-white ${isLoading ? "animate-pulse" : ""}`}>
                      {monthName} {viewYear}
                    </span>
                    <button
                      onClick={() => onMonthChange("next")}
                      className="p-1 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                    >
                      <ChevronRight size={24} />
                    </button>
                  </div>{" "}
                  Planner
                </h1>
                <p className="text-md text-slate-50 font-medium max-w-xl">
                  Design your routine, track your mastery streaks, and maintain deep
                  focus for your upcoming OPSC exams.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col ml-8">
                <div className="text-4xl font-bold leading-none">
                  {overallProgress}%
                </div>
                <div className="text-[10px] font-black uppercase text-white/60 tracking-widest mt-1">
                  Mastery Score
                </div>
              </div>
              <button
                onClick={() => setShowSelector(true)}
                className="ml-4 px-4 py-2 bg-white hover:text-white cursor-pointer hover:bg-white/20 border border-white/30 text-green-700 rounded text-xs font-black uppercase tracking-wide transition-colors flex items-center gap-2"
              >
                <CheckSquare size={14} />
                Add Mastery
              </button>
            </div>
          </div>

          <div className="mt-2">
            {/* Quick Add Form Floating or Fixed at bottom */}
            <div className="flex justify-end">
              <button onClick={() => setEnableTask(true)} className="ml-4 px-7.5 py-2  cursor-pointer bg-white hover:bg-white/20 hover:text-white border border-white/30 text-green-700 rounded text-xs font-black uppercase tracking-wide transition-colors flex items-center gap-2">
                <CheckSquare size={14} />
                Add Task
              </button>
            </div>

            <AddTask isOpen={enableTask} onClose={() => setEnableTask(false)} register={register} handleSubmit={handleSubmit(onSubmit)} editingHabitId={editingHabitId} title={editingHabitId ? "Update" : "Add Task"} />


            <div className="flex justify-between text-[10px] uppercase font-black mb-1">
              <span>Active Days</span>
            </div>
            <div className="h-6 bg-white/20 rounded-sm overflow-hidden flex gap-0.5 p-0.5">
              {rotatedDays.map((_, i) => {
                const actualDayIdx = (startDay - 1 + i) % daysInMonth;
                const isToday =
                  viewMonth === currentMonth &&
                  viewYear === currentYear &&
                  actualDayIdx === today - 1;
                const isAnyDone = initialHabits.some(
                  (h) => initialProgress[h.id]?.[actualDayIdx],
                );
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-sm transition-all ${isAnyDone ? "bg-green-800" : "bg-white/10"
                      } ${isToday ? "ring-1 ring-white" : ""}`}
                  />

                );
              })}
            </div>
          </div>
        </div>

        {/* --- MAIN GRID AREA --- */}
        <div className="flex mt-2 h-100">
          {/* Habit Label Sidebar */}
          <div className="w-16 bg-green-700 flex rounded-tl-xl rounded-bl-xl items-center justify-center text-white border-r border-[#2d5e2d]">
            <span className="rotate-270 font-black text-3xl tracking-widest uppercase">
              Habits
            </span>
          </div>

          <div className="flex-1 overflow-x-auto relative">
            {isSettingUp && (
              <div className="absolute inset-0 z-40 bg-white/10 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white/60 dark:bg-slate-800 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-700 p-8 flex flex-col items-center text-center gap-6">
                  {/* <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600">
                  <Calendar size={20} />
                </div> */}
                  <div>
                    <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mb-2">No task added for {monthName}</h3>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
                      {isPastMonth 
                        ? "You didn't have any scheduled routines or mastery goals for this period."
                        : "Design your schedule from scratch or copy your previous routines."}
                    </p>
                  </div>
                <div className="flex flex-col w-full gap-2">
                  {!isPastMonth && (
                    <>
                      {hasPrevMonthTasks && (
                        <button 
                          onClick={onCopyPrevious}
                          className="w-full px-6 py-3 text-sm bg-green-600 text-white font-bold rounded-2xl hover:bg-green-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-green-600/20"
                        >
                          <Sparkles size={18} />
                          Copy from Previous Month
                        </button>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => setEnableTask(true)}
                          className="w-full text-xs px-4 py-3 bg-white dark:bg-slate-800 text-blue-600 border border-blue-200 font-bold rounded-2xl hover:bg-blue-50 transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Plus size={14} /> Add Task
                        </button>
                        <button 
                          onClick={() => setShowSelector(true)}
                          className="w-full text-xs px-4 py-3 bg-white dark:bg-slate-800 text-emerald-600 border border-emerald-200 font-bold rounded-2xl hover:bg-emerald-50 transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Plus size={14} /> Add Mastery
                        </button>
                      </div>
                    </>
                  )}
                </div>
                </div>
              </div>
            )}
            <table className="w-full border-collapse">
              <thead>
                {/* Row 1: Daily Done % Checkboxes */}
                <tr className="bg-white border-b border-slate-100">
                  <th className="p-2 border-r bg-slate-50 min-w-50"></th>
                  {rotatedDays.map((_, i) => {
                    const actualDayIdx = (startDay - 1 + i) % daysInMonth;
                    const isToday =
                      viewMonth === currentMonth &&
                      viewYear === currentYear &&
                      actualDayIdx === today - 1;
                    return (
                      <th
                        key={i}
                        className={`p-1 border-r text-center w-10 ${isToday ? "bg-green-50/50" : ""
                          }`}
                      >
                        <div
                          className={`size-4 mx-auto rounded transition-colors ${dailyStats[i].completed > 0
                            ? ""
                            : "border-slate-300"
                            }`}
                        >
                          {dailyStats[i].completed > 0 && (
                            <CircleCheck size={17} strokeWidth={3} className="text-green-600" />
                          )}
                        </div>
                      </th>
                    );
                  })}
                  <th
                    className="bg-green-700 rounded-tr-xl! text-white text-[10px] uppercase font-black w-32"
                    colSpan={2}
                  >
                    Streaks
                  </th>
                </tr>

                {/* Row 2: Daily Done % Bar Charts */}
                <tr className="bg-slate-50 border-b border-slate-200">
                  <td className="p-1 text-[10px]  font-black uppercase text-slate-400 text-left pr-4">
                    Daily Task Done in Percentage....
                  </td>
                  {rotatedDays.map((_, i) => {
                    const actualDayIdx = (startDay - 1 + i) % daysInMonth;
                    const isToday =
                      viewMonth === currentMonth &&
                      viewYear === currentYear &&
                      actualDayIdx === today - 1;
                    return (
                      <td
                        key={i}
                        className={`p-0 border-r border-slate-200 w-10 h-24 relative align-bottom ${isToday ? "bg-green-50/50" : ""
                          }`}
                      >
                        <div className="text-[8px] font-black font-mono absolute top-1 left-0 right-0 text-center text-slate-500">
                          {dailyStats[i].percent}%
                        </div>
                        <div
                          className={`mx-auto w-5 transition-all shadow-sm ${i < 7
                            ? "bg-blue-400"
                            : i < 14
                              ? "bg-purple-400"
                              : i < 21
                                ? "bg-red-400"
                                : i < 28
                                  ? "bg-orange-400"
                                  : "bg-slate-400"
                            }`}
                          style={{ height: `${dailyStats[i].percent}%` }}
                        />
                      </td>
                    );
                  })}
                  <th className="bg-emerald-600 border-r border-emerald-700 text-white text-[10px] p-1">
                    Current
                  </th>
                  <th className="bg-emerald-600 text-white text-[10px] p-1">
                    Max
                  </th>
                </tr>

                {/* Row 3: Day/Date Header */}
                <tr className="bg-white border-b border-slate-200">
                  <th className="p-2 border-r border-slate-200 text-left font-black text-slate-400 uppercase text-[10px]">
                    Tasks
                  </th>
                  {rotatedDays.map((day, i) => {
                    const actualDayIdx = (startDay - 1 + i) % daysInMonth;
                    const isToday =
                      viewMonth === currentMonth &&
                      viewYear === currentYear &&
                      actualDayIdx === today - 1;
                    const weekdayIdx = (startWeekdayIdx + (day - 1)) % 7;
                    const isWeekend = weekdayIdx === 0 || weekdayIdx === 6;
                    return (
                      <th
                        key={i}
                        className={`p-1 border-r border-slate-200 w-10 text-[9px] font-black leading-tight font-mono ${isToday ? "bg-green-600 text-white" : isWeekend ? "text-red-500" : "text-slate-500"
                          }`}
                      >
                        {WEEKDAY_NAMES[weekdayIdx]}
                        <br />
                        {day}
                      </th>
                    );
                  })}
                  <th
                    className="border-l border-emerald-700 bg-slate-100"
                    colSpan={2}
                  ></th>
                </tr>
              </thead>

              <tbody>
                {isLoading && initialHabits.length === 0 ? (
                  <tr>
                    <td colSpan={rotatedDays.length + 3} className="p-20 text-center">
                      <div className="flex flex-col items-center gap-4 animate-pulse">
                        <div className="size-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
                        <span className="text-slate-400 font-bold uppercase text-sm tracking-widest">
                          Syncing Calendar...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : habitsWithStreaks.map((habit) => (
                  <tr
                    key={habit.id}
                    className="border-b border-slate-200 group hover:bg-slate-50"
                  >
                    <td className="p-2 border-r border-slate-200 font-bold text-[11px] flex justify-between items-center group">
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{habit.name}</span>
                          {habit.is_mastery && (
                            <span className="bg-emerald-100 text-emerald-700 text-[8px] px-1 rounded-xs uppercase font-black shrink-0">
                              Mastery
                            </span>
                          )}
                        </div>
                        {(habit.start_time || habit.end_time) && (
                          <span className="text-[9px] font-black text-[#1a5d1a] mt-0.5">
                            {habit.start_time?.slice(0, 5) || "--:--"} -{" "}
                            {habit.end_time?.slice(0, 5) || "--:--"}
                          </span>
                        )}
                      </div>
                      <div className="flex transition-opacity">
                        <button
                          onClick={() => editHabit(habit)}
                          className="p-1 text-slate-400 hover:text-blue-600"
                        >
                          <Pen size={10} />
                        </button>
                        <button
                          onClick={() => {
                            console.log("habit_id", habit.id)
                            supabase
                              .from(habit.is_mastery ? "user_mastery" : "study_habits")
                              .delete()
                              .eq("id", habit.id)
                              .then(onRefresh)
                          }}
                          className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                        >
                          <Trash size={10} />
                        </button>
                      </div>
                    </td>
                    {rotatedDays.map((_, i) => {
                      const actualDayIdx = (startDay - 1 + i) % daysInMonth;
                      const isToday =
                        viewMonth === currentMonth &&
                        viewYear === currentYear &&
                        actualDayIdx === today - 1;
                      return (
                        <td
                          key={i}
                          className={`p-0 border-r border-slate-200 text-center w-10 h-10 ${WEEK_COLORS[i < 28 ? Math.floor(i / 7) : 4]
                            } ${isToday ? "ring-2 ring-inset ring-green-600 z-10" : ""}`}
                        >
                          <label
                            className={`flex items-center justify-center size-full ${isToday ? "cursor-pointer" : "cursor-not-allowed"
                              }`}
                          >
                            <input
                              type="checkbox"
                              checked={initialProgress[habit.id]?.[actualDayIdx] || false}
                              onChange={() => isToday && onToggle(habit.id, actualDayIdx)}
                              disabled={!isToday}
                              className="peer hidden"
                            />
                            <div
                              className={`size-6 rounded-none border-2 transition-all flex items-center justify-center ${initialProgress[habit.id]?.[actualDayIdx]
                                ? "bg-white border-green-600"
                                : isToday
                                  ? "border-green-400/50"
                                  : "border-slate-300"
                                }`}
                            >
                              {initialProgress[habit.id]?.[actualDayIdx] && (
                                <CheckCheck color="white" strokeWidth={3} className="size-4 bg-green-600 rounded-none" />
                              )}
                            </div>
                          </label>
                        </td>
                      );
                    })}
                    <td className="text-center font-black font-mono text-sm border-r border-emerald-700 bg-emerald-50 text-emerald-800">
                      {habit.currentStreak}
                    </td>
                    <td className="text-center font-black font-mono text-sm bg-emerald-50 text-emerald-800">
                      {habit.maxStreak}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>


        {/* --- FOOTER: WEEKLY DONE % --- */}
        <div className="p-8 bg-white mt-5 shadow-lg rounded-xl">
          <div className="flex items-center gap-12">
            <div className="w-1/4">
              <h3 className="text-3xl font-black uppercase text-slate-300">
                Weekly
                <br />
                Analysis..
              </h3>
            </div>
            <div className="flex-1 flex justify-around items-center">
              {weeklyProgress.map((percent, i) => (
                <div key={i} className="flex flex-col items-center gap-4">
                  <div className="relative size-32">
                    <svg className="size-full" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#f1f5f9"
                        strokeWidth="12"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={
                          ["#3b82f6", "#a855f7", "#ef4444", "#f97316", "#64748b"][
                          i
                          ]
                        }
                        strokeWidth="12"
                        strokeDasharray={`${percent * 2.51}, 251`}
                        strokeLinecap="round"
                        transform="rotate(-90 50 50)"
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-black">{percent}%</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-400 text-center">
                    {i < 4 ? `Week ${i + 1}` : "Extras"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mastery Selector Modal */}
        {showSelector && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowSelector(false)}
            />
            <div className="relative bg-white w-full max-w-2xl rounded shadow-2xl overflow-hidden p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black tracking-tight mb-4">Add Syllabus Mastery</h3>
                <X className="cursor-pointer" onClick={() => setShowSelector(false)} />
              </div>
              <MasterySelector
                examId={examId || ""}
                onAdd={handleAddMastery}
                existingIds={initialHabits
                  .filter((h) => h.is_mastery)
                  .map((h) => h.chapter_id!)}
              />
            </div>
          </div>
        )}
      </div>
  );
}

const DeleteTask = ({
  habit,
  onRefresh,
  setTaskDelete,
  isOpen,
}: {
  habit: Habit;
  onRefresh: () => void;
  setTaskDelete: (isOpen: boolean) => void;
  isOpen: boolean;
}) => {
    return (
      <AlertPopup
        isOpen={isOpen}
        onClose={() => setTaskDelete(false)}
        message={"Are you sure you want to delete this task?"}
        title={"Delete Task"}
        children={
          <>
            <Button onClick={() => setTaskDelete(false)} title={"Cancel"} />
            <Button onClick={() => {

            }} className={" bg-red-500!"} title={"Delete"} />
          </>

        } />
    )
  }
