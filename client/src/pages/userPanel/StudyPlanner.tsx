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
  ChevronRight,
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
  const [isMilestoneDrawerOpen, setIsMilestoneDrawerOpen] = useState(false);

  const monthName = useMemo(() => {
    return new Date(viewYear, viewMonth - 1).toLocaleString('default', { month: 'long' });
  }, [viewMonth, viewYear]);

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

  const trackerHabits = useMemo(() => {
     return habits.filter(h => !h.is_mastery && h.is_recurring !== false);
  }, [habits]);

  const masteryOnly = useMemo(() => {
    return habits
      .filter((h) => h.is_mastery)
      .map((h) => {
        const dayIdx = (progress[h.id] || []).findIndex((v) => v);
        return { ...h, scheduledDay: dayIdx + 1 };
      })
      .filter((h) => h.scheduledDay > 0)
      .sort((a, b) => a.scheduledDay - b.scheduledDay);
  }, [habits, progress]);

  return (
    <div className="text-on-surface transition-colors duration-500">
      <GoogleCalendarModal isOpen={isGooglePopupOpen} onClose={() => setIsGooglePopupOpen(false)} />
      
      <main className="mx-auto space-y-12 pb-20">
        {/* Main Planning Desk */}
        <div className="grid lg:grid-cols-12 gap-10 items-start">
          
          {/* SPREADSHEET ZONE: Full Width Technical Desk */}
          <section className="lg:col-span-12">
            <div className="px-2 mb-8">
               <h3 className="text-[11px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-60">Monthly Persistence Grid</h3>
               <p className="text-sm font-bold text-on-surface mt-2 tracking-tight">Your botanical routines and recurring study rituals.</p>
            </div>
            <div className="bg-surface-container-low rounded-[3rem] overflow-hidden border border-outline-variant/5">
              <TrackerGrid
                initialHabits={trackerHabits}
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
          </section>

          {/* LOWER ANALYSIS ZONE: Split Routine & Growth */}
          <section className="lg:col-span-4 space-y-10 animate-in fade-in slide-in-from-left-4 duration-1000">
            <div className="bg-surface-container-low p-2 rounded-[3.5rem] shadow-ambient">
              <GrowthMetrics
                level={stats.level}
                xp={stats.xpInLevel}
                totalXp={stats.xp}
                streak={stats.currentStreak}
              />
            </div>
          </section>

          <section className="lg:col-span-8 animate-in fade-in slide-in-from-right-4 duration-1000">
            <div className="bg-surface-container-low p-2 rounded-[3.5rem] shadow-ambient">
              <DailyRoutine 
                habits={habits} 
                progress={progress}
                selectedDate={selectedDate}
                onRefresh={fetchData} 
                onSync={handleSyncTaskToCalendar} 
                onSyncAll={handleSyncAllTasks}
              />
            </div>
          </section>

        </div>
      </main>

      {/* FIXED FAB: Monthly Milestones Trigger */}
      <button
        onClick={() => setIsMilestoneDrawerOpen(true)}
        className="fixed bottom-10 right-10 size-16 bg-primary text-white rounded-[2.5rem] shadow-ambient-lg shadow-primary/20 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-500 z-50 group overflow-hidden"
      >
        <div className="absolute inset-0 bg-linear-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <GraduationCap className="size-6 transition-transform group-hover:rotate-12" />
        {masteryOnly.length > 0 && (
          <div className="absolute -top-1 -right-1 size-5 bg-tertiary rounded-full border-2 border-primary flex items-center justify-center animate-bounce">
            <span className="text-[10px] font-black">{masteryOnly.length}</span>
          </div>
        )}
      </button>

      {/* MILESTONE DRAWER: Monthly Test Overview */}
      <div 
        className={`fixed inset-0 z-60 transition-all duration-700 ease-botanical ${isMilestoneDrawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <div 
          className="absolute inset-0 bg-on-surface/5 backdrop-blur-sm"
          onClick={() => setIsMilestoneDrawerOpen(false)}
        />
        <div 
          className={`absolute top-0 right-0 h-full w-full max-w-96 bg-surface-container-high/95 backdrop-blur-3xl shadow-ambient-lg border-l border-on-surface/5 px-4 py-10 transform transition-transform duration-700 ease-botanical ${isMilestoneDrawerOpen ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="flex justify-between items-center mb-12 px-2">
            <div>
               <h3 className="text-2xl font-black tracking-tighter text-on-surface leading-none">Monthly Milestones</h3>
               <p className="text-[10px] font-technical font-black uppercase tracking-widest text-primary mt-2">Active Cycle: {monthName} {viewYear}</p>
            </div>
            <button 
              onClick={() => setIsMilestoneDrawerOpen(false)}
              className="size-10 rounded-full bg-on-surface/5 flex items-center justify-center hover:bg-on-surface/10 transition-colors"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>

          <div className="px-2 space-y-6">
             <div className="p-6 bg-white/40 rounded-[2.5rem] border border-on-surface/5 shadow-inner">
                <p className="text-[10px] font-technical font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-40 leading-relaxed italic">
                  "Each test is a seedling. Master them to grow your OPSC knowledge forest."
                </p>
             </div>

             <div className="space-y-4 max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar pr-4 pb-10">
                {masteryOnly.length === 0 ? (
                  <div className="py-20 text-center bg-white/40 rounded-4xl border border-dashed border-primary/20 p-8">
                      <Sparkles className="size-8 text-primary/40 mx-auto mb-4 opacity-40" />
                      <p className="text-[10px] font-technical font-black uppercase tracking-widest text-on-surface-variant opacity-40">Zero milestones manifested for this cycle</p>
                  </div>
                ) : (
                  masteryOnly.map((test) => (
                    <button
                      key={test.id}
                      onClick={() => {
                        setSelectedDate(new Date(viewYear, viewMonth - 1, test.scheduledDay));
                        setIsMilestoneDrawerOpen(false);
                      }}
                      className={`w-full group/test text-left p-4 rounded-4xl transition-all duration-500 border border-outline-variant/10 ${
                        selectedDate?.getDate() === test.scheduledDay ? 'bg-primary text-on-primary shadow-lg scale-105' : 'bg-white hover:shadow-md hover:scale-[1.02]'
                      }`}
                    >
                        <div className="flex items-center gap-4">
                          <div className={`size-12 rounded-2xl flex items-center justify-center font-technical font-black text-xs transition-colors ${
                              selectedDate?.getDate() === test.scheduledDay ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                          }`}>
                              {test.scheduledDay}
                          </div>
                          <div className="flex-1 min-w-0">
                              <p className={`text-sm font-black tracking-tight truncate ${selectedDate?.getDate() === test.scheduledDay ? 'text-on-primary' : 'text-on-surface'}`}>{test.name}</p>
                              <div className="flex items-center gap-2 mt-0.5 opacity-60">
                                <span className={`text-[9px] font-technical font-black uppercase tracking-widest ${selectedDate?.getDate() === test.scheduledDay ? 'text-white' : 'text-primary'}`}>Day {test.scheduledDay}</span>
                                {test.start_time && <span className="text-[9px] font-technical font-black">• {test.start_time}</span>}
                              </div>
                          </div>
                        </div>
                    </button>
                  ))
                )}
             </div>
          </div>

          <div className="absolute bottom-10 left-10 right-10">
             <button 
               onClick={() => { setIsMilestoneDrawerOpen(false); setAutoOpenAddModal(true); }}
               className="w-full py-4 bg-tertiary text-on-tertiary rounded-full font-technical font-black text-[11px] uppercase tracking-widest shadow-lg shadow-tertiary/20 hover:scale-105 active:scale-95 transition-all"
             >
               Add Milestone +
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
