import {
  Infinity as InfinityIcon,
  Plus,
  CheckSquare,
  ChevronRight,
  ChevronLeft,
  Sparkles,
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
import { AddRoutine } from "./AddRoutine"; // Note: file still named AddTask for now
import { useGoogleCalendar } from "../../utils/useGoogleCalender";
import { useNotifications } from "reapop";
import { WarningModal } from "../ui/WarningModal";
import { PopupModal } from "../PopupModal";
import { GoogleCalendarButton } from "../ui/GoogleCalenderButton";
import GoogleCalendarModal from "./GoogleCalendarModal";
import { HabitRow } from "./HabitRow";
import { format12h } from "../../utils/format12h";
import { PieChart } from "./PieChart";


type Priority = "HIGH" | "MEDIUM" | "LOW";
type Category = "theory" | "mcq" | "revision" | "mock";

export interface Habit {
  id: string;
  name: string;
  priority: Priority;
  category: Category;
  start_time?: string;
  exam_id?: string; 
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
  initialUseChapter?: boolean;
  editingHabitId?: string | null;
  setEditingHabitId?: (id: string | null) => void;
  setShowSelector?: (show: boolean) => void;
}

export const WEEK_COLORS = ["bg-green-300", "bg-purple-300", "bg-red-300", "bg-orange-300", "bg-slate-300"];





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
  onShowMastery,
  onShowAddTask,
  initialUseChapter,
  editingHabitId,
  setEditingHabitId,
  setShowSelector,
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

  // Always show the full month starting from day 1
  const startDay = 1;
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const rotatedDays = days.slice(startDay - 1);

  // --- View Mode State (Weekly/Monthly) ---
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly'>('monthly');
  const [activeWeek, setActiveWeek] = useState(0);

  // Default active week to current date when viewing current month
  useEffect(() => {
    if (viewMonth === currentMonth && viewYear === currentYear) {
      const weekIdx = Math.floor((today - 1) / 7);
      setActiveWeek(Math.min(weekIdx, 4));
    } else {
      setActiveWeek(0);
    }
  }, [viewMonth, viewYear, currentMonth, currentYear, today]);

  const renderedDays = useMemo(() => {
    if (viewMode === 'monthly') return rotatedDays;
    const start = activeWeek * 7;
    // For week 4 (extra days), we show remaining days in month
    if (activeWeek === 4) return rotatedDays.slice(28);
    return rotatedDays.slice(start, start + 7);
  }, [viewMode, activeWeek, rotatedDays]);

  useEffect(() => {
    console.log("%c[CHART] Type changed to:", "color: #12662c; font-weight: bold; font-size: 14px;", chartType);
  }, [chartType]);

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

  const [searchTerm, setSearchTerm] = useState("");
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
      setShowSelector?.(false);
      onRefresh();
    } catch (err: any) {
      console.error("Error adding mastery test:", err);
      notify({ message: err.message || "Failed to schedule test", title: "Error", status: "error" });
    }
  }


  function editHabit(habit: Habit) {
    onModalOpenHandled?.();
    if (setEditingHabitId) {
      setEditingHabitId(habit.id);
      onShowAddTask?.();
    }
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
    <div className="flex flex-col text-on-surface w-full h-full bg-surface-container-low min-w-0 relative animate-in fade-in duration-700">
      <GoogleCalendarModal isOpen={isGooglePopupOpen} onClose={() => setIsGooglePopupOpen(false)} />

      {/* SPREADSHEET HEADER */}
      {/* SPREADSHEET HEADER: Editorial Botanical */}
      <div className="bg-primary text-on-primary flex items-center justify-between px-8 py-6 shadow-ambient shrink-0 relative">
        <div className="absolute z-100 top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Calendar color="" size={120} />
        </div>
        <div className="w-1/3 flex flex-col relative z-10">
          <span className="text-[10px] font-technical font-black tracking-[0.4em] uppercase opacity-60 mb-1">Current Momentum</span>
          <div className="text-6xl font-technical font-black tracking-tighter leading-none">{overallProgress}%</div>
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
                  setActiveWeek(4); // Go to last week of prev month
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
                  setActiveWeek(0); // Go to first week of next month
                }
              }
            }}
            className="p-2 hover:bg-white/10 rounded-full transition-all cursor-pointer active:scale-90"
          >
            <ChevronRight size={32} />
          </button>
        </div>

        <div className="w-1/3 flex justify-end items-center gap-4 relative z-10">
          {/* View Mode Toggle */}
          <div className="flex bg-white/10 p-1 rounded-xl border border-white/10 mr-4">
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-technical font-black uppercase tracking-widest transition-all ${viewMode === 'monthly' ? 'bg-white text-primary shadow-sm' : 'text-white/40 hover:text-white'}`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-technical font-black uppercase tracking-widest transition-all ${viewMode === 'weekly' ? 'bg-white text-primary shadow-sm' : 'text-white/40 hover:text-white'}`}
            >
              Week
            </button>
          </div>

          <GoogleCalendarButton />

          <div className="flex flex-col items-end gap-2 px-6 border-l border-white/10 ml-4">
            <div className="text-2xl font-black tracking-tighter leading-none text-right flex flex-col items-end">
              <span className="text-[10px] font-technical uppercase tracking-[0.2em] opacity-40">OPrep Portal</span>
              <span className="font-narrative italic text-secondary-container">Botanical</span>
            </div>
            <button
              onClick={() => setUnlockPastDays(!unlockPastDays)}
              className={`text-[9px] px-3 py-1.5 rounded-full border uppercase font-technical font-black transition-all ${unlockPastDays ? 'bg-tertiary/30 text-white border-tertiary shadow-lg' : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white'}`}
              title={unlockPastDays ? "Lock past days" : "Unlock past days for editing"}
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

      {/* SCROLLABLE SPREADSHEET WRAPPER */}
      <div className="flex-1 overflow-auto bg-surface relative shadow-inner">
        <table className="w-max min-w-full border-collapse text-xs select-none">
          <thead>
            {/* ROW 1: Active Days Checkboxes */}
            <tr className="bg-primary">
              <th className="sticky left-0 z-30 bg-primary border-b border-white/10 p-4 text-left w-[360px] align-bottom">
                <h2 className="text-white text-xs font-technical font-black tracking-[0.4em] pl-4 uppercase opacity-60">Syllabus Routines</h2>
              </th>
              {renderedDays.map((day) => {
                const actualDayIdx = day - 1;
                const isToday = viewMonth === currentMonth && viewYear === currentYear && (actualDayIdx + 1) === today;
                const isAnyDone = initialHabits.some((h) => initialProgress[h.id]?.[actualDayIdx]);
                return (
                  <th key={actualDayIdx} className={`border-b border-white/5 bg-primary w-[36px] min-w-[36px] p-2 align-bottom ${isToday ? "bg-white/10" : ""}`}>
                    <div className={`size-5 mx-auto rounded-lg border-2 transition-all duration-500 ${isAnyDone ? "bg-white border-white rotate-0" : "border-white/20 bg-white/5 rotate-45 scale-75"} flex items-center justify-center`}>
                      {isAnyDone && <CheckSquare className="text-primary size-4 absolute" strokeWidth={3} />}
                    </div>
                  </th>
                );
              })}
              <th colSpan={2} className="sticky right-0 z-30 bg-primary text-white border-b border-white/10 p-1 text-center font-technical font-black uppercase text-[10px] tracking-widest">Streaks</th>
            </tr>

            {/* ROW 2: Daily Done % Charts */}
            <tr className="bg-surface">
              <th className="sticky left-0 z-30 bg-surface-container-high border-b border-outline-variant/5 px-2 py-4 align-top">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-4 flex justify-between gap-2">
                  <button onClick={onShowAddTask} className="flex-1 text-[10px] bg-primary/10 text-primary px-3 py-2 rounded-full hover:bg-primary hover:text-white flex items-center justify-center font-technical font-black tracking-widest transition-all active:scale-95 shadow-sm"><Plus size={14} className="mr-1" /> Routine</button>
                  <button onClick={onShowMastery} className="flex-1 text-[10px] bg-tertiary/10 text-tertiary px-3 py-2 rounded-full hover:bg-tertiary hover:text-white flex items-center justify-center font-technical font-black tracking-widest transition-all active:scale-95 shadow-sm"><Plus size={14} className="mr-1" /> Test</button>
                </div>
              </th>
              {renderedDays.map((day) => {
                const actualDayIdx = day - 1;
                const weekIdx = Math.floor(actualDayIdx / 7);
                const bgClass = WEEK_COLORS[Math.min(weekIdx, 4)];
                const barColor = (weekIdx % 2 === 0) ? "bg-primary" : "bg-tertiary";

                return (
                  <th key={actualDayIdx} className={` ${bgClass} h-24 p-0 align-bottom relative  bg-surface-container-high border-b border-outline-variant/100 group`}>
                    <div className="absolute top-2 inset-x-0 text-[10px] font-technical font-black text-on-surface-variant text-center opacity-0 group-hover:opacity-100 transition-opacity">{dailyStats[actualDayIdx].percent}%</div>
                    <div className={`mx-auto w-[16px] ${barColor} opacity-40 rounded-t-lg transition-all duration-700 hover:opacity-100 shadow-sm`} style={{ height: `${dailyStats[actualDayIdx].percent - 10}%` }}></div>
                  </th>
                );
              })}
              <th className="sticky right-10 z-30 bg-primary/20 text-primary text-[9px] font-technical font-black uppercase tracking-widest w-[40px] p-2 border-b border-outline-variant/10">Now</th>
              <th className="sticky right-0 z-30 bg-primary/10 text-primary text-[9px] font-technical font-black uppercase tracking-widest w-[40px] p-2 border-b border-outline-variant/10">Peak</th>
            </tr>

            {/* ROW 3: Days Headers */}
            <tr>
              <th className="sticky left-0 z-30 bg-surface-container-high border border-on-surface/20 p-0">
                <div className="grid grid-cols-[160px_70px_70px] items-center gap-2 px-2 h-full uppercase font-technical font-black text-[8px] text-on-surface/40 tracking-widest">
                  <div className="pl-1">Routine & Priority</div>
                  <div>Start</div>
                  <div>End</div>
                </div>
              </th>
              {renderedDays.map((day) => {
                const actualDayIdx = day - 1;
                const weekIdx = Math.floor(actualDayIdx / 7);
                const bgClass = WEEK_COLORS[Math.min(weekIdx, 4)].replace("200", "100");
                const weekdayIdx = (startWeekdayIdx + (day - 1)) % 7;
                const isToday = viewMonth === currentMonth && viewYear === currentYear && (actualDayIdx + 1) === today;
                const isSelected = selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() + 1 === viewMonth && selectedDate.getFullYear() === viewYear;

                return (
                  <th
                    key={actualDayIdx}
                    onClick={() => onSelectDate?.(new Date(viewYear, viewMonth - 1, day))}
                    className={` ${bgClass} p-0.5 text-center font-normal cursor-pointer transition-all hover:brightness-95 ${isSelected ? "ring-2 ring-inset ring-green-600 font-black bg-green-200" : isToday ? "ring-2 ring-inset ring-green-600/60 font-black bg-green-200" : ""}`}
                  >
                    <div className={`text-[9px] font-bold ${isSelected ? "text-green-800" : "text-on-surface-variant"}`}>{WEEKDAY_NAMES[weekdayIdx]}</div>
                    <div className={`text-[11px] font-black ${isSelected ? "text-green-900 scale-110" : "text-slate-700"}`}>{day}</div>
                  </th>
                );
              })}
              <th colSpan={2} className="sticky right-0 z-30 bg-surface-container-high border-b border-slate-300 border-l"></th>
            </tr>
          </thead>

          <tbody>
            {(isLoading && initialHabits.length === 0) ? (
              <tr><td colSpan={renderedDays.length + 3} className="p-10 text-center"><Loader className="animate-spin text-slate-400 mx-auto" /></td></tr>
            ) : isSettingUp && initialHabits.length === 0 ? (
              <tr>
                <td colSpan={renderedDays.length + 3} className="p-0 align-middle border-none">
                  <div className="sticky left-0  right-0 mx-auto w-fit flex flex-col items-center justify-center min-h-[450px] py-12 pointer-events-none">
                    <div className="pointer-events-auto mx-auto max-w-md bg-surface rounded-2xl shadow-lg border border-emerald-100 p-6 text-center my-4">
                      <div className="mx-auto size-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
                        <Sparkles className="text-emerald-600 size-6" />
                      </div>
                      <h3 className="text-xl font-black tracking-tight text-slate-800 mb-1.5">Fresh Month, Fresh Routines!</h3>
                      <p className="text-on-surface-variant font-medium text-xs mb-6 px-2">
                        Your {monthName} tracker for monthly habits is empty. Set up recurring routines to build consistency.
                      </p>

                      <div className="space-y-3 text-left">
                        <button
                          onClick={onShowAddTask}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-emerald-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all group cursor-pointer"
                        >
                          <div className="size-10 bg-surface rounded-lg hidden sm:flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition-transform">
                            <Calendar size={18} />
                          </div>
                          <div>
                            <h4 className="font-black text-slate-800 uppercase tracking-wide text-xs">Add Daily Routine</h4>
                            <p className="text-[9px] text-on-surface-variant font-bold uppercase tracking-widest mt-0.5">Build consistent habits</p>
                          </div>
                          <ChevronRight className="ml-auto size-4 text-slate-300 group-hover:text-emerald-500" />
                        </button>

                        <button
                          onClick={onShowMastery}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-green-100 hover:border-primary hover:bg-green-50 transition-all group cursor-pointer"
                        >
                          <div className="size-10 bg-surface rounded-lg hidden sm:flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">
                            <BookOpen size={18} />
                          </div>
                          <div>
                            <h4 className="font-black text-slate-800 uppercase tracking-wide text-xs">Schedule Test</h4>
                            <p className="text-[9px] text-on-surface-variant font-bold uppercase tracking-widest mt-0.5">Test your mastery</p>
                          </div>
                          <ChevronRight className="ml-auto size-4 text-slate-300 group-hover:text-primary" />
                        </button>

                        {hasPrevMonthTasks && onCopyPrevious && (
                          <button
                            onClick={onCopyPrevious}
                            className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-purple-100 hover:border-purple-500 hover:bg-purple-50 transition-all group cursor-pointer"
                          >
                            <div className="size-10 bg-surface rounded-lg hidden sm:flex items-center justify-center text-purple-600 shadow-sm group-hover:scale-110 transition-transform">
                              <Copy size={18} />
                            </div>
                            <div>
                              <h4 className="font-black text-slate-800 uppercase tracking-wide text-xs">Copy Previous</h4>
                              <p className="text-[9px] text-on-surface-variant font-bold uppercase tracking-widest mt-0.5">Rollover routines</p>
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
                <td colSpan={renderedDays.length + 3} className="p-8 text-center text-slate-400 font-bold text-sm">
                  No routines found for this cycle. Use the "+ Routine" button above to manifest your rituals.
                </td>
              </tr>
            ) : habitsWithStreaks.map((habit) => (
              <FastHabitRow
                key={habit.id}
                habit={habit}
                progress={initialProgress[habit.id] || []}
                renderedDays={renderedDays}
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

          <tfoot>
            <tr>
              <td className="sticky left-0 z-30 bg-surface-container-high border-r border-t border-slate-300 p-2 align-middle text-right h-[120px]">
                <span className="font-bold text-[10px] uppercase text-slate-400">Weekly Done %</span>
              </td>
              {viewMode === 'monthly' ? (
                <>
                  <td colSpan={7} className="border-t border-white bg-green-300 relative align-middle"><center><PieChart percent={weeklyProgress[0]} color="#60a5fa" bg="bg-primary/10" label="Week 1" /></center></td>
                  <td colSpan={7} className="border-t border-white bg-purple-300 relative align-middle"><center><PieChart percent={weeklyProgress[1]} color="#c084fc" bg="bg-purple-100" label="Week 2" /></center></td>
                  <td colSpan={7} className="border-t border-white bg-red-300 relative align-middle"><center><PieChart percent={weeklyProgress[2]} color="#f87171" bg="bg-red-100" label="Week 3" /></center></td>
                  <td colSpan={7} className="border-t border-white bg-orange-300 relative align-middle"><center><PieChart percent={weeklyProgress[3]} color="#fb923c" bg="bg-orange-100" label="Week 4" /></center></td>
                  <td colSpan={daysInMonth - 28} className="border-t border-white bg-slate-300 relative align-middle"><center><PieChart percent={weeklyProgress[4]} color="#94a3b8" bg="bg-surface-container-high" label={`Extra`} /></center></td>
                </>
              ) : (
                <td colSpan={7} className={`border-t border-white relative align-middle ${activeWeek === 0 ? "bg-green-300" : activeWeek === 1 ? "bg-purple-300" : activeWeek === 2 ? "bg-red-300" : activeWeek === 3 ? "bg-orange-300" : "bg-slate-300"}`}>
                  <center><PieChart percent={weeklyProgress[activeWeek]} color={["#60a5fa", "#c084fc", "#f87171", "#fb923c", "#94a3b8"][activeWeek]} bg="bg-transparent" label={`Week ${activeWeek + 1}`} /></center>
                </td>
              )}
              <td colSpan={2} className="sticky right-0 z-30 bg-surface-container-high border-l border-t border-slate-300 outline outline-slate-200"></td>
            </tr>
          </tfoot>
        </table>
      </div>


      {/* STUDY HOURS GRAPH SECTION: Technical Analysis Pod */}
      <div className="mt-12 mb-20 bg-surface-container-low rounded-[3rem] shadow-ambient overflow-hidden">
        <div className="bg-primary px-10 py-8 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
          <div className="absolute top-0 left-0 p-8 opacity-5 pointer-events-none">
            <Trophy size={140} />
          </div>
          <div className="flex items-center gap-6 relative z-10">
            <div className="size-14 bg-white/10 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <Clock size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white tracking-tighter uppercase">Technical Tempo</h3>
              <p className="text-[10px] font-technical font-black text-secondary-container uppercase tracking-[0.4em] opacity-60">Syllabus Temporal Analysis</p>
            </div>
          </div>

          {/* CHART TYPE TOGGLE: Botanical Tube */}
          <div className="flex bg-white/10 p-1.5 rounded-full backdrop-blur-3xl border border-white/10 relative z-10">
            <button
              onClick={() => setChartType('bar')}
              className={`flex items-center gap-3 px-6 py-2.5 rounded-full text-[10px] font-technical font-black uppercase tracking-[0.2em] transition-all duration-500 scale-90 ${chartType === 'bar' ? 'bg-white text-primary shadow-xl scale-100' : 'text-white/60 hover:text-white'}`}
            >
              <BarChart2 size={16} /> <span>Bar</span>
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`flex items-center gap-3 px-6 py-2.5 rounded-full text-[10px] font-technical font-black uppercase tracking-[0.2em] transition-all duration-500 scale-90 ${chartType === 'line' ? 'bg-white text-primary shadow-xl scale-100' : 'text-white/60 hover:text-white'}`}
            >
              <LineChart size={16} /> <span>Line</span>
            </button>
            <button
              onClick={() => setChartType('histogram')}
              className={`flex items-center gap-3 px-6 py-2.5 rounded-full text-[10px] font-technical font-black uppercase tracking-[0.2em] transition-all duration-500 scale-90 ${chartType === 'histogram' ? 'bg-white text-primary shadow-xl scale-100' : 'text-white/60 hover:text-white'}`}
            >
              <Activity size={16} /> <span>Distro</span>
            </button>
          </div>
        </div>

        <div className="p-12">
          <div className="h-[250px] w-full relative pt-6">
            {chartType === 'bar' && (
              <div className="h-full w-full flex items-end gap-[2px] md:gap-1 lg:gap-1.5 relative border-b border-slate-100">
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[8px] font-black text-slate-300 uppercase pointer-events-none">
                  <span>{Math.ceil(maxDailyHours)}h</span>
                  <span>{Math.ceil(maxDailyHours / 2)}h</span>
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
                        Day {i + 1}: {h.toFixed(1)}h
                      </div>
                      <div
                        className="w-full rounded-t-sm transition-all duration-500 ease-out group-hover:brightness-110 group-hover:scale-x-110 shadow-sm"
                        style={{
                          height: `${height}%`,
                          backgroundColor: h > 0 ? undefined : '#f1f5f9',
                          background: h > 0 ? `linear-gradient(to top, ${barColor}, ${barColor}dd)` : undefined
                        }}
                      />
                      <span className="text-[7px] font-black text-slate-400 mt-2 group-hover:text-slate-600 transition-colors">{i + 1}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {chartType === 'line' && (
              <div className="h-full w-full relative">
                <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[8px] font-black text-slate-300 uppercase pointer-events-none pr-4 border-r border-slate-100">
                  <span>{Math.ceil(maxDailyHours)}h</span>
                  <span>{Math.ceil(maxDailyHours / 2)}h</span>
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
                            Day {i + 1}: {h.toFixed(1)}h
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
                  <span>{Math.ceil(histogramData.maxCount / 2)}d</span>
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
                <div key={idx} className="flex items-center gap-1.5 px-3 py-1 bg-surface-container-low rounded-full ">
                  <div className={`size-2.5 rounded-full ${c} shadow-sm`} />
                  <span className="text-[9px] font-black uppercase text-on-surface-variant tracking-wider">Week {idx + 1}</span>
                </div>
              ))
            ) : chartType === 'histogram' ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-2xl border border-green-100">
                <Trophy size={16} className="text-primary" />
                <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">
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
          <div className="relative bg-surface w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-green-100 animate-in fade-in zoom-in duration-300">
            <div className="bg-primary p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <Bell className="text-green-400 opacity-20 rotate-12" size={120} />
              </div>
              <div className="relative z-10">
                <div className="size-16 bg-surface/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                  <Bell className="text-white animate-bounce" size={32} />
                </div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Test Reminder</h3>
                <p className="text-primary/10 font-bold text-sm mt-1">Your scheduled test is starting now!</p>
              </div>
            </div>

            <div className="p-8">
              <div className="bg-surface-container-low rounded-2xl p-6  mb-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
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
                  className="flex-1 px-6 py-4 rounded-2xl border-2 border-slate-900 bg-surface text-on-surface font-black uppercase tracking-widest text-[10px] hover:bg-surface-container-low transition-all active:scale-95"
                >
                  Change Date/Time
                </button>
                <button
                  onClick={() => handleProceedToTest(reminderTest)}
                  className="flex-1 px-6 py-4 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all active:scale-95"
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
            onClick={() => { }}
            className={" bg-red-500!"}
            title={"Delete"}
          />
        </>
      }
    />
  );
};
