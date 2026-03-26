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
  Loader,
  Clock,
  Bell,
  Book,
  BarChart2,
  LineChart,
  Activity,
  Trophy,
  Copy,
  BookOpen,
} from "lucide-react";
import React, { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "../../utils/supabase";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../../store";
import { fetchUserProfile, updateUserLocally } from "../../slice/userSlice";
import MasterySelector from "./MasterySelector";
import { useNavigate, useParams } from "react-router";
import { AlertPopup } from "../ui/AlertPopup";
import { Button } from "../ui/Button";
import { AddRoutine } from "./AddTask"; // Note: file still named AddTask for now
import { useGoogleCalendar } from "../../utils/useGoogleCalender";
import { useNotifications } from "reapop";
import { WarningModal } from "../ui/WarningModal";
import { PopupModal } from "../PopupModal";
import { GoogleCalendarButton } from "../ui/GoogleCalenderButton";
import GoogleCalendarModal from "./GoogleCalendarModal";


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
  is_recurring?: boolean;
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
  selectedDate?: Date;
  onSelectDate?: (date: Date) => void;
}

const WEEK_COLORS = ["bg-blue-200", "bg-purple-200", "bg-red-200", "bg-orange-200", "bg-slate-200"];

const format12h = (timeStr: string) => {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;
};

const HabitRow = ({
  habit,
  progress,
  rotatedDays,
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
  rotatedDays: number[];
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
      <td className="sticky left-0 z-20 bg-white group-hover:bg-[#f0fff4]/50 border-r border-slate-300 p-0 border-b border-slate-200 border-dotted align-middle outline outline-transparent -outline-offset-1 shadow-[1px_0_0_0_#cbd5e1] transition-colors">
        <div className="flex items-center justify-between px-2 py-1.5 min-h-[44px]">
          <div className="flex flex-col min-w-0 pr-1 gap-1">
            <div className="text-[11px] font-bold text-slate-800 leading-tight flex items-center gap-1.5">
              <span className="truncate max-w-[140px]" title={habit.name}>{habit.name}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${habit.is_mastery ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                {habit.is_mastery ? "Test" : "Routine"}
              </span>
              <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${
                habit.priority === "HIGH" ? "bg-red-100 text-red-700" : 
                habit.priority === "MEDIUM" ? "bg-yellow-100 text-yellow-700" : 
                "bg-slate-100 text-slate-600"}`}>
                {habit.priority}
              </span>
              {(habit.start_time || habit.end_time) && (
                <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5">
                  <Clock size={8} /> 
                  {habit.start_time ? format12h(habit.start_time) : ""} - {habit.end_time ? format12h(habit.end_time) : "..."}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 border border-slate-200 rounded p-0.5 shadow-sm">
            <button 
              disabled={!canEdit}
              onClick={() => canEdit && editHabit(habit)} 
              className={`p-1 rounded transition-colors ${canEdit ? "text-slate-400 hover:text-blue-500 hover:bg-blue-50" : "text-slate-200 cursor-not-allowed"}`} 
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
      {rotatedDays.map((_, i) => {
        const actualDayIdx = (startDay - 1 + i) % daysInMonth;
        const isToday = viewMonth === currentMonth && viewYear === currentYear && actualDayIdx === today - 1;
        const isSelected = selectedDate && selectedDate.getDate() === actualDayIdx + 1 && selectedDate.getMonth() + 1 === viewMonth && selectedDate.getFullYear() === viewYear;
        const isEditable = isToday || unlockPastDays;
        const isDone = progress[actualDayIdx];
        const weekIdx = i < 28 ? Math.floor(i / 7) : 4;
        const bgClass = isSelected ? "bg-green-100/50" : isToday ? "bg-white" : WEEK_COLORS[weekIdx].replace("200", "50").replace("bg-slate-200", "bg-transparent");
        const cellOpacity = isEditable ? "opacity-100" : "opacity-40 grayscale-[0.5]";
        const checkedBorderClass = WEEK_COLORS[weekIdx].replace("bg-", "border-").replace("200", "500");
        const checkedTextClass = WEEK_COLORS[weekIdx].replace("bg-", "text-").replace("200", "600");

        return (
          <td key={i} className={` border-slate-200/50 border-dotted ${bgClass} ${isToday ? "ring-2 ring-inset ring-green-600/40 bg-green-50/30" : ""} ${isSelected ? "ring-2 ring-inset ring-green-600/30 shadow-inner" : ""} ${cellOpacity} transition-all`}>
            <label className={`w-full h-full flex items-center justify-center p-1 ${isEditable ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
              <input 
                type="checkbox" 
                className="hidden" 
                disabled={!isEditable} 
                checked={isDone || false} 
                onChange={() => isEditable && onToggle(habit.id, actualDayIdx)} 
              />
              <div className={`size-[16px] bg-white border ${isDone ? checkedBorderClass : "border-slate-300"} rounded-sm flex items-center justify-center shadow-sm relative transition-all ${isEditable ? 'hover:border-green-400 hover:shadow-md' : ''} ${!isEditable && !isDone ? "bg-slate-50 border-slate-200 opacity-50" : ""}`}>
                {isDone && (
                  habit.is_mastery ? (
                    <div className="absolute -inset-1 flex items-center justify-center bg-blue-50 rounded-sm border border-blue-200 shadow-sm animate-pulse z-10" title={`Test at ${habit.start_time}`}>
                      <Bell className="text-blue-600 size-[12px]" strokeWidth={3} />
                    </div>
                  ) : (
                    <CheckSquare className={`${checkedTextClass} size-[18px] absolute -top-px -left-px bg-white rounded-sm`} strokeWidth={3} />
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
};

const FastHabitRow = React.memo(HabitRow);

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function TrackerGrid({
  initialHabits = [],
  initialProgress = {},
  onToggle,
  onRefresh,
  isLoading = false,
  viewMonth,
  viewYear,
  selectedDate,
  onSelectDate,
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
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { notify } = useNotifications();
  const { connected, addEvent, editEvent, removeEvent } = useGoogleCalendar();
  const { user, profile, loading } = useSelector(
    (state: RootState) => state.user,
  );

  // --- Real-Time Calendar Logic ---
  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const currentYear = now.getFullYear();
  const currentMonth = currentMonthIdx + 1;
  const today = now.getDate();
  const [enableTask, setEnableTask] = useState(false);
  const monthName = new Date(viewYear, viewMonth - 1).toLocaleString(
    "default",
    { month: "long" },
  );
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const startWeekdayIdx = new Date(viewYear, viewMonth - 1, 1).getDay();
  const [taskDelete, setTaskDelete] = useState(false);
  const [unlockPastDays, setUnlockPastDays] = useState(false);
  const [reminderTest, setReminderTest] = useState<any>(null);
  const [lastTriggeredId, setLastTriggeredId] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'histogram'>('bar');

  // Auto-open modal if requested by parent (e.g. after Fresh Start)
  useEffect(() => {
    if (autoOpenAddModal) {
      setEnableTask(true);
      onModalOpenHandled?.();
    }
  }, [autoOpenAddModal, onModalOpenHandled]);

  // Always show the full month starting from day 1
  const startDay = 1;

  useEffect(() => {
     console.log("%c[CHART] Type changed to:", "color: #12662c; font-weight: bold; font-size: 14px;", chartType);
  }, [chartType]);

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const rotatedDays = days.slice(startDay - 1);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting, isLoading: isStateLoading },
  } = useForm<FormValues>({
    defaultValues: {
      priority: "MEDIUM",
      // category: "theory",
    },
  });

  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSelector, setShowSelector] = useState(false);
  const [isGooglePopupOpen, setIsGooglePopupOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const dailyHours = useMemo(() => {
    const hours = Array(31).fill(0);
    initialHabits.forEach((habit) => {
      if (!habit.start_time || !habit.end_time) return;
      const [sh, sm] = habit.start_time.split(":").map(Number);
      const [eh, em] = habit.end_time.split(":").map(Number);
      const duration = (eh * 60 + em - (sh * 60 + sm)) / 60;
      if (duration <= 0) return;

      const prog = initialProgress[habit.id] || [];
      prog.forEach((done, dayIdx) => {
        if (done) hours[dayIdx] += duration;
      });
    });
    return hours;
  }, [initialHabits, initialProgress]);

  const maxDailyHours = useMemo(() => Math.max(...dailyHours, 1), [dailyHours]);

  const histogramData = useMemo(() => {
    const bins = [
      { label: "0h", count: 0, color: "#94a3b8" },
      { label: "0-2h", count: 0, color: "#3b82f6" },
      { label: "2-4h", count: 0, color: "#a855f7" },
      { label: "4-6h", count: 0, color: "#f97316" },
      { label: "6h+", count: 0, color: "#ef4444" },
    ];
    
    dailyHours.slice(0, daysInMonth).forEach(h => {
      if (h === 0) bins[0].count++;
      else if (h <= 2) bins[1].count++;
      else if (h <= 4) bins[2].count++;
      else if (h <= 6) bins[3].count++;
      else bins[4].count++;
    });
    
    const maxCount = Math.max(...bins.map(b => b.count), 1);
    return { bins, maxCount };
  }, [dailyHours, daysInMonth]);

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

  // --- Real-Time Reminder Monitor ---
  useEffect(() => {
    const checkReminders = () => {
      // Only check if we are viewing the current month/year
      if (viewMonth !== currentMonth || viewYear !== currentYear) return;

      const now = new Date();
      const currentH = now.getHours().toString().padStart(2, "0");
      const currentM = now.getMinutes().toString().padStart(2, "0");
      const currentTimeStr = `${currentH}:${currentM}`;
      const testTodayIdx = now.getDate() - 1;

      habitsWithStreaks.forEach((habit) => {
        if (!habit.is_mastery || !habit.start_time) return;
        
        // Normalize habit.start_time to HH:MM because DB might return HH:MM:SS
        const scheduledTimeStr = habit.start_time.substring(0, 5);
        
        // Check if scheduled for today (initialProgress is indexed by habit.id)
        const isToday = initialProgress[habit.id]?.[testTodayIdx] === true;
        if (!isToday) return;

        // Check if time matches AND we haven't reminded for this test in this minute
        if (scheduledTimeStr === currentTimeStr && lastTriggeredId !== `${habit.id}-${currentTimeStr}`) {
          setReminderTest(habit);
          setLastTriggeredId(`${habit.id}-${currentTimeStr}`);
        }
      });
    };

    const interval = setInterval(checkReminders, 30000); // Check every 30s
    checkReminders(); // Initial check
    return () => clearInterval(interval);
  }, [viewMonth, viewYear, currentMonth, currentYear, habitsWithStreaks, lastTriggeredId, initialProgress]);

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

  const handleProceedToTest = async (test: any) => {
    if (!test.chapter_id || !test.exam_id) return;
    try {
      // We need the subject_id (sid) for the practice test route
      const { data: chapter, error } = await supabase
        .from("chapters")
        .select("subject_id")
        .eq("id", test.chapter_id)
        .single();
      
      if (error) throw error;
      
      const sid = chapter?.subject_id;
      if (sid) {
        navigate(`/user/dashboard/exam/${test.exam_id}/test/${sid}/${test.chapter_id}`);
        setReminderTest(null);
      } else {
        notify({ title: "Error", message: "Could not find subject for this chapter.", status: "error" });
      }
    } catch (err) {
      console.error("Navigation failed:", err);
      notify({ title: "Error", message: "Failed to initiate test session.", status: "error" });
    }
  };

  // --- Helpers ---

  async function handleAddMastery(chapter: any, date: string, startTime: string, endTime: string, syncToCalendar?: boolean) {
    if (!user?.id) return;
    try {
      if (!profile?.planner_start_date) {
        const nowStr = new Date().toISOString();
        await supabase
          .from("profiles")
          .update({ planner_start_date: nowStr })
          .eq("id", user.id);
        dispatch(updateUserLocally({ planner_start_date: nowStr }));
      }

      // Calculate initial progress based on the scheduled date
      const scheduledDate = new Date(date);
      const isCurrentView = scheduledDate.getMonth() + 1 === viewMonth && scheduledDate.getFullYear() === viewYear;
      const initialProgress = Array(31).fill(false);
      if (isCurrentView) {
        const dayIdx = scheduledDate.getDate() - 1;
        if (dayIdx >= 0 && dayIdx < 31) initialProgress[dayIdx] = true;
      }

      const { data: insertedMastery, error: insertError } = await supabase
        .from("user_mastery")
        .insert({
          user_id: user.id,
          chapter_id: chapter.id,
          priority: "MEDIUM",
          start_time: startTime,
          end_time: endTime,
          progress: initialProgress,
          month: viewMonth,
          year: viewYear,
          exam_id: examId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // --- Sync to Google Calendar ---
      if (connected && syncToCalendar && insertedMastery) {
        const [sh, sm] = startTime.split(':').map(Number);
        const [eh, em] = endTime.split(':').map(Number);
        
        const start = new Date(date);
        start.setHours(sh, sm, 0, 0);

        const end = new Date(date);
        end.setHours(eh, em, 0, 0);

        const gcEvent = await addEvent({
          summary: `Test: ${chapter.name || "Study Mastery"}`,
          description: `Scheduled Test for ${chapter.name}. Odisha Exam Prep.`,
          colorId: "5",
          start: { dateTime: start.toISOString(), timeZone: "Asia/Kolkata" },
          end: { dateTime: end.toISOString(), timeZone: "Asia/Kolkata" },
        });

        if (gcEvent?.id) {
          const { data: prof } = await supabase.from("profiles").select("google_calendar_event_ids").eq("id", user.id).single();
          const existingMap = prof?.google_calendar_event_ids ?? {};
          await supabase
            .from("profiles")
            .update({
              google_calendar_event_ids: { ...existingMap, [insertedMastery.id]: gcEvent.id },
            })
            .eq("id", user.id);
          dispatch(updateUserLocally({
            google_calendar_event_ids: { ...existingMap, [insertedMastery.id]: gcEvent.id }
          }));
        }
      }

      notify({ message: "Test scheduled successfully!", title: "Success", status: "success" });
      setShowSelector(false);
      onRefresh();
    } catch (err: any) {
      console.error("Error adding mastery test:", err);
      notify({ message: err.message || "Failed to schedule test", title: "Error", status: "error" });
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

  async function handleManualSync(habit: Habit) {
    if (!connected) {
      setIsGooglePopupOpen(true);
      //   notify({
      //     message:
      //       "Please connect Google Calendar first using the button in the header.",
      //     title: "Please Connect",
      //     status: "info",
      // });
      return;
    }

    if (!user?.id) {
      notify({
        message: "User session not found. Please log in again.",
        title: "Error",
        status: "error",
      });
      return;
    }

    try {
      let execDate = new Date().toISOString().split("T")[0];

      // If it's a mastery test, use the scheduled date instead of "Today"
      if (habit.is_mastery) {
        const prog = initialProgress[habit.id];
        if (prog) {
          const dayIdx = prog.findIndex((x) => x === true);
          if (dayIdx >= 0) {
            const d = new Date(viewYear, viewMonth - 1, dayIdx + 1);
            execDate = d.toISOString().split("T")[0];
          }
        }
      }

      // Ensure we only take HH:mm from time strings (e.g., stripping seconds from "09:00:00")
      const startTimeStr = habit.start_time
        ? habit.start_time.slice(0, 5)
        : "09:00";
      const startDateTime = new Date(`${execDate}T${startTimeStr}:00`);

      let endDateTime: Date;
      if (habit.end_time) {
        const endTimeStr = habit.end_time.slice(0, 5);
        endDateTime = new Date(`${execDate}T${endTimeStr}:00`);
      } else {
        endDateTime = new Date(startDateTime.getTime() + 60 * 60000);
      }

      const existingEventId = profile?.google_calendar_event_ids?.[habit.id];

      if (existingEventId) {
        // Update existing event
        try {
          await editEvent(existingEventId, {
            summary: habit.name,
            start: { dateTime: habit.start_time, timeZone: "Asia/Kolkata" },
            end: { dateTime: habit.end_time, timeZone: "Asia/Kolkata" },
            description: `Study Tracker Task - Priority: ${habit.priority}. Odisha Exam Prep.`,
          });
          notify({
            message: `"${habit.name}" updated in your Google Calendar!`,
            title: "Success",
            status: "success",
          });
        } catch (editError: any) {
          console.error(
            "Edit failed, event might be deleted on Google side:",
            editError,
          );
          // If edit fails (e.g. event deleted on Google), try adding as new
          const gcEvent = await addEvent({
            summary: habit.name,
            description: `Study Tracker Task - Priority: ${habit.priority}. Odisha Exam Prep.`,
            colorId: habit.priority === "HIGH" ? "11" : "1",
            start: {
              dateTime: startDateTime.toISOString(),
              timeZone: "Asia/Kolkata",
            },
            end: {
              dateTime: endDateTime.toISOString(),
              timeZone: "Asia/Kolkata",
            },
          });
          if (gcEvent?.id) {
            const existingMap = profile?.google_calendar_event_ids ?? {};
            await supabase
              .from("profiles")
              .update({
                google_calendar_event_ids: {
                  ...existingMap,
                  [habit.id]: gcEvent.id,
                },
              })
              .eq("id", user.id);
            dispatch(
              updateUserLocally({
                google_calendar_event_ids: {
                  ...existingMap,
                  [habit.id]: gcEvent.id,
                },
              }),
            );
            notify({
              message: `"${habit.name}" re-synced to your Google Calendar!`,
              title: "Success",
              status: "success",
            });
          }
        }
      } else {
        // Add as new event
        const gcEvent = await addEvent({
          summary: habit.name,
          description: `Study Tracker Task - Priority: ${habit.priority}. Odisha Exam Prep.`,
          colorId: habit.priority === "HIGH" ? "11" : "1",
          start: {
            dateTime: startDateTime.toISOString(),
            timeZone: "Asia/Kolkata",
          },
          end: {
            dateTime: endDateTime.toISOString(),
            timeZone: "Asia/Kolkata",
          },
        });

        if (gcEvent?.id) {
          const existingMap = profile?.google_calendar_event_ids ?? {};
          await supabase
            .from("profiles")
            .update({
              google_calendar_event_ids: {
                ...existingMap,
                [habit.id]: gcEvent.id,
              },
            })
            .eq("id", user.id);

          dispatch(
            updateUserLocally({
              google_calendar_event_ids: {
                ...existingMap,
                [habit.id]: gcEvent.id,
              },
            }),
          );
          notify({
            message: `"${habit.name}" added to your Google Calendar!`,
            title: "Success",
            status: "success",
          });
        }
      }
    } catch (e: any) {
      console.error("Manual sync failed:", e);
      alert(`Sync failed: ${e.message || "Unknown error"}. Please try again.`);
    }
  }

  return (
    <div className="text-slate-800 flex flex-col h-full bg-slate-50 min-w-0 relative">
      <GoogleCalendarModal isOpen={isGooglePopupOpen} onClose={() => setIsGooglePopupOpen(false)} />
      
      <AddRoutine 
        isOpen={enableTask} 
        onClose={() => { setEnableTask(false); setEditingHabitId(null); }} 
        editingHabitId={editingHabitId} 
        title={editingHabitId ? "Update Routine" : "Add Routine"} 
        initialHabits={initialHabits} 
        initialProgress={initialProgress}
        examId={examId || ""} 
        viewMonth={viewMonth} 
        viewYear={viewYear} 
        onRefresh={onRefresh} 
        onRequestConnection={() => setIsGooglePopupOpen(true)}
      />
      
      {/* SPREADSHEET HEADER */}
      <div className="bg-[#1a8b3e] text-white flex items-center justify-between px-6 py-4 shadow-md shrink-0">
        <div className="w-1/3 text-4xl md:text-5xl font-black tracking-tighter drop-shadow-sm">{overallProgress}%</div>
        <div className="w-1/3 flex justify-center items-center gap-4">
           <button onClick={() => onMonthChange("prev")} className="p-1 hover:bg-white/20 rounded-full transition-colors cursor-pointer"><ChevronLeft size={28} /></button>
           <h1 className="text-3xl md:text-4xl font-extrabold tracking-wide">{monthName}</h1>
           <button onClick={() => onMonthChange("next")} className="p-1 hover:bg-white/20 rounded-full transition-colors cursor-pointer"><ChevronRight size={28} /></button>
        </div>
        <div className="w-1/3 flex justify-end items-center gap-6">
           {/* Google Calendar Control */}
           <div className="flex items-center">
              <GoogleCalendarButton />
           </div>

           <div className="flex flex-col items-end gap-1">
             <div className="text-2xl font-black italic tracking-tighter drop-shadow-md leading-none text-right flex flex-col items-end">
                <span className="font-cursive tracking-normal text-[#c2f0c2]">OPrep</span><span>Portal.com</span>
             </div>
             <button 
               onClick={() => setUnlockPastDays(!unlockPastDays)}
               className={`text-[9px] px-2 py-1 rounded border uppercase font-bold transition-all ${unlockPastDays ? 'bg-amber-500/20 text-amber-200 border-amber-400/30' : 'bg-transparent text-white/50 border-white/20 hover:bg-black/10 hover:text-white/80'}`}
               title={unlockPastDays ? "Lock past days" : "Unlock past days for editing"}
             >
               {unlockPastDays ? "🔓 Grid Unlocked" : "🔒 Lock Grid"}
             </button>
           </div>
        </div>
      </div>

      {/* MASTER PROGRESS BAR */}
      <div className="w-full bg-[#12662c] h-7 flex items-center px-4 gap-4 shrink-0 overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
         <div className="w-[180px] shrink-0 text-[11px] text-white font-black uppercase flex items-center justify-end drop-shadow-md tracking-wider">Active Days Score</div>
         <div className="flex-1 h-4 bg-black/40 rounded-full overflow-hidden relative border border-white/5 shadow-inner">
            <div 
              className="h-full bg-linear-to-r from-[#3f9947] to-[#55c060] transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(63,153,71,0.6)] relative" 
              style={{ width: `${overallProgress}%` }}
            >
              <div className="absolute inset-0 bg-white/10 animate-pulse" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-[9px] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] tracking-widest">{overallProgress}%</span>
            </div>
         </div>
         <div className="w-16 shrink-0 flex items-center justify-start">
            <span className="text-[10px] font-black text-[#c2f0c2] italic opacity-80">100%</span>
         </div>
      </div>

      {/* SCROLLABLE SPREADSHEET WRAPPER */}
      <div className="flex-1 overflow-auto bg-white relative shadow-inner">
        <table className="w-max min-w-full border-collapse text-xs select-none">
          <thead>
            {/* ROW 1: Active Days Checkboxes */}
            <tr className="bg-[#3f9947]">
               <th className="sticky left-0 z-30 bg-[#3f9947] border-b border-r border-[#2d7334] p-3 text-left w-[300px] align-bottom outline outline-[#1a8b3e]">
                 <h2 className="text-white text-xl font-bold tracking-widest pl-2 uppercase">Habits</h2>
               </th>
               {rotatedDays.map((_, i) => {
                 const actualDayIdx = (startDay - 1 + i) % daysInMonth;
                 const isToday = viewMonth === currentMonth && viewYear === currentYear && actualDayIdx === today - 1;
                 const isAnyDone = initialHabits.some((h) => initialProgress[h.id]?.[actualDayIdx]);
                 return (
                   <th key={i} className={`border-b border-r border-[#2d7334] bg-[#3f9947] w-[32px] min-w-[32px] p-1.5 align-bottom ${isToday ? "bg-white/20" : ""}`}>
                      <div className={`size-4 mx-auto rounded-sm border ${isAnyDone ? "bg-white border-white" : "border-white/50 bg-white/10"} flex items-center justify-center`}>
                        {isAnyDone && <CheckSquare className="text-[#3f9947] size-4 absolute" strokeWidth={3} />}
                      </div>
                   </th>
                 );
               })}
               <th colSpan={2} className="sticky right-0 z-30 bg-[#3f9947] text-white border-b border-l border-[#2d7334] p-1 text-center font-bold outline outline-[#1a8b3e]">Streaks</th>
            </tr>

            {/* ROW 2: Daily Done % Charts */}
            <tr>
               <th className="sticky left-0 z-30 bg-white border-r border-b border-slate-200 px-2 py-1 align-top outline outline-slate-200">
                 <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-3 flex justify-between">
                    <button onClick={() => setEnableTask(true)} className="text-[10px] w-full bg-white text-green-700 border-green-200 border px-1 py-1.5 rounded-md hover:bg-green-50 flex items-center justify-center font-bold transition-all active:scale-95"><Plus size={12}/> Routine</button>
                    <button onClick={() => setShowSelector(true)} className="text-[10px] w-full ml-1 bg-white text-blue-700 border-blue-200 border px-1 py-1.5 rounded-md hover:bg-blue-50 flex items-center justify-center font-bold transition-all active:scale-95"><Plus size={12}/> Schedule Test</button>
                 </div>
               </th>
               {rotatedDays.map((_, i) => {
                 const weekIdx = i < 28 ? Math.floor(i / 7) : 4;
                 const bgClass = WEEK_COLORS[weekIdx].replace("300", "300");
                 const barClass = WEEK_COLORS[weekIdx].replace("300", "500");
                 return (
                   <th key={i} className={` ${bgClass} h-20 p-0 align-bottom relative`}>
                      <div className="absolute top-1 inset-x-0 text-[8px] font-bold text-slate-500 text-center scale-90">{dailyStats[i].percent}%</div>
                      <div className={`mx-auto w-[12px] ${barClass} opacity-80 rounded-t-sm`} style={{ height: `${dailyStats[i].percent-30}%` }}></div>
                   </th>
                 );
               })}
               <th className="sticky right-8 z-30 border-l border-r border-b border-[#2d7334] bg-[#3f9947] text-white text-[9px] w-[32px] p-1 outline outline-[#1a8b3e]">Current</th>
               <th className="sticky right-0 z-30 border-b border-[#2d7334] bg-[#3f9947] text-white text-[9px] w-[32px] p-1 outline outline-[#1a8b3e]">Max</th>
            </tr>

            {/* ROW 3: Days Headers */}
            <tr>
               <th className="sticky left-0 z-30 bg-white border-r border-b border-slate-300 outline outline-slate-200"></th>
                {rotatedDays.map((day, i) => {
                  const weekIdx = i < 28 ? Math.floor(i / 7) : 4;
                  const bgClass = WEEK_COLORS[weekIdx].replace("200", "100");
                  const weekdayIdx = (startWeekdayIdx + (day - 1)) % 7;
                  const actualDayIdx = (startDay - 1 + i) % daysInMonth;
                  const isToday = viewMonth === currentMonth && viewYear === currentYear && actualDayIdx === today - 1;
                  const isSelected = selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() + 1 === viewMonth && selectedDate.getFullYear() === viewYear;
                  
                  return (
                    <th 
                      key={i} 
                      onClick={() => onSelectDate?.(new Date(viewYear, viewMonth - 1, day))}
                      className={` ${bgClass} p-0.5 text-center font-normal cursor-pointer transition-all hover:brightness-95 ${isSelected ? "ring-2 ring-inset ring-green-600 font-black bg-green-200" : isToday ? "ring-2 ring-inset ring-green-600/60 font-black bg-green-200" : ""}`}
                    >
                      <div className={`text-[9px] font-bold ${isSelected ? "text-green-800" : "text-slate-500"}`}>{WEEKDAY_NAMES[weekdayIdx]}</div>
                      <div className={`text-[11px] font-black ${isSelected ? "text-green-900 scale-110" : "text-slate-700"}`}>{day}</div>
                    </th>
                  );
                })}
               <th colSpan={2} className="sticky right-0 z-30 bg-slate-100 border-b border-slate-300 border-l outline outline-slate-200"></th>
            </tr>
          </thead>

          <tbody>
            {(isLoading && initialHabits.length === 0) ? (
               <tr><td colSpan={rotatedDays.length + 3} className="p-10 text-center"><Loader className="animate-spin text-slate-400 mx-auto"/></td></tr>
             ) : isSettingUp && initialHabits.length === 0 ? (
               <tr>
                 <td colSpan={rotatedDays.length + 3} className="p-0 align-middle border-none">
                    <div className="sticky left-0  right-0 mx-auto w-fit flex flex-col items-center justify-center min-h-[450px] py-12 pointer-events-none">
                      <div className="pointer-events-auto mx-auto max-w-md bg-white rounded-2xl shadow-lg border border-emerald-100 p-6 text-center my-4">
                        <div className="mx-auto size-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
                           <Sparkles className="text-emerald-600 size-6" />
                        </div>
                        <h3 className="text-xl font-black tracking-tight text-slate-800 mb-1.5">Fresh Month, Fresh Start!</h3>
                        <p className="text-slate-500 font-medium text-xs mb-6 px-2">
                           Your {monthName} planner is empty. Set up routines and tests to stay on track.
                        </p>
                        
                        <div className="space-y-3 text-left">
                           <button 
                             onClick={() => setEnableTask(true)}
                             className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-emerald-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all group cursor-pointer"
                           >
                              <div className="size-10 bg-white rounded-lg hidden sm:flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition-transform">
                                 <Calendar size={18} />
                              </div>
                              <div>
                                 <h4 className="font-black text-slate-800 uppercase tracking-wide text-xs">Add Daily Routine</h4>
                                 <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Build consistent habits</p>
                              </div>
                              <ChevronRight className="ml-auto size-4 text-slate-300 group-hover:text-emerald-500" />
                           </button>

                           <button 
                             onClick={() => setShowSelector(true)}
                             className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-blue-100 hover:border-blue-500 hover:bg-blue-50 transition-all group cursor-pointer"
                           >
                              <div className="size-10 bg-white rounded-lg hidden sm:flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
                                 <BookOpen size={18} />
                              </div>
                              <div>
                                 <h4 className="font-black text-slate-800 uppercase tracking-wide text-xs">Schedule Test</h4>
                                 <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Test your mastery</p>
                              </div>
                              <ChevronRight className="ml-auto size-4 text-slate-300 group-hover:text-blue-500" />
                           </button>

                           {hasPrevMonthTasks && onCopyPrevious && (
                             <button 
                               onClick={onCopyPrevious}
                               className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-purple-100 hover:border-purple-500 hover:bg-purple-50 transition-all group cursor-pointer"
                             >
                                <div className="size-10 bg-white rounded-lg hidden sm:flex items-center justify-center text-purple-600 shadow-sm group-hover:scale-110 transition-transform">
                                   <Copy size={18} />
                                </div>
                                <div>
                                   <h4 className="font-black text-slate-800 uppercase tracking-wide text-xs">Copy Previous</h4>
                                   <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Rollover routines</p>
                                </div>
                                <ChevronRight className="ml-auto size-4 text-slate-300 group-hover:text-purple-500" />
                             </button>
                           )}
                        </div>
                        
                        <div className="mt-5 pt-4 border-t border-slate-100">
                           <button onClick={onStartFresh} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors cursor-pointer">
                              Or just look around for now
                           </button>
                        </div>
                      </div>
                    </div>
                 </td>
               </tr>
            ) : habitsWithStreaks.length === 0 ? (
               <tr>
                 <td colSpan={rotatedDays.length + 3} className="p-8 text-center text-slate-400 font-bold text-sm">
                   No routines or tests found. Click the + buttons above to add some!
                 </td>
               </tr>
              ) : habitsWithStreaks.map((habit) => (
                <FastHabitRow 
                  key={habit.id}
                  habit={habit}
                  progress={initialProgress[habit.id] || []}
                  rotatedDays={rotatedDays}
                  startDay={startDay}
                  daysInMonth={daysInMonth}
                  viewMonth={viewMonth}
                  viewYear={viewYear}
                  currentMonth={currentMonth}
                  currentYear={currentYear}
                  today={today}
                  unlockPastDays={unlockPastDays}
                  deletingId={deletingId}
                  connected={connected}
                  user={user}
                  selectedDate={selectedDate}
                  onToggle={onToggle}
                  editHabit={editHabit}
                  removeEvent={removeEvent}
                  onRefresh={onRefresh}
                  dispatch={dispatch}
                />
              ))}
          </tbody>

          {/* SPREADSHEET FOOTER: WEEKLY DONE % */}
          <tfoot>
             <tr>
               <td className="sticky left-0 z-30 bg-white border-r border-t border-slate-300 p-2 align-middle text-right h-[120px] outline outline-1 outline-slate-200">
                 <span className="font-bold text-[10px] uppercase text-slate-400">Weekly Done %</span>
               </td>
               <td colSpan={7} className="border-t border-white bg-blue-300 relative align-middle"><center><DonutChart percent={weeklyProgress[0]} color="#60a5fa" bg="bg-blue-100" label="Week 1" /></center></td>
               <td colSpan={7} className="border-t border-white bg-purple-300 relative align-middle"><center><DonutChart percent={weeklyProgress[1]} color="#c084fc" bg="bg-purple-100" label="Week 2" /></center></td>
               <td colSpan={7} className="border-t border-white bg-red-300 relative align-middle"><center><DonutChart percent={weeklyProgress[2]} color="#f87171" bg="bg-red-100" label="Week 3" /></center></td>
               <td colSpan={7} className="border-t border-white bg-orange-300 relative align-middle"><center><DonutChart percent={weeklyProgress[3]} color="#fb923c" bg="bg-orange-100" label="Week 4" /></center></td>
               <td colSpan={daysInMonth - 28} className="border-t border-white bg-slate-300 relative align-middle"><center><DonutChart percent={weeklyProgress[4]} color="#94a3b8" bg="bg-slate-100" label={`Extra`} /></center></td>
               <td colSpan={2} className="sticky right-0 z-30 bg-white border-l border-t border-slate-300 outline outline-slate-200"></td>
             </tr>
          </tfoot>
        </table>
      </div>

      {showSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSelector(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded shadow-2xl overflow-hidden p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black tracking-tight text-slate-800">Schedule Chapter Test</h3>
              <button className="p-2 hover:bg-slate-100 rounded-full" onClick={() => setShowSelector(false)}><X size={20} /></button>
            </div>
            <MasterySelector 
                examId={examId || ""} 
                onAdd={handleAddMastery} 
                existingIds={initialHabits.filter((h) => h.is_mastery).map((h) => h.chapter_id!)} 
                onRequestConnection={() => setIsGooglePopupOpen(true)}
            />
          </div>
        </div>
      )}

      {/* STUDY HOURS GRAPH SECTION */}
      <div className="mt-12 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-[#12662c] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <Clock className="text-white" size={20} />
             <h3 className="text-white font-black uppercase tracking-widest text-sm">Study Hours Analysis</h3>
          </div>

          {/* CHART TYPE TOGGLE */}
          <div className="flex bg-black/20 p-1 rounded-xl backdrop-blur-md">
             <button 
               onClick={() => setChartType('bar')}
               className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${chartType === 'bar' ? 'bg-white text-[#12662c] shadow-lg' : 'text-white/60 hover:text-white'}`}
             >
                <BarChart2 size={14} /> <span>Bar</span>
             </button>
             <button 
               onClick={() => setChartType('line')}
               className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${chartType === 'line' ? 'bg-white text-[#12662c] shadow-lg' : 'text-white/60 hover:text-white'}`}
             >
                <LineChart size={14} /> <span>Line</span>
             </button>
             <button 
               onClick={() => setChartType('histogram')}
               className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${chartType === 'histogram' ? 'bg-white text-[#12662c] shadow-lg' : 'text-white/60 hover:text-white'}`}
             >
                <Activity size={14} /> <span>Distro</span>
             </button>
          </div>
        </div>
        
        <div className="p-8">
           <div className="h-[250px] w-full relative pt-6">
              {chartType === 'bar' && (
                <div className="h-full w-full flex items-end gap-[2px] md:gap-1 lg:gap-1.5 relative border-b border-slate-100">
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[8px] font-black text-slate-300 uppercase pointer-events-none">
                     <span>{Math.ceil(maxDailyHours)}h</span>
                     <span>{Math.ceil(maxDailyHours/2)}h</span>
                     <span>0h</span>
                  </div>

                  {dailyHours.slice(0, daysInMonth).map((h, i) => {
                    const height = (h / maxDailyHours) * 100;
                    const weekIdx = i < 28 ? Math.floor(i / 7) : 4;
                    const WEEK_BASE_HEX = ["#3b82f6", "#a855f7", "#ef4444", "#f97316", "#64748b"];
                    const barColor = WEEK_BASE_HEX[weekIdx];
                    
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                         <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none whitespace-nowrap shadow-xl">
                            Day {i+1}: {h.toFixed(1)}h
                         </div>
                         <div 
                           className="w-full rounded-t-sm transition-all duration-500 ease-out group-hover:brightness-110 group-hover:scale-x-110 shadow-sm"
                           style={{ 
                             height: `${height}%`, 
                             backgroundColor: h > 0 ? undefined : '#f1f5f9',
                             background: h > 0 ? `linear-gradient(to top, ${barColor}, ${barColor}dd)` : undefined
                           }}
                         />
                         <span className="text-[7px] font-black text-slate-400 mt-2 group-hover:text-slate-600 transition-colors">{i+1}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {chartType === 'line' && (
                <div className="h-full w-full relative">
                  <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[8px] font-black text-slate-300 uppercase pointer-events-none pr-4 border-r border-slate-100">
                     <span>{Math.ceil(maxDailyHours)}h</span>
                     <span>{Math.ceil(maxDailyHours/2)}h</span>
                     <span>0h</span>
                  </div>
                  <div className="ml-8 h-full relative">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 250" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
                        </linearGradient>
                      </defs>
                      <path 
                        d={`M 0 250 ${dailyHours.slice(0, (daysInMonth || 31)).map((h, i) => {
                          const x = (i / ((daysInMonth || 31) - 1)) * 1000;
                          const y = 250 - (h / maxDailyHours) * 250;
                          return `L ${x} ${y}`;
                        }).join(' ')} L 1000 250 Z`}
                        fill="url(#areaGradient)"
                      />
                      <path 
                        d={`M ${dailyHours.slice(0, (daysInMonth || 31)).map((h, i) => {
                          const x = (i / ((daysInMonth || 31) - 1)) * 1000;
                          const y = 250 - (h / maxDailyHours) * 250;
                          return i === 0 ? `${x} ${y}` : `L ${x} ${y}`;
                        }).join(' ')}`}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* Data dots */}
                      {dailyHours.slice(0, (daysInMonth || 31)).map((h, i) => {
                        const x = (i / ((daysInMonth || 31) - 1)) * 1000;
                        const y = 250 - (h / maxDailyHours) * 250;
                        return (
                          <circle 
                            key={i} 
                            cx={x} 
                            cy={y} 
                            r="5" 
                            fill={h > 0 ? "#3b82f6" : "#cbd5e1"} 
                            stroke="white" 
                            strokeWidth="2.5"
                            className="transition-all hover:r-8 cursor-help"
                          />
                        );
                      })}
                    </svg>

                    {/* Interactive Tooltip Overlay */}
                    <div className="absolute inset-0 flex items-center justify-between pointer-events-none">
                      {dailyHours.slice(0, (daysInMonth || 31)).map((h, i) => {
                        const y = 250 - (h / maxDailyHours) * 250;
                        return (
                          <div key={i} className="flex-1 h-full relative group pointer-events-auto">
                             <div 
                               className="absolute bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none whitespace-nowrap shadow-xl"
                               style={{ 
                                 left: '50%', 
                                 transform: 'translateX(-50%)', 
                                 top: `${(y / 250) * 100}%`,
                                 marginTop: '-35px'
                               }}
                             >
                                Day {i+1}: {h.toFixed(1)}h
                             </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {chartType === 'histogram' && (
                <div className="h-full w-full flex items-end gap-4 px-4 border-b border-slate-100">
                   {/* Y-axis labels (for histogram, it's day frequency) */}
                   <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[8px] font-black text-slate-300 uppercase pointer-events-none pr-2">
                     <span>{histogramData.maxCount}d</span>
                     <span>{Math.ceil(histogramData.maxCount/2)}d</span>
                     <span>0d</span>
                  </div>
                  
                  {histogramData.bins.map((bin, i) => {
                    const height = (bin.count / histogramData.maxCount) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                         <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-bold px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none whitespace-nowrap shadow-xl">
                            {bin.count} {bin.count === 1 ? 'day' : 'days'}
                         </div>
                         <div 
                           className="w-full rounded-t-xl transition-all duration-500 ease-out hover:brightness-110 shadow-lg"
                           style={{ 
                             height: `${height}%`, 
                             backgroundColor: bin.color,
                             background: `linear-gradient(to top, ${bin.color}, ${bin.color}dd)`
                           }}
                         >
                            {bin.count > 0 && (
                              <div className="absolute inset-x-0 bottom-2 text-white font-black text-[10px] text-center drop-shadow-md">{bin.count}</div>
                            )}
                         </div>
                         <span className="text-[9px] font-black text-slate-400 mt-3 group-hover:text-slate-600 transition-colors uppercase tracking-widest">{bin.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
           </div>
           
           <div className="mt-8 flex flex-wrap gap-6 justify-center">
              {chartType === 'bar' ? (
                WEEK_COLORS.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                     <div className={`size-2.5 rounded-full ${c} shadow-sm`} />
                     <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Week {idx+1}</span>
                  </div>
                ))
              ) : chartType === 'histogram' ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-2xl border border-blue-100">
                   <Trophy size={16} className="text-blue-600" />
                   <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">
                     Day frequency by study time range
                   </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-700">
                   <Sparkles size={16} />
                   <span className="text-[10px] font-black uppercase tracking-widest">Studying Momentum Trend</span>
                </div>
              )}
           </div>
        </div>
      </div>
      {/* TEST REMINDER POPUP */}
      {reminderTest && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm shadow-2xl" onClick={() => setReminderTest(null)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-blue-100 animate-in fade-in zoom-in duration-300">
             <div className="bg-blue-600 p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                   <Bell className="text-blue-400 opacity-20 rotate-12" size={120} />
                </div>
                <div className="relative z-10">
                   <div className="size-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                      <Bell className="text-white animate-bounce" size={32} />
                   </div>
                   <h3 className="text-2xl font-black text-white uppercase tracking-tight">Test Reminder</h3>
                   <p className="text-blue-100 font-bold text-sm mt-1">Your scheduled test is starting now!</p>
                </div>
             </div>
             
             <div className="p-8">
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-8">
                   <div className="flex items-center gap-4 mb-4">
                      <div className="size-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                         <Book size={20} />
                      </div>
                      <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chapter Name</p>
                         <h4 className="text-lg font-black text-slate-800 leading-tight">{reminderTest.name}</h4>
                      </div>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="size-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                         <Clock size={20} />
                      </div>
                      <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scheduled For</p>
                         <h4 className="text-lg font-black text-slate-800 leading-tight">{format12h(reminderTest.start_time)}</h4>
                      </div>
                   </div>
                </div>

                <div className="flex gap-4 mb-4">
                   <button 
                     onClick={() => {
                        editHabit(reminderTest);
                        setReminderTest(null);
                     }}
                     className="flex-1 px-6 py-4 rounded-2xl border-2 border-slate-900 bg-white text-slate-900 font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all active:scale-95"
                   >
                      Change Date/Time
                   </button>
                   <button 
                     onClick={() => handleProceedToTest(reminderTest)}
                     className="flex-1 px-6 py-4 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95"
                   >
                      Proceed to Test
                   </button>
                </div>
                
                <p className="text-center text-[10px] font-bold text-slate-400 px-4">
                   * To dismiss this alert, you must either start the test or reschedule it for a later time.
                </p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

const DonutChart = ({percent, color, label}: {percent: number, color: string, bg: string, label: string}) => (
  <div className="flex flex-col items-center gap-4 group">
    <div className="relative p-3 size-[150px]">
      <svg className="size-full" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="12" />
        <circle cx="50" cy="50" r="40" fill="none" stroke={"#ffffff"} strokeWidth="12" strokeDasharray={`${percent * 2.51}, 251`} strokeLinecap="butt" transform="rotate(-90 50 50)" className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center"><span className="text-[20px] font-black">{percent}%</span></div>
    </div>
  </div>
);

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
          <Button
            onClick={() => {}}
            className={" bg-red-500!"}
            title={"Delete"}
          />
        </>
      }
    />
  );
};
