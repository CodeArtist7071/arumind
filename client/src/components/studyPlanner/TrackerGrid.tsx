import {
  Pen,
  Trash,
  Star,
  Zap,
  Infinity,
  Search,
  Filter,
  Plus,
  Flame,
  X,
  CheckSquare,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "../../utils/supabase";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import MasterySelector from "./MasterySelector";
import { useParams } from "react-router";

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
  category: Category;
  start_time: string;
  end_time: string;
};

interface TrackerGridProps {
  initialHabits?: Habit[];
  initialProgress?: Record<string, boolean[]>;
  onToggle: (id: string, index: number) => void;
  onRefresh: () => void;
  isLoading?: boolean;
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
}: TrackerGridProps) {
  const { eid: examId } = useParams();
  const { user } = useSelector((state: RootState) => state.user);

  // --- Real-Time Calendar Logic ---
  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const currentYear = now.getFullYear();
  const monthName = now.toLocaleString("default", { month: "long" });
  const daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
  const startWeekdayIdx = new Date(currentYear, currentMonthIdx, 1).getDay();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const { register, handleSubmit, reset, setValue } = useForm<FormValues>({
    defaultValues: {
      priority: "MEDIUM",
      category: "theory",
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
    return days.map((_, dayIdx) => {
      let completed = 0;
      initialHabits.forEach((h) => {
        if (initialProgress[h.id]?.[dayIdx]) completed++;
      });
      const total = initialHabits.length || 1;
      const percent = Math.round((completed / total) * 100);
      return { completed, total, percent };
    });
  }, [initialHabits, initialProgress]);

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
    days.forEach((_, dayIdx) => {
      const isAnyDone = initialHabits.some(
        (h) => initialProgress[h.id]?.[dayIdx],
      );
      if (isAnyDone) count++;
    });
    return count;
  }, [initialHabits, initialProgress]);

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
      days.forEach((_, i) => {
        const weekIdx = i < 28 ? Math.floor(i / 7) : 4;
        weeks[weekIdx].total++;
        if (initialProgress[h.id]?.[i]) weeks[weekIdx].completed++;
      });
    });
    return weeks.map((w) =>
      w.total === 0 ? 0 : Math.round((w.completed / w.total) * 100),
    );
  }, [initialHabits, initialProgress]);

  // --- Actions ---

  async function onSubmit(data: FormValues) {
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
            category: data.category,
            start_time: data.start_time || null,
            end_time: data.end_time || null,
          })
          .eq("id", editingHabitId);
        setEditingHabitId(null);
      } else {
        await supabase.from("study_habits").insert({
          user_id: user.id,
          name,
          priority: data.priority,
          category: data.category,
          start_time: data.start_time || null,
          end_time: data.end_time || null,
          progress: Array(31).fill(false),
        });
      }
      reset();
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleAddMastery(chapter: any) {
    if (!user?.id) return;
    try {
      await supabase.from("user_mastery").insert({
        user_id: user.id,
        chapter_id: chapter.id,
        progress: Array(31).fill(false),
      });
      setShowSelector(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  }

  function editHabit(habit: Habit) {
    setEditingHabitId(habit.id);
    setValue("habit", habit.name);
    setValue("priority", habit.priority);
    setValue("category", habit.category);
    setValue("start_time", habit.start_time || "");
    setValue("end_time", habit.end_time || "");
    window.scrollTo({ top: 300, behavior: "smooth" });
  }

  if (isLoading)
    return (
      <div className="p-20 text-center font-black text-slate-400">
        LOADING...
      </div>
    );

  return (
    <div className="bg-white text-slate-800 flex flex-col min-w-300">
      {/* --- TOP HEADER --- */}
      <div className="bg-green-800 rounded-xl text-white p-4 flex flex-col gap-2">
        <div className="flex justify-between items-end">
          <div className="flex items-center gap-4">
            <div className="bg-white p-2 rounded-lg">
              <span className="text-[#1a5d1a] font-black text-2xl leading-none">
                {user?.identities?.[0]?.identity_data?.name}
                <br />
                Excels
              </span>
            </div>
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
              className="ml-4 px-4 py-2 bg-white hover:bg-white/20 border border-white/30 text-green-700 rounded text-xs font-black uppercase tracking-wide transition-colors flex items-center gap-2"
            >
              <CheckSquare size={14} />
              Add Mastery
            </button>
          </div>
          <div className="text-5xl font-black uppercase tracking-tighter">
            {monthName}
          </div>
          <div className="w-64"></div> {/* Spacer for symmetry if needed */}
        </div>

        <div className="mt-2">
          {/* Quick Add Form Floating or Fixed at bottom */}
          <div className="p-4 border-t-green-700 border-t-2 flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-50">
              <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">
                Task Name
              </label>
              <input
                {...register("habit")}
                placeholder="Add new task..."
                className="w-full px-4 py-3 rounded border border-white text-sm focus:ring-1 ring-[#1a5d1a] outline-none"
              />
            </div>
            <div className="w-24">
              <label className="text-[10px] font-black uppercase text-white mb-1 block">
                Start
              </label>
              <input
                type="time"
                {...register("start_time")}
                className="w-full px-2 py-3 rounded border border-white text-xs outline-none"
              />
            </div>
            <div className="w-24">
              <label className="text-[10px] font-black uppercase text-white mb-1 block">
                End
              </label>
              <input
                type="time"
                {...register("end_time")}
                className="w-full px-2 text-white py-3 rounded border border-slate-300 text-xs outline-none"
              />
            </div>
            <div className="flex items-center  gap-2">
              <div className="mt-4.5">
                <select
                  {...register("priority")}
                  className="px-4 py-3.5 rounded text-white border border-slate-300 text-[10px] font-black uppercase outline-none"
                >
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              <button
                onClick={handleSubmit(onSubmit)}
                className="bg-white text-green-700 mt-4.5 px-6 py-3.5 rounded text-xs font-black uppercase hover:bg-[#144a14] transition-colors shadow-sm"
              >
                {editingHabitId ? "Update" : "Add Task"}
              </button>
            </div>
          </div>

          <div className="flex justify-between text-[10px] uppercase font-black mb-1">
            <span>Active Days</span>
          </div>
          <div className="h-6 bg-white/20 rounded-sm overflow-hidden flex gap-0.5 p-0.5">
            {days.map((_, i) => {
              const isAnyDone = initialHabits.some(
                (h) => initialProgress[h.id]?.[i],
              );
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-sm ${isAnyDone ? "bg-green-800" : "bg-transparent"}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* --- MAIN GRID AREA --- */}
      <div className="flex mt-2">
        {/* Habit Label Sidebar */}
        <div className="w-16 bg-green-700 flex rounded-tl-xl rounded-bl-xl items-center justify-center text-white border-r border-[#2d5e2d]">
          <span className="rotate-270 font-black text-3xl tracking-widest uppercase">
            Habits
          </span>
        </div>

        <div className="flex-1 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              {/* Row 1: Daily Done % Checkboxes */}
              <tr className="bg-white border-b border-slate-200">
                <th className="p-2 border-r bg-slate-50 min-w-[200px]"></th>
                {days.map((_, i) => (
                  <th key={i} className="p-1 border-r text-center w-10">
                    <div
                      className={`size-4 mx-auto rounded border ${dailyStats[i].percent === 100 ? "bg-green-600 border-green-600" : "border-slate-300"}`}
                    >
                      {dailyStats[i].percent === 100 && (
                        <CheckSquare size={12} className="text-white" />
                      )}
                    </div>
                  </th>
                ))}
                <th
                  className="bg-emerald-700 text-white text-[10px] uppercase font-black w-32"
                  colSpan={2}
                >
                  Streaks
                </th>
              </tr>

              {/* Row 2: Daily Done % Bar Charts */}
              <tr className="bg-slate-50 border-b border-slate-200">
                <td className="p-1 text-[10px] font-black uppercase text-slate-400 text-right pr-4">
                  Daily Done %
                </td>
                {days.map((_, i) => (
                  <td
                    key={i}
                    className="p-0 border-r border-slate-200 w-10 h-24 relative align-bottom"
                  >
                    <div className="text-[8px] font-black font-mono absolute top-1 left-0 right-0 text-center text-slate-500">
                      {dailyStats[i].percent}%
                    </div>
                    <div
                      className={`mx-auto w-5 transition-all shadow-sm ${
                        i < 7
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
                ))}
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
                {days.map((day, i) => {
                  const weekdayIdx = (startWeekdayIdx + i) % 7;
                  const isWeekend = weekdayIdx === 0 || weekdayIdx === 6;
                  return (
                    <th
                      key={i}
                      className={`p-1 border-r border-slate-200 w-10 text-[9px] font-black leading-tight font-mono ${
                        isWeekend ? "text-red-500" : "text-slate-500"
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
              {habitsWithStreaks.map((habit) => (
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
                    <div className="flex shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => editHabit(habit)}
                        className="p-1 text-slate-400 hover:text-blue-600"
                      >
                        <Pen size={10} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Delete?"))
                            supabase
                              .from("study_habits")
                              .delete()
                              .eq("id", habit.id)
                              .then(onRefresh);
                        }}
                        className="p-1 text-slate-400 hover:text-red-500"
                      >
                        <Trash size={10} />
                      </button>
                    </div>
                  </td>
                  {days.map((_, i) => (
                    <td
                      key={i}
                      className={`p-0 border-r border-slate-200 text-center w-10 h-10 ${WEEK_COLORS[i < 28 ? Math.floor(i / 7) : 4]}`}
                    >
                      <label className="flex items-center justify-center size-full cursor-pointer">
                        <input
                          type="checkbox"
                          checked={initialProgress[habit.id]?.[i] || false}
                          onChange={() => onToggle(habit.id, i)}
                          className="peer hidden"
                        />
                        <div
                          className={`size-6 rounded-none border-2 transition-all flex items-center justify-center ${
                            initialProgress[habit.id]?.[i]
                              ? "bg-white border-green-600"
                              : "border-slate-300"
                          }`}
                        >
                          {initialProgress[habit.id]?.[i] && (
                            <div className="size-3.5 bg-green-600 rounded-none shadow-inner" />
                          )}
                        </div>
                      </label>
                    </td>
                  ))}
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
      <div className="p-8 bg-white border-t border-slate-200">
        <div className="flex items-center gap-12">
          <div className="w-1/4">
            <h3 className="text-3xl font-black uppercase text-slate-300">
              Weekly
              <br />
              Done %
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
                <span className="text-[10px] font-black uppercase text-slate-400">
                  Week {i + 1}
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
