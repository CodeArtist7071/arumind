import React, { useState, useEffect, useMemo, Suspense } from "react";
import { Header } from "../../components/Header";
import TrackerGrid from "../../components/studyPlanner/TrackerGrid";
import DailyRoutine from "../../components/studyPlanner/DailyRoutine";
import FocusTimer from "../../components/studyPlanner/FocusTimer";
import GrowthMetrics from "../../components/studyPlanner/GrowthMetrics";
import { GoogleCalendarButton } from "../../components/ui/GoogleCalenderButton";
import GoogleCalendarModal from "../../components/studyPlanner/GoogleCalendarModal";
import { MobileStudyPlanner } from "../../components/studyPlanner/MobileStudyPlanner";
import { AddRoutine } from "../../components/studyPlanner/AddRoutine";
import { MobileAddTask } from "../../components/studyPlanner/MobileAddTask";
import {
  GraduationCap,
  Sparkles,
  LayoutDashboard,
  Calendar,
  Settings,
  ChevronRight,
  Award,
  Zap,
  PlusIcon,
} from "lucide-react";
import { useNavigate, useParams, useOutlet, Outlet } from "react-router";
import { supabase } from "../../utils/supabase";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../store";
import { fetchUserProfile, updateUserLocally } from "../../slice/userSlice";
import { useGoogleCalendar } from "../../utils/useGoogleCalender";
import { ExamTicker } from "../../components/ui/ExamTicker";

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
  const outlet = useOutlet();
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
  const [addMode, setAddMode] = useState<"routine" | "test">("routine");
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  const { examData } = useSelector((state: RootState) => state.exams);
  const targetedExams = useMemo(() => {
    if (!examData || !profile?.target_exams) return [];
    return examData.filter((el) => profile.target_exams.includes(el.id));
  }, [examData, profile?.target_exams]);

  const monthName = useMemo(() => {
    return new Date(viewYear, viewMonth - 1).toLocaleString("default", {
      month: "long",
    });
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
          .eq("year", viewYear),
        supabase
          .from("user_mastery")
          .select("*, chapters(name)")
          .eq("user_id", user.id)
          .eq("exam_id", examId)
          .eq("month", viewMonth)
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

      setIsSettingUp(allHabits.length === 0);

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

      if (prevHabits) {
        prevHabits.forEach((h) => {
          const { id, created_at, updated_at, ...rest } = h;
          news.push(
            supabase.from("study_habits").insert({
              ...rest,
              month: viewMonth,
              year: viewYear,
              exam_id: examId,
              progress: Array(31).fill(false),
            }),
          );
        });
      }

      if (prevMastery) {
        prevMastery.forEach((m) => {
          const { id, created_at, ...rest } = m;
          news.push(
            supabase.from("user_mastery").insert({
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
  }, [user?.id, viewMonth, viewYear, examId]);

  // Default selection ritual: If no exam provided, manifest the first available
  useEffect(() => {
    if (!examId && targetedExams.length > 0) {
      navigate(`/user/plan-study/${targetedExams[0].id}`, { replace: true });
    }
  }, [examId, targetedExams, navigate]);

  const handleToggle = async (id: string, index: number) => {
    const habit = habits.find((h) => h.id === id);
    if (!habit || !user?.id) return;

    const isOneOff = (habit as any).is_recurring === false;
    const isToday =
      viewMonth === currentMonth &&
      viewYear === currentYear &&
      index === today - 1;

    if (isOneOff && !isToday && !unlockPastDays) {
      return;
    }

    const newProg = [...(progress[id] || Array(31).fill(false))];
    newProg[index] = !newProg[index];

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
        fetchData();
      }
    } catch (err) {
      console.error("Network/Code Error:", err);
      fetchData();
    }
  };

  const handleMonthChange = (direction: "prev" | "next") => {
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

    setSelectedDate(new Date(newYear, newMonth - 1, 1));
  };

  const stats = useMemo(() => {
    let totalCompleted = 0;
    Object.values(progress).forEach((p) => {
      totalCompleted += p.filter((v) => v).length;
    });

    let currentStreak = 0;
    const maxDays = 31;
    for (let day = maxDays - 1; day >= 0; day--) {
      const anyDone = Object.values(progress).some((p) => p[day]);
      if (anyDone) {
        currentStreak++;
      } else if (currentStreak > 0) {
        break;
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
      const startDateTime = new Date(`${today}T${startTimeStr}:00`);

      let endDateTime: Date;
      if (habit.end_time) {
        endDateTime = new Date(`${today}T${habit.end_time}:00`);
      } else {
        endDateTime = new Date(startDateTime.getTime() + 60 * 60000);
      }

      const existingEventId = profile?.google_calendar_event_ids?.[habit.id];
      const eventData = {
        summary: habit.name,
        description: `Study Planner Task - Priority: ${habit.priority}. Odisha Exam Prep.`,
        colorId: habit.priority === "HIGH" ? "11" : "1",
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
          console.warn("Edit failed, falling back to addEvent", e);
          const gcEvent = await addEvent(eventData);
          if (gcEvent?.id && user?.id) {
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
          }
        }
      } else {
        const gcEvent = await addEvent(eventData);
        if (gcEvent?.id && user?.id) {
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

  const onAddHabit = (mode: "routine" | "test") => {
    setAddMode(mode);
    navigate("add");
  };

  const [isAddExpanded, setIsAddExpanded] = useState(false);

  const trackerHabits = useMemo(() => {
    return habits.filter((h) => !h.is_mastery && h.is_recurring !== false);
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
      <GoogleCalendarModal
        isOpen={isGooglePopupOpen}
        onClose={() => setIsGooglePopupOpen(false)}
      />

      <main className="mx-auto pb-20 min-h-screen">
        <div className="hidden lg:block">
          {/* Manifestation moved to Side-Page Outlet below */}
        </div>

        <div className="block lg:hidden">
          <MobileAddTask
            isOpen={autoOpenAddModal}
            onClose={() => {
              setAutoOpenAddModal(false);
              setEditingHabitId(null);
            }}
            editingHabitId={editingHabitId || undefined}
            title={
              editingHabitId
                ? "Update Routine"
                : addMode === "test"
                  ? "Schedule Test"
                  : "Add New Routine"
            }
            initialHabits={habits}
            initialProgress={progress}
            examId={examId || ""}
            viewMonth={viewMonth}
            viewYear={viewYear}
            onRefresh={fetchData}
            onRequestConnection={() => setIsGooglePopupOpen(true)}
            initialUseChapter={addMode === "test"}
          />
        </div>

        <div className="block lg:hidden animate-reveal">
          <MobileStudyPlanner
            habits={habits}
            progress={progress}
            onToggle={handleToggle}
            viewMonth={viewMonth}
            viewYear={viewYear}
            selectedDate={selectedDate || new Date()}
            onSelectDate={setSelectedDate}
            onMonthChange={handleMonthChange}
            stats={stats}
            onAddHabit={onAddHabit}
            onSync={handleSyncTaskToCalendar}
            onSyncAll={handleSyncAllTasks}
            isSettingUp={isSettingUp}
            hasPrevMonthTasks={hasPrevMonthTasks}
            onCopyPrevious={handleCopyPreviousMonth}
            onStartFresh={handleStartFresh}
            masteryOnly={masteryOnly}
          />
        </div>

        {/* DESKTOP ZONE: Manifests Grid + Overlay side-sheet */}
        <div className="hidden lg:block relative min-h-screen will-change-contents">
          <section className={`transition-all duration-800 ease-(--ease-premium) transform origin-right will-change-[transform,opacity,filter] ${outlet ? "scale-[0.94] opacity-30 blur-md pointer-events-none -translate-x-16" : "scale-100 opacity-100 blur-0"}`}>
            <div className="px-2 mb-8">
              <h3 className="text-[11px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-60">
                Monthly Persistence Grid
              </h3>
              <p className="text-sm font-bold text-on-surface mt-2 tracking-tight">
                Your botanical routines and recurring study rituals.
              </p>
            </div>
            <div className="mb-6">
              <ExamTicker
                targetedExams={targetedExams}
                selectedExam={examId || ""}
                setSelectedExam={(id) => navigate(`/user/plan-study/${id}`)}
              />
            </div>

            <div className="bg-surface-container-low rounded-[3rem] overflow-hidden border border-outline-variant/5 shadow-ambient-lg">
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
                initialUseChapter={addMode === "test"}
                isPastMonth={
                  viewYear < currentYear ||
                  (viewYear === currentYear && viewMonth < currentMonth)
                }
                hasPrevMonthTasks={hasPrevMonthTasks}
                onCopyPrevious={handleCopyPreviousMonth}
                onStartFresh={handleStartFresh}
                autoOpenAddModal={autoOpenAddModal}
                onModalOpenHandled={() => setAutoOpenAddModal(false)}
                editingHabitId={editingHabitId}
                setEditingHabitId={setEditingHabitId}
                setShowSelector={setShowSelector}
                onShowAddTask={() => {
                  setAddMode("routine");
                  navigate("add");
                }}
                onShowMastery={() => {
                  setAddMode("test");
                  navigate("add");
                }}
              />
            </div>
          </section>

          {/* OVERLAY PANEL: The Side-Sheet Ritual */}
          <div
            className={`fixed inset-y-0 right-0 z-100 transition-all duration-700 ease-in-out transform will-change-[transform,opacity] ${outlet ? "translate-x-0 opacity-100 w-full max-w-[540px] pointer-events-auto" : "translate-x-full opacity-0 w-0 pointer-events-none"}`}
            style={{ transitionTimingFunction: 'var(--ease-premium)' }}
          >
            <Suspense fallback={<div className="h-full bg-surface/80 backdrop-blur-3xl border-l border-on-surface/5 animate-pulse" />}>
              {outlet && (
                <div className="h-full shadow-ambient-2xl border-l border-on-surface/5 backdrop-blur-3xl bg-surface/85">
                  <Outlet context={{
                    viewMonth,
                    viewYear,
                    initialHabits: habits,
                    examId: examId || "",
                    onRefresh: fetchData,
                    onRequestConnection: () => setIsGooglePopupOpen(true),
                    initialProgress: progress
                  }} />
                </div>
              )}
            </Suspense>
          </div>

          {/* LOWER ANALYSIS ZONE: Split Routine & Growth */}
          <div className="hidden lg:grid grid-cols-12 gap-10 mt-20">
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
        </div>
      </main>

      {/* FIXED FAB: Monthly Milestones Trigger */}
      <AddMileStone
        isMilestoneOpen={isMilestoneDrawerOpen}
        setIsMilestoneOpen={setIsMilestoneDrawerOpen}
        isAddExpanded={isAddExpanded}
        setIsAddExpanded={setIsAddExpanded}
        onAddHabit={onAddHabit}
        masteryOnly={masteryOnly}
      />
      <div className="hidden fixed bottom-20 lg:bottom-10 right-6 md:flex flex-col gap-4 items-end z-50">
           <button
            onClick={() => setIsMilestoneDrawerOpen(true)}
            className="hidden size-14 bg-tertiary text-on-tertiary rounded-[1.75rem] shadow-ambient-lg shadow-tertiary/20 lg:flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-500 overflow-hidden relative"
          >
            <Award className="size-5" />
            {masteryOnly.length > 0 && (
              <div className="absolute -top-1 -right-1 size-5 bg-primary text-white rounded-full border-2 border-white flex items-center justify-center animate-bounce">
                <span className="text-[9px] font-black">{masteryOnly.length}</span>
              </div>
            )}
          </button>
      </div>

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
              <h3 className="text-2xl font-black tracking-tighter text-on-surface leading-none">
                Monthly Milestones
              </h3>
              <p className="text-[10px] font-technical font-black uppercase tracking-widest text-primary mt-2">
                Active Cycle: {monthName} {viewYear}
              </p>
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
                "Each test is a seedling. Master them to grow your OPSC
                knowledge forest."
              </p>
            </div>

            <div className="space-y-4 max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar pr-4 pb-10">
              {masteryOnly.length === 0 ? (
                <div className="py-20 text-center bg-white/40 rounded-4xl border border-dashed border-primary/20 p-8">
                  <Sparkles className="size-8 text-primary/40 mx-auto mb-4 opacity-40" />
                  <p className="text-[10px] font-technical font-black uppercase tracking-widest text-on-surface-variant opacity-40">
                    Zero milestones manifested for this cycle
                  </p>
                </div>
              ) : (
                masteryOnly.map((test) => (
                  <button
                    key={test.id}
                    onClick={() => {
                      setSelectedDate(
                        new Date(viewYear, viewMonth - 1, test.scheduledDay),
                      );
                      setIsMilestoneDrawerOpen(false);
                    }}
                    className={`w-full group/test text-left p-4 rounded-4xl transition-all duration-500 border border-outline-variant/10 ${selectedDate?.getDate() === test.scheduledDay
                      ? "bg-primary text-on-primary shadow-lg scale-105"
                      : "bg-white hover:shadow-md hover:scale-[1.02]"
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`size-12 rounded-2xl flex items-center justify-center font-technical font-black text-xs transition-colors ${selectedDate?.getDate() === test.scheduledDay
                          ? "bg-white/20 text-white"
                          : "bg-primary/10 text-primary"
                          }`}
                      >
                        {test.scheduledDay}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-black tracking-tight truncate ${selectedDate?.getDate() === test.scheduledDay ? "text-on-primary" : "text-on-surface"}`}
                        >
                          {test.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 opacity-60">
                          <span
                            className={`text-[9px] font-technical font-black uppercase tracking-widest ${selectedDate?.getDate() === test.scheduledDay ? "text-white" : "text-primary"}`}
                          >
                            Day {test.scheduledDay}
                          </span>
                          {test.start_time && (
                            <span className="text-[9px] font-technical font-black">
                              • {test.start_time}
                            </span>
                          )}
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
              onClick={() => {
                setIsMilestoneDrawerOpen(false);
                setAutoOpenAddModal(true);
              }}
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

const AddMileStone = ({
  isMilestoneOpen,
  setIsMilestoneOpen,
  isAddExpanded,
  setIsAddExpanded,
  onAddHabit,
  masteryOnly
}: any) => {
  return (
    <div className="fixed bottom-20 lg:bottom-10 right-6 flex flex-col gap-4 items-end z-50">
      {/* Milestone Drawer Trigger */}
      {/* Speed Dial Actions */}
      <div className={`flex flex-col gap-3 transition-all duration-500 ease-botanical transform ${isAddExpanded ? "scale-100 opacity-100 translate-y-0" : "scale-50 opacity-0 translate-y-10 pointer-events-none"}`}>
        {/* Add Test Milestone */}
        <div
          className="flex items-center gap-3 group"
          style={{ transitionDelay: isAddExpanded ? '100ms' : '0ms' }}
        >
          {masteryOnly.length < 0 &&
            <>          <span className="bg-surface/95 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-technical font-black text-tertiary uppercase tracking-widest shadow-sm">Manifest Test</span>
              <button
                onClick={() => setIsMilestoneOpen(true)}
                className="size-14 bg-tertiary text-on-tertiary rounded-[1.75rem] shadow-ambient-lg shadow-tertiary/20 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-500 overflow-hidden relative"
              >
                <Award className="size-5" />
                {masteryOnly.length > 0 && (
                  <div className="absolute -top-1 -right-1 size-5 bg-primary text-white rounded-full border-2 border-white flex items-center justify-center animate-bounce">
                    <span className="text-[9px] font-black">{masteryOnly.length}</span>
                  </div>
                )}
              </button>
            </>

          }
        </div>
        <div
          className="flex items-center gap-3 group"
          style={{ transitionDelay: isAddExpanded ? '100ms' : '0ms' }}
        >
          <span className="bg-surface/95 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-technical font-black text-tertiary uppercase tracking-widest shadow-sm">Manifest Test</span>
          <button
            onClick={() => { onAddHabit("test"); setIsAddExpanded(false); }}
            className="size-14 bg-tertiary text-on-tertiary rounded-2xl shadow-ambient-lg shadow-tertiary/10 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300"
          >
            <Award className="size-5" />
          </button>
        </div>

        {/* Add Daily Routine */}
        <div
          className="flex items-center gap-3 group"
          style={{ transitionDelay: isAddExpanded ? '50ms' : '0ms' }}
        >
          <span className="bg-surface/95 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-technical font-black text-primary uppercase tracking-widest shadow-sm">Manifest Routine</span>
          <button
            onClick={() => { onAddHabit("routine"); setIsAddExpanded(false); }}
            className="size-14 bg-primary text-white rounded-2xl shadow-ambient-lg shadow-primary/10 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300"
          >
            <Zap className="size-5" />
          </button>
        </div>
      </div>

      {/* Main Speed Dial FAB */}
      <button
        onClick={() => setIsAddExpanded(!isAddExpanded)}
        className={`lg:hidden size-12 rounded-4xl shadow-ambient-lg flex items-center justify-center transition-all duration-500 ${isAddExpanded ? 'bg-on-surface text-surface rotate-45' : 'bg-primary text-white'}`}
      >
        <PlusIcon className="size-6" />
      </button>
    </div>
  );
};