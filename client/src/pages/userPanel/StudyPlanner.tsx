import React, { useState, useEffect, useMemo } from "react";
import { Header } from "../../components/Header";
import TrackerGrid from "../../components/studyPlanner/TrackerGrid";
import DailyRoutine from "../../components/studyPlanner/DailyRoutine";
import FocusTimer from "../../components/studyPlanner/FocusTimer";
import GrowthMetrics from "../../components/studyPlanner/GrowthMetrics";
import { GoogleCalendarButton } from "../../components/ui/GoogleCalenderButton";
import GoogleCalendarModal from "../../components/studyPlanner/GoogleCalendarModal";
import {
  GraduationCap,
  Sparkles,
  LayoutDashboard,
  Calendar,
  Settings,
} from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { supabase } from "../../utils/supabase";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../store";
import { fetchUserProfile, updateUserLocally } from "../../slice/userSlice";
import { useGoogleCalendar } from "../../utils/useGoogleCalender";

export interface Habit {
  id: string;
  name: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  category: "theory" | "mcq" | "revision" | "mock";
  start_time?: string;
  end_time?: string;
  is_mastery?: boolean;
  chapter_id?: string;
  exam_id?: string;
  is_recurring?: boolean;
}

export default function StudyPlannerPage() {
  const navigate = useNavigate();
  const { eid: examId } = useParams();
  const dispatch = useDispatch<AppDispatch>();
  const { user, profile } = useSelector((state: RootState) => state.user);
  const { connected, addEvent, editEvent } = useGoogleCalendar();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [progress, setProgress] = useState<Record<string, boolean[]>>({});
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const currentYear = now.getFullYear();
  const currentMonth = currentMonthIdx + 1;
  const today = now.getDate();
  const unlockPastDays = false;

  const [viewMonth, setViewMonth] = useState(currentMonth);
  const [viewYear, setViewYear] = useState(currentYear);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [autoOpenAddModal, setAutoOpenAddModal] = useState(false);
  const [hasPrevMonthTasks, setHasPrevMonthTasks] = useState(false);
  const [isGooglePopupOpen, setIsGooglePopupOpen] = useState(false);

  // Fetch from Supabase
  const fetchData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [habitsRes, masteryRes] = await Promise.all([
        supabase
          .from("study_habits")
          .select("*")
          .eq("user_id", user.id)
          .eq("exam_id", examId)
          .eq("month", viewMonth)
          .eq("year", viewYear), // Corrected Promise.all syntax
        supabase
          .from("user_mastery")
          .select("*, chapters(name)")
          .eq("user_id", user.id) // Added user_id filter for consistency
          .eq("exam_id", examId) // Added exam_id filter for consistency
          .eq("month", viewMonth) // Added month filter for consistency
          .eq("year", viewYear),
      ]);

      const allHabits: Habit[] = [];
      const allProgress: Record<string, boolean[]> = {};

      const habitsData = habitsRes.data || [];
      const masteryData = masteryRes.data || [];

      habitsData.forEach((h) => {
        allHabits.push({
          id: h.id,
          name: h.name,
          priority: h.priority,
          category: h.category,
          start_time: h.start_time,
          end_time: h.end_time,
          is_recurring: h.is_recurring !== false,
        });
        allProgress[h.id] = h.progress || Array(31).fill(false);
      });

      masteryData.forEach((m) => {
        allHabits.push({
          id: m.id,
          name: m.chapters?.name || "Unknown Chapter",
          priority: m.priority as any,
          category: "theory",
          start_time: m.start_time,
          end_time: m.end_time,
          is_mastery: true,
          chapter_id: m.chapter_id,
          exam_id: examId,
          is_recurring: m.is_recurring !== false,
        });
        allProgress[m.id] = m.progress || Array(31).fill(false);
      });

      setHabits(allHabits);
      setProgress(allProgress);

      // Check if we should show the setup prompt:
      // Show setup if ANY month has no tasks
      setIsSettingUp(allHabits.length === 0);

      // Also check if previous month has anything to copy
      const prevMonth = viewMonth === 1 ? 12 : viewMonth - 1;
      const prevYear = viewMonth === 1 ? viewYear - 1 : viewYear;

      const [{ count: habitCount }, { count: masteryCount }] =
        await Promise.all([
          supabase
            .from("study_habits")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("exam_id", examId)
            .eq("month", prevMonth)
            .eq("year", prevYear),
          supabase
            .from("user_mastery")
            .select("*", { count: "exact", head: true })
            .eq("exam_id", examId)
            .eq("user_id", user.id)
            .eq("month", prevMonth)
            .eq("year", prevYear),
        ]);

      setHasPrevMonthTasks((habitCount || 0) + (masteryCount || 0) > 0);
    } catch (err) {
      console.error("Error fetching study data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPreviousMonth = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const prevMonth = viewMonth === 1 ? 12 : viewMonth - 1;
      const prevYear = viewMonth === 1 ? viewYear - 1 : viewYear;

      // 1. Fetch habits and mastery from previous month
      const [{ data: prevHabits }, { data: prevMastery }] = await Promise.all([
        supabase
          .from("study_habits")
          .select("*")
          .eq("user_id", user.id)
          .eq("month", prevMonth)
          .eq("year", prevYear),
        supabase
          .from("user_mastery")
          .select("*")
          .eq("user_id", user.id)
          .eq("month", prevMonth)
          .eq("year", prevYear),
      ]);

      const news: any[] = [];

      // 2. Prepare cloned habits
      if (prevHabits) {
        prevHabits.forEach((h) => {
          const { id, created_at, updated_at, ...rest } = h;
          news.push(
            supabase
              .from("study_habits")
              .insert({
                ...rest,
                month: viewMonth,
                year: viewYear,
                exam_id: examId,
                progress: Array(31).fill(false),
              }),
          );
        });
      }

      // 3. Prepare cloned mastery
      if (prevMastery) {
        prevMastery.forEach((m) => {
          const { id, created_at, ...rest } = m;
          news.push(
            supabase
              .from("user_mastery")
              .insert({
                ...rest,
                month: viewMonth,
                year: viewYear,
                exam_id: examId,
                progress: Array(31).fill(false),
              }),
          );
        });
      }

      if (news.length > 0) await Promise.all(news);

      setIsSettingUp(false);
      fetchData();
    } catch (err) {
      console.error("Copy Failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartFresh = async () => {
    setIsSettingUp(false);
  };

  useEffect(() => {
    fetchData();
  }, [user?.id, viewMonth, viewYear]);

  // Handle progress updates from children
  const handleToggle = async (id: string, index: number) => {
    const habit = habits.find((h) => h.id === id);
    if (!habit || !user?.id) return;

    // "Today-only" restriction for one-off tasks
    const isOneOff = (habit as any).is_recurring === false;
    const isToday = viewMonth === currentMonth && viewYear === currentYear && index === today - 1;
    
    if (isOneOff && !isToday && !unlockPastDays) {
       // Optional: show a toast or alert
       return;
    }

    const newProg = [...(progress[id] || Array(31).fill(false))];
    newProg[index] = !newProg[index];

    // Optimistic Update
    setProgress((prev) => ({ ...prev, [id]: newProg }));

    try {
      const table = habit.is_mastery ? "user_mastery" : "study_habits";
      const { error } = await supabase
        .from(table)
        .update({
          progress: newProg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        console.error("Persistence Error:", error);
        fetchData(); // Rollback on error
      }
    } catch (err) {
      console.error("Network/Code Error:", err);
      fetchData(); // Rollback
    }
  };

  const handleMonthChange = (direction: "prev" | "next") => {
    // Clear data and set loading to avoid stale flicker
    setHabits([]);
    setProgress({});
    setLoading(true);

    let newMonth = viewMonth;
    let newYear = viewYear;

    if (direction === "prev") {
      if (viewMonth === 1) {
        newMonth = 12;
        newYear = viewYear - 1;
      } else {
        newMonth = viewMonth - 1;
      }
    } else {
      if (viewMonth === 12) {
        newMonth = 1;
        newYear = viewYear + 1;
      } else {
        newMonth = viewMonth + 1;
      }
    }

    setViewMonth(newMonth);
    setViewYear(newYear);
    
    // Also reset selectedDate to the 1st of the new month to stay within view
    setSelectedDate(new Date(newYear, newMonth - 1, 1));
  };
  // Growth Metrics Logic
  const stats = useMemo(() => {
    let totalCompleted = 0;
    Object.values(progress).forEach((p) => {
      totalCompleted += p.filter((v) => v).length;
    });

    // Calculate Streak
    let currentStreak = 0;
    // Check all days in the progress array (up to 31)
    const maxDays = 31;
    for (let day = maxDays - 1; day >= 0; day--) {
      const anyDone = Object.values(progress).some((p) => p[day]);
      if (anyDone) {
        currentStreak++;
      } else if (currentStreak > 0) {
        break; // streak broken
      }
    }

    const xp = totalCompleted * 10;
    const level = Math.floor(xp / 500) + 1;
    const xpInLevel = xp % 500;

    return { totalCompleted, currentStreak, xp, level, xpInLevel };
  }, [progress]);

  const handleSyncTaskToCalendar = async (habit: Habit, silent = false) => {
    if (!connected) {
      if (!silent) setIsGooglePopupOpen(true);
      return;
    }

    try {
      const today = new Date().toISOString().split("T")[0];
      const startTimeStr = habit.start_time || "09:00";
      // Construct start time: today at the habit's start_time
      const startDateTime = new Date(`${today}T${startTimeStr}:00`);

      let endDateTime: Date;
      if (habit.end_time) {
        endDateTime = new Date(`${today}T${habit.end_time}:00`);
      } else {
        // Default to 1 hour duration
        endDateTime = new Date(startDateTime.getTime() + 60 * 60000);
      }

      const existingEventId = profile?.google_calendar_event_ids?.[habit.id];
      const eventData = {
        summary: habit.name,
        description: `Study Planner Task - Priority: ${habit.priority}. Odisha Exam Prep.`,
        colorId: habit.priority === "HIGH" ? "11" : "1", // 11 is red, 1 is blue
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: "Asia/Kolkata",
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: "Asia/Kolkata",
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "popup" as const, minutes: 30 },
            { method: "popup" as const, minutes: 1440 },
          ],
        },
      };

      if (existingEventId) {
        try {
          await editEvent(existingEventId, eventData);
        } catch (e) {
          // If edit fails (event might be deleted on GC), fallback to add
          console.warn("Edit failed, falling back to addEvent", e);
          const gcEvent = await addEvent(eventData);
          if (gcEvent?.id && user?.id) {
            const existingMap = profile?.google_calendar_event_ids ?? {};
            await supabase
              .from("profiles")
              .update({
                google_calendar_event_ids: { ...existingMap, [habit.id]: gcEvent.id },
              })
              .eq("id", user.id);
            dispatch(updateUserLocally({ google_calendar_event_ids: { ...existingMap, [habit.id]: gcEvent.id } }));
          }
        }
      } else {
        const gcEvent = await addEvent(eventData);
        if (gcEvent?.id && user?.id) {
          const existingMap = profile?.google_calendar_event_ids ?? {};
          await supabase
            .from("profiles")
            .update({
              google_calendar_event_ids: { ...existingMap, [habit.id]: gcEvent.id },
            })
            .eq("id", user.id);
          dispatch(updateUserLocally({ google_calendar_event_ids: { ...existingMap, [habit.id]: gcEvent.id } }));
        }
      }

      if (!silent) alert(`"${habit.name}" synced to your Google Calendar!`);
    } catch (e: any) {
      if (!silent) {
        console.error("Sync failed:", e);
        alert(`Sync failed: ${e.message || "Unknown error"}`);
      }
    }
  };

  const handleSyncAllTasks = async () => {
    if (!connected) {
      setIsGooglePopupOpen(true);
      return;
    }
    
    setLoading(true);
    try {
      for (const habit of habits) {
        await handleSyncTaskToCalendar(habit, true);
      }
      alert("All tasks for today have been synced to your Google Calendar!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <GoogleCalendarModal isOpen={isGooglePopupOpen} onClose={() => setIsGooglePopupOpen(false)} />
      <main className="max-w-400 mx-auto p-4 md:p-8 space-y-10 pb-20">
        <div className="grid sm:grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Center Column: Mastery Tracker (8/12) */}
          <section className="lg:col-span-12 space-y-8">
            <div className="flex flex-col md:flex-row gap-8">
              {/* <GoogleCalendarButton /> */}
              <div className="flex-1">
                <TrackerGrid
                  initialHabits={habits}
                  initialProgress={progress}
                  onToggle={handleToggle}
                  onRefresh={fetchData}
                  isLoading={loading}
                  viewMonth={viewMonth}
                  viewYear={viewYear}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  onMonthChange={handleMonthChange}
                  isSettingUp={isSettingUp}
                  isPastMonth={
                    viewYear < currentYear ||
                    (viewYear === currentYear && viewMonth < currentMonth)
                  }
                  hasPrevMonthTasks={hasPrevMonthTasks}
                  onCopyPrevious={handleCopyPreviousMonth}
                  onStartFresh={handleStartFresh}
                  autoOpenAddModal={autoOpenAddModal}
                  onModalOpenHandled={() => setAutoOpenAddModal(false)}
                />
              </div>
              <div className="w-full md:w-80 shrink-0">
                {/* <FocusTimer /> */}

                {/* Quick Reminders Box */}
                {/* <div className="mt-8 bg-linear-to-br from-indigo-500 to-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group">
                  <div className="absolute bottom-0 right-0 -mb-4 -mr-4 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <GraduationCap size={120} />
                  </div>
                  <div className="space-y-4 relative z-10">
                    <h4 className="text-lg font-black tracking-tight flex items-center gap-2">
                      <Calendar size={20} />
                      Exam Countdown
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold text-white/70 uppercase">
                        <span>OPSC Prelims</span>
                        <span>42 Days Left</span>
                      </div>
                      <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-white w-2/3 rounded-full" />
                      </div>
                    </div>
                    <p className="text-[10px] text-blue-100 font-bold leading-relaxed">
                      "Success is the sum of small efforts, repeated day in and
                      day out."
                    </p>
                  </div>
                </div> */}
              </div>
            </div>
          </section>
          {/* Left Column: Routine & Metrics (4/12) */}
          <section className="lg:col-span-4 space-y-8">
            <GrowthMetrics
              level={stats.level}
              xp={stats.xpInLevel}
              totalXp={stats.xp}
              streak={stats.currentStreak}
            />
          </section>
          <section className=" lg:col-span-8">
            <DailyRoutine 
              habits={habits} 
              progress={progress}
              selectedDate={selectedDate}
              onRefresh={fetchData} 
              onSync={handleSyncTaskToCalendar} 
              onSyncAll={handleSyncAllTasks}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
