import { FireIcon } from "@heroicons/react/24/outline";
import {
  Bell,
  CheckSquare,
  Clock,
  Loader,
  Sparkles,
  Trash,
  Edit3,
  TrendingUp,
  Target,
  Flame,
  CalendarDays,
  BookMarked,
  ArrowRight,
} from "lucide-react";
import React, { useEffect, useRef, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../store";
import { fetchExams } from "../../slice/examSlice";
import { useNavigate, Outlet, useLocation } from "react-router";
import { supabase } from "../../utils/supabase";
import { UpcomingMockTest } from "../../components/userDashboard/UpcomingMockTest";
import { DashboardDailyRoutine } from "../../components/userDashboard/DashboardDailyRoutine";
import { ExamSelectorCard } from "../../components/ui/ExamSelectorCard";
import Exam from "../../components/Exam";
import { ExamSelectorCardMobile } from "../../components/ui/ExamSelectorCardMobile";
import { SubjectListSection } from "../../components/ui/SubjectListSection";
import { fetchExamSubjects } from "../../slice/examSubjectSlice";
import { ChapterListSection } from "../../components/ui/ChapterListSection";

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

const format12h = (timeStr: string | undefined) => {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

const motivationalQuotes = [
  "Every expert was once a beginner. Keep going!",
  "Success is the sum of small efforts, repeated day in and day out.",
  "Your dedication today builds your success tomorrow.",
  "Discipline is the bridge between goals and achievement.",
  "One chapter a day keeps failure away.",
];

const UserDashboard = () => {
  const { user, profile } = useSelector((state: RootState) => state.user);
  const { examData, loading: examsLoading } = useSelector(
    (state: RootState) => state.exams ?? { examData: [], loading: false },
  );

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const targetRef = useRef<HTMLDivElement>(null);

  const [habits, setHabits] = useState<Habit[]>([]);
  const [progress, setProgress] = useState<Record<string, boolean[]>>({});
  const [ritualsLoading, setRitualsLoading] = useState(true);

  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const currentYear = now.getFullYear();
  const currentMonth = currentMonthIdx + 1;
  const today = now.getDate();

  const [isDailRoutineOpen, setIsDailRoutineOpen] = useState(false);
  const [isQuickEditOpen, setIsQuickEditOpen] = useState(false);
  const [quickEditData, setQuickEditData] = useState<{
    habit: Habit;
    day: number;
  } | null>(null);

  // Pick a random motivational quote
  const quote = useMemo(
    () => motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)],
    [],
  );

  const fetchDailyData = async () => {
    if (!user?.id) return;
    try {
      setRitualsLoading(true);
      const [habitsRes, masteryRes] = await Promise.all([
        supabase
          .from("study_habits")
          .select("*")
          .eq("user_id", user.id)
          .eq("month", currentMonth)
          .eq("year", currentYear),
        supabase
          .from("user_mastery")
          .select("*, chapters(name)")
          .eq("user_id", user.id)
          .eq("month", currentMonth)
          .eq("year", currentYear),
      ]);

      const allHabits: Habit[] = [];
      const allProgress: Record<string, boolean[]> = {};

      (habitsRes.data || []).forEach((h) => {
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

      (masteryRes.data || []).forEach((m) => {
        allHabits.push({
          id: m.id,
          name: m.chapters?.name || "Unknown Chapter",
          priority: m.priority as any,
          category: "theory",
          start_time: m.start_time,
          end_time: m.end_time,
          is_mastery: true,
          chapter_id: m.chapter_id,
          exam_id: m.exam_id,
          is_recurring: m.is_recurring !== false,
        });
        allProgress[m.id] = m.progress || Array(31).fill(false);
      });

      setHabits(allHabits);
      setProgress(allProgress);
    } catch (err) {
      console.error("Error fetching daily data:", err);
    } finally {
      setRitualsLoading(false);
    }
  };

  const handleUpdateSchedule = async (
    id: string,
    isMastery: boolean,
    newDay: number,
    newTime: string,
  ) => {
    if (!user?.id) return;
    try {
      const table = isMastery ? "user_mastery" : "study_habits";
      const newProgress = Array(31).fill(false);
      newProgress[newDay - 1] = true;

      const { error } = await supabase
        .from(table)
        .update({
          progress: newProgress,
          start_time: newTime,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      await fetchDailyData();
    } catch (err) {
      console.error("Timeline Sync Failed:", err);
      alert("Could not update: " + (err as Error).message);
    }
  };

  const handleDeleteRitual = async (id: string, isMastery: boolean) => {
    if (!user?.id) return;
    try {
      const table = isMastery ? "user_mastery" : "study_habits";
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      fetchDailyData();
    } catch (err) {
      console.error("Deletion failed:", err);
    }
  };

  useEffect(() => {
    dispatch(fetchExams());
    dispatch(fetchExamSubjects(examData?.[0]?.id || ""));
    fetchDailyData();

    const isDesktop = window.innerWidth >= 1024;
    if (!isDesktop) return;

    const timer = setTimeout(() => {
      const element = targetRef.current;
      if (!element) return;

      const scrollableParent = element.closest(".overflow-y-auto");
      if (scrollableParent) {
        const targetPos = element.offsetTop - 80;
        const startPos = scrollableParent.scrollTop;
        const distance = targetPos - startPos;
        const duration = 1500;

        const cubicBezier = (t: number) =>
          t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        const step = (timestamp: number) => {
          if (!start) start = timestamp;
          const progressStep = Math.min((timestamp - start) / duration, 1);
          scrollableParent.scrollTop =
            startPos + distance * cubicBezier(progressStep);
          if (progressStep < 1) {
            requestAnimationFrame(step);
          }
        };
        let start: number | null = null;
        requestAnimationFrame(step);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [dispatch, user?.id]);

  const handleToggle = async (id: string) => {
    if (!user?.id) return;
    const habit = habits.find((h) => h.id === id);
    if (!habit) return;

    const dayIdx = today - 1;
    const newProg = [...(progress[id] || Array(31).fill(false))];
    newProg[dayIdx] = !newProg[dayIdx];

    setProgress((prev) => ({ ...prev, [id]: newProg }));

    try {
      const table = habit.is_mastery ? "user_mastery" : "study_habits";
      const { error } = await supabase
        .from(table)
        .update({ progress: newProg, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) {
        console.error("Update Error:", error);
        fetchDailyData();
      }
    } catch (err) {
      console.error("Toggle failed:", err);
      fetchDailyData();
    }
  };

  const dailyRituals = useMemo(() => {
    return habits
      .filter((h) => !h.is_mastery)
      .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
  }, [habits]);

  const targetedExams = useMemo(() => {
    if (!examData || !profile?.target_exams) return [];
    return examData.filter((el) => profile.target_exams.includes(el.id));
  }, [examData, profile?.target_exams]);

  // Derived quick stats
  const todayDoneCount = dailyRituals.filter((r) => progress[r.id]?.[today - 1]).length;
  const todayTotalCount = dailyRituals.length;
  const pendingCount = todayTotalCount - todayDoneCount;
  const scheduledTestsCount = habits.filter((h) => h.is_mastery).length;

  if (examsLoading) return <DashboardSkeleton />;

  const firstName =
    (
      profile?.full_name ||
      user?.identities?.[0]?.identity_data?.name
    )?.split(" ")[0] || "there";

  return (
    <div className="relative overflow-y-auto md:overscroll-y-none min-h-screen">
      <div className="space-y-8 p-3 lg:p-6 animate-reveal pb-28">

        {/* ── HERO SECTION ─────────────────────────────────────── */}
        <section className="relative">
          {/* Mobile-only greeting banner */}
          <div className="lg:hidden mb-6">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/15 via-primary/8 to-transparent border border-primary/10 p-5">
              {/* Decorative blob */}
              <div className="absolute -top-8 -right-8 size-36 rounded-full bg-primary/8" />
              <div className="relative z-10">
                <p className="text-[10px] font-technical font-black uppercase tracking-[0.3em] text-primary opacity-70 mb-1">
                  {getGreeting()}
                </p>
                <h1 className="text-2xl font-black tracking-tighter text-on-surface leading-tight mb-2">
                  Welcome back,{" "}
                  <span className="text-primary italic font-serif capitalize">
                    {firstName}
                  </span>
                </h1>
                <p className="text-xs text-on-surface-variant opacity-60 font-medium leading-relaxed">
                  {quote}
                </p>

                {/* Mini progress bar for today */}
                {todayTotalCount > 0 && (
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-technical font-black uppercase tracking-wider text-on-surface-variant opacity-50">
                        Today's Progress
                      </span>
                      <span className="text-[9px] font-technical font-black text-primary">
                        {todayDoneCount}/{todayTotalCount} tasks
                      </span>
                    </div>
                    <div className="h-1.5 bg-on-surface/8 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-700"
                        style={{
                          width: `${todayTotalCount > 0 ? Math.round((todayDoneCount / todayTotalCount) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Desktop greeting row */}
          <div className="hidden lg:flex flex-row lg:items-end justify-between gap-8">
            <div className="animate-greeting">
              <p className="text-[10px] font-technical font-black uppercase tracking-[0.3em] text-primary opacity-60 mb-2">
                {getGreeting()}
              </p>
              <h1 className="text-5xl font-black tracking-tighter text-on-surface leading-[0.85] pb-3">
                Welcome back,{" "}
                <span className="text-primary italic font-serif capitalize">
                  {firstName}
                </span>
              </h1>
              <p className="text-on-surface-variant max-w-xl text-sm leading-relaxed opacity-0 animate-greeting-delay font-medium">
                {quote}
              </p>
            </div>

            {/* Desktop Quick Stat Cards */}
            <div className="flex gap-3 flex-shrink-0">
              {/* Study Streak */}
              <div className="bg-surface-container-high px-5 py-4 rounded-2xl shadow-ambient hover:shadow-ambient-lg hover:-translate-y-0.5 transition-all duration-500 border border-on-surface/5 group min-w-[120px]">
                <p className="text-[9px] font-technical text-on-surface-variant uppercase font-black tracking-[0.2em] mb-2 opacity-50 group-hover:opacity-80 transition-opacity">
                  Study Streak
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-technical font-black text-on-surface">
                    {profile?.streak || 0}
                  </span>
                  <FireIcon className="size-6 text-amber-500 animate-pulse" />
                </div>
                <p className="text-[9px] text-on-surface-variant opacity-40 font-technical font-black uppercase tracking-wider mt-1">Days</p>
              </div>

              {/* Today's Tasks */}
              <div className="bg-surface-container-high px-5 py-4 rounded-2xl shadow-ambient hover:shadow-ambient-lg hover:-translate-y-0.5 transition-all duration-500 border border-on-surface/5 group min-w-[120px]">
                <p className="text-[9px] font-technical text-on-surface-variant uppercase font-black tracking-[0.2em] mb-2 opacity-50 group-hover:opacity-80 transition-opacity">
                  Today's Tasks
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-technical font-black text-on-surface">
                    {todayDoneCount}
                    <span className="text-sm text-on-surface-variant opacity-40 font-medium">/{todayTotalCount}</span>
                  </span>
                  <CheckSquare className="size-5 text-primary" />
                </div>
                <div className="mt-2 h-1 bg-on-surface/8 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-700"
                    style={{ width: `${todayTotalCount > 0 ? Math.round((todayDoneCount / todayTotalCount) * 100) : 0}%` }}
                  />
                </div>
              </div>

              {/* Scheduled Tests */}
              <div className="bg-surface-container-high px-5 py-4 rounded-2xl shadow-ambient hover:shadow-ambient-lg hover:-translate-y-0.5 transition-all duration-500 border border-on-surface/5 group min-w-[120px]">
                <p className="text-[9px] font-technical text-on-surface-variant uppercase font-black tracking-[0.2em] mb-2 opacity-50 group-hover:opacity-80 transition-opacity">
                  Upcoming Tests
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-technical font-black text-on-surface">
                    {scheduledTestsCount}
                  </span>
                  <Target className="size-5 text-primary" />
                </div>
                <p className="text-[9px] text-on-surface-variant opacity-40 font-technical font-black uppercase tracking-wider mt-1">Scheduled</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── MOBILE QUICK STATS ────────────────────────────────── */}
        <section className="lg:hidden grid grid-cols-3 gap-2.5">
          <div className="bg-surface-container-high px-3 py-3.5 rounded-2xl border border-on-surface/5 shadow-ambient text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <FireIcon className="size-4 text-amber-500" />
            </div>
            <p className="text-xl font-technical font-black text-on-surface">{profile?.streak || 0}</p>
            <p className="text-[8px] font-technical font-black uppercase tracking-wider text-on-surface-variant opacity-40 mt-0.5">Streak</p>
          </div>
          <div className="bg-surface-container-high px-3 py-3.5 rounded-2xl border border-on-surface/5 shadow-ambient text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <CheckSquare className="size-4 text-primary" />
            </div>
            <p className="text-xl font-technical font-black text-on-surface">{todayDoneCount}/{todayTotalCount}</p>
            <p className="text-[8px] font-technical font-black uppercase tracking-wider text-on-surface-variant opacity-40 mt-0.5">Tasks</p>
          </div>
          <div className="bg-surface-container-high px-3 py-3.5 rounded-2xl border border-on-surface/5 shadow-ambient text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Target className="size-4 text-primary" />
            </div>
            <p className="text-xl font-technical font-black text-on-surface">{scheduledTestsCount}</p>
            <p className="text-[8px] font-technical font-black uppercase tracking-wider text-on-surface-variant opacity-40 mt-0.5">Tests</p>
          </div>
        </section>

        {/* ── DAILY TASKS PANEL (mobile inline) ────────────────── */}
        {!ritualsLoading && dailyRituals.length > 0 && (
          <section className="lg:hidden">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="space-y-0.5">
                <p className="text-[10px] font-technical font-black uppercase tracking-[0.25em] text-on-surface-variant opacity-50">Today</p>
                <h2 className="text-base font-black text-on-surface tracking-tight">Daily Tasks</h2>
              </div>
              <button
                onClick={() => setIsDailRoutineOpen(true)}
                className="text-[9px] font-technical font-black uppercase tracking-widest text-primary flex items-center gap-1"
              >
                View All <ArrowRight size={11} />
              </button>
            </div>
            <div className="space-y-2">
              {dailyRituals.slice(0, 4).map((habit) => {
                const isDone = progress[habit.id]?.[today - 1];
                return (
                  <label
                    key={habit.id}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-300 ${
                      isDone
                        ? "bg-on-surface/4 opacity-60"
                        : "bg-surface-container-high shadow-ambient border border-on-surface/5 hover:shadow-ambient-lg"
                    }`}
                  >
                    <div className="relative size-5 shrink-0">
                      <input
                        className="peer hidden"
                        type="checkbox"
                        checked={isDone || false}
                        onChange={() => handleToggle(habit.id)}
                      />
                      <div className={`size-full rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${
                        isDone ? "bg-primary border-primary" : "border-on-surface/20"
                      }`}>
                        {isDone && <CheckSquare className="size-3.5 text-white" strokeWidth={3} />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-black tracking-tight block truncate ${
                        isDone ? "line-through text-on-surface-variant opacity-40" : "text-on-surface"
                      }`}>
                        {habit.name}
                      </span>
                      {habit.start_time && (
                        <span className="text-[9px] font-technical font-black text-on-surface-variant opacity-45 flex items-center gap-1 mt-0.5">
                          <Clock size={8} /> {format12h(habit.start_time)}
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
              {dailyRituals.length > 4 && (
                <button
                  onClick={() => setIsDailRoutineOpen(true)}
                  className="w-full py-3 text-center text-[10px] font-technical font-black uppercase tracking-widest text-primary opacity-60 hover:opacity-100 transition-opacity"
                >
                  +{dailyRituals.length - 4} more tasks
                </button>
              )}
            </div>
          </section>
        )}

        {/* ── MAIN 12-COL GRID ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
          {/* Left Column — 8 cols */}
          <div className="lg:col-span-8 space-y-8">
            {/* Desktop Exam Cards */}
            <ExamSelectorCard
              targetedExams={targetedExams}
              onSelect={(exam) => navigate(`exam/${exam.id}`)}
              onViewAll={() => navigate("/select-exams")}
              loading={examsLoading}
            />

            {/* Subject List (all breakpoints) */}
            <SubjectListSection targetedExams={targetedExams} />

            {/* Mobile Exam Cards */}
            <ExamSelectorCardMobile
              targetedExams={targetedExams}
              onSelect={(exam) => navigate(`exam/${exam.id}`)}
              onViewAll={() => navigate("/select-exams")}
              loading={examsLoading}
            />
          </div>

          {/* Mobile-only Chapter Section */}
          <div className="block space-y-5 lg:hidden">
            <ChapterListSection targetedExams={targetedExams} />
          </div>

          {/* Right Sidebar — 4 cols */}
          <div className="hidden lg:flex lg:col-span-4 flex-col space-y-8">
            {/* Upcoming Mock Tests */}
            <UpcomingMockTest
              habits={habits}
              progress={progress}
              onDelete={handleDeleteRitual}
              onNavigate={(examId, chapterId) =>
                navigate(`exam/${examId}`, {
                  state: { autoOpenChapterId: chapterId },
                })
              }
              onEdit={(habit, day) => {
                setQuickEditData({ habit, day });
                setIsQuickEditOpen(true);
              }}
            />

            {/* Desktop Daily Tasks Panel */}
            <section className="rounded-3xl overflow-hidden border border-on-surface/5 bg-surface-container-high/60 shadow-ambient">
              <div className="px-5 pt-5 pb-4 border-b border-on-surface/5">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-technical font-black uppercase tracking-[0.25em] text-on-surface-variant opacity-50">Today</p>
                    <h3 className="text-base font-black text-on-surface tracking-tight">Daily Tasks</h3>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-highest/60 rounded-full border border-on-surface/5">
                    {ritualsLoading ? (
                      <Loader className="size-3 animate-spin text-primary" />
                    ) : (
                      <>
                        <div className={`size-2 rounded-full ${pendingCount > 0 ? "bg-amber-500 animate-pulse" : "bg-primary"}`} />
                        <span className="text-[9px] font-technical font-black uppercase tracking-wider text-on-surface-variant opacity-60">
                          {pendingCount > 0 ? `${pendingCount} pending` : "All done!"}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="divide-y divide-on-surface/5 max-h-[320px] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                {ritualsLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3 opacity-50">
                    <Loader className="size-5 animate-spin text-primary" />
                    <span className="text-[9px] font-technical uppercase tracking-widest font-black text-on-surface-variant">Syncing...</span>
                  </div>
                ) : dailyRituals.length === 0 ? (
                  <div className="px-6 py-10 text-center">
                    <Sparkles className="size-7 text-primary opacity-30 mx-auto mb-3" />
                    <p className="text-sm font-black text-on-surface mb-1">No tasks set</p>
                    <p className="text-xs text-on-surface-variant opacity-50 font-medium">Add tasks in the Study Planner.</p>
                  </div>
                ) : (
                  dailyRituals.slice(0, 8).map((habit) => {
                    const isDone = progress[habit.id]?.[today - 1];
                    return (
                      <label
                        key={habit.id}
                        className={`flex items-center gap-3.5 px-5 py-3.5 cursor-pointer transition-all duration-300 ${
                          isDone ? "opacity-50" : "hover:bg-surface-container-highest/40"
                        }`}
                      >
                        <div className="relative size-5 shrink-0">
                          <input
                            className="peer hidden"
                            type="checkbox"
                            checked={isDone || false}
                            onChange={() => handleToggle(habit.id)}
                          />
                          <div className={`size-full rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${
                            isDone ? "bg-primary border-primary" : "border-on-surface/20 hover:border-primary/50"
                          }`}>
                            {isDone && <CheckSquare className="size-3.5 text-white" strokeWidth={3} />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm font-black tracking-tight block truncate transition-all ${
                            isDone ? "line-through text-on-surface-variant opacity-40" : "text-on-surface"
                          }`}>
                            {habit.name}
                          </span>
                          {habit.start_time && (
                            <span className="text-[9px] font-technical font-black text-on-surface-variant opacity-45 flex items-center gap-1 mt-0.5">
                              <Clock size={8} /> {format12h(habit.start_time)}
                            </span>
                          )}
                        </div>
                        {habit.is_mastery && (
                          <div className="ml-auto px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[8px] font-black uppercase tracking-widest flex-shrink-0">
                            Test
                          </div>
                        )}
                      </label>
                    );
                  })
                )}
              </div>

              {!ritualsLoading && dailyRituals.length > 0 && (
                <div className="border-t border-on-surface/5 px-4 py-3">
                  <button
                    onClick={() => setIsDailRoutineOpen(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-surface-container-highest/60 hover:bg-primary/10 text-on-surface-variant hover:text-primary text-[10px] font-technical font-black uppercase tracking-widest transition-all duration-300 group"
                  >
                    View Full Routine
                    <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Footer */}
        <footer className="hidden pt-12 pb-6 px-2 md:flex flex-col lg:flex-row items-center justify-between gap-8 border-t border-on-surface/5 opacity-25 group hover:opacity-50 transition-opacity">
          <p className="text-[9px] font-technical font-black uppercase tracking-[0.4em] leading-relaxed max-w-sm text-center lg:text-left">
            © 2026 Arumind — Built for Odisha government exam students.
          </p>
          <div className="flex gap-8">
            <span className="text-[9px] font-technical font-black uppercase tracking-widest cursor-help hover:text-primary transition-colors hover:underline">
              Privacy
            </span>
            <span className="text-[9px] font-technical font-black uppercase tracking-widest cursor-help hover:text-primary transition-colors hover:underline">
              Terms
            </span>
          </div>
        </footer>
      </div>

      {/* FAB — Daily Routine */}
      <button
        onClick={() => setIsDailRoutineOpen(true)}
        className="fixed bottom-24 lg:bottom-10 right-5 h-14 px-5 bg-primary text-white rounded-full shadow-ambient-lg shadow-primary/25 flex items-center gap-3 hover:shadow-primary/40 hover:scale-105 active:scale-95 transition-all duration-500 z-50 group overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <CheckSquare className="size-5 transition-transform group-hover:rotate-12" />
        <span className="text-[10px] font-technical font-black uppercase tracking-widest">Tasks</span>
        {pendingCount > 0 && (
          <div className="size-5 bg-amber-500 rounded-full flex items-center justify-center text-white">
            <span className="text-[9px] font-black">{pendingCount}</span>
          </div>
        )}
      </button>

      {/* Drawers & Modals */}
      <DashboardDailyRoutine
        isOpen={isDailRoutineOpen}
        onClose={() => setIsDailRoutineOpen(false)}
        targetedExams={targetedExams}
        dailyRituals={dailyRituals}
        progress={progress}
        today={today}
        handleToggle={handleToggle}
      />
      <QuickScheduleModal
        isOpen={isQuickEditOpen}
        onClose={() => setIsQuickEditOpen(false)}
        habit={quickEditData?.habit || null}
        day={quickEditData?.day || 0}
        onUpdate={handleUpdateSchedule}
      />
    </div>
  );
};

export default UserDashboard;

// ── QUICK SCHEDULE MODAL ───────────────────────────────────────────────────────
const QuickScheduleModal = ({
  isOpen,
  onClose,
  habit,
  day,
  onUpdate,
}: {
  isOpen: boolean;
  onClose: () => void;
  habit: Habit | null;
  day: number;
  onUpdate: (
    id: string,
    isMastery: boolean,
    newDay: number,
    newTime: string,
  ) => Promise<void>;
}) => {
  const [selectedDay, setSelectedDay] = useState(day);
  const [selectedTime, setSelectedTime] = useState(
    habit?.start_time || "09:00",
  );
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (habit) {
      setSelectedDay(day);
      setSelectedTime(habit.start_time || "09:00");
    }
  }, [habit, day]);

  if (!isOpen || !habit) return null;

  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-6 lg:p-12 animate-in fade-in duration-500">
      <div
        className="absolute inset-0 bg-on-surface/20 backdrop-blur-xl"
        onClick={onClose}
      />
      <div className="relative bg-surface-container-high rounded-3xl shadow-ambient-lg w-full max-w-lg overflow-hidden border border-on-surface/8 p-8 animate-in zoom-in-95 slide-in-from-bottom-8 duration-700">
        <header className="mb-8">
          <h3 className="text-2xl font-black tracking-tighter leading-none mb-2">
            Reschedule
          </h3>
          <p className="text-xs opacity-60 font-medium">
            Update timing for{" "}
            <span className="font-bold text-primary italic">
              "{habit.name}"
            </span>
          </p>
        </header>

        <div className="space-y-6">
          {/* Day Picker */}
          <div>
            <label className="text-[10px] font-technical font-black uppercase tracking-[0.4em] text-primary mb-3 block">
              Pick a Day
            </label>
            <div className="grid grid-cols-7 gap-1.5">
              {daysInMonth.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  className={`h-9 rounded-xl text-[11px] font-black transition-all ${
                    selectedDay === d
                      ? "bg-primary text-white shadow-md shadow-primary/20 scale-110"
                      : "bg-surface-container-highest/50 hover:bg-surface-container-highest text-on-surface opacity-60"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Time Picker */}
          <div>
            <label className="text-[10px] font-technical font-black uppercase tracking-[0.4em] text-primary mb-3 block">
              Start Time
            </label>
            <input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full bg-surface-container-highest/40 border-2 border-on-surface/8 rounded-2xl px-5 py-4 text-xl font-black outline-none focus:border-primary/30 transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-4 rounded-full font-technical font-black text-[11px] uppercase tracking-widest text-on-surface-variant hover:bg-on-surface/5 transition-all"
            >
              Cancel
            </button>
            <button
              disabled={updating}
              onClick={async () => {
                setUpdating(true);
                await onUpdate(
                  habit.id,
                  habit.is_mastery || false,
                  selectedDay,
                  selectedTime,
                );
                setUpdating(false);
                onClose();
              }}
              className="flex-1 py-4 bg-primary text-white rounded-full font-technical font-black text-[11px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {updating ? (
                <Loader className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── SKELETON ──────────────────────────────────────────────────────────────────
const DashboardSkeleton = () => {
  return (
    <div className="space-y-8 animate-pulse pb-20 p-3 lg:p-6">
      {/* Greeting */}
      <div className="space-y-3">
        <div className="h-3 w-24 bg-surface-container-low rounded-full" />
        <div className="h-12 w-80 bg-surface-container-low rounded-2xl" />
        <div className="h-3 w-60 bg-surface-container-low rounded-full" />
      </div>
      {/* Quick Stats */}
      <div className="flex gap-3">
        <div className="h-24 w-32 bg-surface-container-low rounded-2xl" />
        <div className="h-24 w-32 bg-surface-container-low rounded-2xl" />
        <div className="h-24 w-32 bg-surface-container-low rounded-2xl" />
      </div>
      {/* Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-4">
          <div className="h-48 bg-surface-container-low rounded-3xl" />
          <div className="h-32 bg-surface-container-low rounded-3xl" />
        </div>
        <div className="lg:col-span-4">
          <div className="h-80 bg-surface-container-low rounded-3xl" />
        </div>
      </div>
    </div>
  );
};
