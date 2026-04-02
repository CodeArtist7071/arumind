import { FireIcon } from "@heroicons/react/24/outline";
import {
  Bell,
  ChevronRight,
  SearchAlert,
  Settings,
  Notebook,
  TrendingUp,
  History,
  Target,
  CheckSquare,
  Clock,
  Loader,
  Sparkles,
  Trash,
  Edit3
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

const UserDashboard = () => {
  const { user, profile } = useSelector((state: RootState) => state.user);
  const { examData, loading: examsLoading } = useSelector((state: RootState) => state.exams ?? { examData: [], loading: false });
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
  // const [selectedExamInDrawer, setSelectedExamInDrawer] = useState<string | null>(null);

  const [isQuickEditOpen, setIsQuickEditOpen] = useState(false);
  const [quickEditData, setQuickEditData] = useState<{ habit: Habit, day: number } | null>(null);

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

  const handleUpdateSchedule = async (id: string, isMastery: boolean, newDay: number, newTime: string) => {
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
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;
      await fetchDailyData();
    } catch (err) {
      console.error("Timeline Sync Failed:", err);
      alert("Temporal Manifestation Alert: " + (err as Error).message);
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
    fetchDailyData();

    const timer = setTimeout(() => {
      const element = targetRef.current;
      if (!element) return;

      const scrollableParent = element.closest('.overflow-y-auto');
      if (scrollableParent) {
        const targetPos = element.offsetTop - 80;
        const startPos = scrollableParent.scrollTop;
        const distance = targetPos - startPos;
        const duration = 1500;

        const cubicBezier = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        const step = (timestamp: number) => {
          if (!start) start = timestamp;
          const progressStep = Math.min((timestamp - start) / duration, 1);
          scrollableParent.scrollTop = startPos + distance * cubicBezier(progressStep);
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



  console.log("Daily Rituals:", dailyRituals);

  const targetedExams = useMemo(() => {
    if (!examData || !profile?.target_exams) return [];
    return examData.filter((el) => profile.target_exams.includes(el.id));
  }, [examData, profile?.target_exams]);

  const subjectProgress = [
    { name: "History & Geography of Odisha", percent: 82 },
    { name: "General Studies & Current Affairs", percent: 45 },
    { name: "Odia Language & Literature", percent: 95 },
    { name: "Aptitude & Mental Ability", percent: 30 },
  ];

  if (examsLoading) return <DashboardSkeleton />;


  return (
    <div className="relative min-h-screen">
      <div className="space-y-12 pb-20 p-2 lg:p-6 animate-reveal">
        <section className="relative px-2">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="animate-greeting">
              <h1 className="text-4xl lg:text-6xl font-black tracking-tighter text-on-surface leading-[0.85] mb-8">
                Namaskar,<br />
                <span className="text-primary italic font-serif -ml-2 lg:-ml-4 drop-shadow-sm select-none">
                  {(profile?.full_name || user?.identities?.[0]?.identity_data?.name)?.split(' ')[0]}
                </span>
              </h1>
              <p className="text-on-surface-variant max-w-xl text-md lg:text-2xl leading-relaxed opacity-0 animate-greeting-delay font-medium font-narrative">
                Your OPSC preparation is <span className="font-technical font-black text-primary border-b-2 border-primary/20">65%</span> complete.
                You are currently in the top <span className="font-technical font-black text-primary border-b-2 border-primary/20">5%</span> of botanical aspirants.
              </p>
            </div>

            <div className="flex  gap-4">
              <div className="bg-surface-container-low px-2 py-4 md:px-8 md:py-6 rounded-[2.5rem] shadow-ambient hover:scale-105 transition-transform duration-500 group">
                <p className="text-[9px] font-technical text-on-surface-variant uppercase font-black tracking-[0.2em] mb-2 opacity-50 group-hover:opacity-100 transition-opacity">
                  Daily Streak
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-technical font-black text-tertiary">12</span>
                  <FireIcon className="size-8 text-tertiary animate-pulse" />
                </div>
              </div>

              <div className="bg-surface-container-low px-2 py-4 md:px-8 md:py-6 rounded-[2.5rem] shadow-ambient hover:scale-105 transition-transform duration-500 group">
                <p className="text-[9px] font-technical text-on-surface-variant uppercase font-black tracking-[0.2em] mb-2 opacity-50 group-hover:opacity-100 transition-opacity">
                  Daily Goal
                </p>
                <div className="flex items-center gap-4">
                  <span className="text-3xl font-technical font-black text-on-surface">4/6 <span className="text-[10px] opacity-40 uppercase tracking-tighter ml-1">Hrs</span></span>
                  <div className="w-20 h-5 bg-surface-container-high rounded-full overflow-hidden p-1 shadow-inner ring-1 ring-black/5">
                    <div className="bg-primary h-full w-[66%] rounded-full shadow-sm transition-all duration-1000" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pt-8">
          <div className="lg:col-span-8 space-y-12">
           <ExamSelectorCard targetRef={targetRef} targetedExams={targetedExams} />

            <section>
              <h3 className="text-[11px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-60 mb-8 px-2">Growth Analytics</h3>
              <div className="bg-surface-container-high rounded-[3rem] p-10 shadow-ambient">
                <div className="space-y-10">
                  {subjectProgress.map((subject, index) => (
                    <div key={index}>
                      <div className="flex justify-between items-end mb-4 px-1">
                        <span className="font-bold text-on-surface tracking-tight">{subject.name}</span>
                        <span className="text-xs font-technical font-black text-primary tracking-widest">
                          {subject.percent}%
                        </span>
                      </div>
                      <div className="w-full h-6 bg-surface-container-high rounded-full overflow-hidden p-1.5 shadow-inner ring-1 ring-black/5">
                        <div
                          className="bg-linear-to-r from-primary to-primary-container h-full rounded-full shadow-sm transition-all duration-2000 ease-out shadow-primary/20"
                          style={{ width: `${subject.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <div className="lg:col-span-4 space-y-12">
            <UpcomingMockTest
              habits={habits}
              progress={progress}
              onDelete={handleDeleteRitual}
              onNavigate={(examId, chapterId) => navigate(`exam/${examId}`, { state: { autoOpenChapterId: chapterId } })}
              onEdit={(habit, day) => {
                setQuickEditData({ habit, day });
                setIsQuickEditOpen(true);
              }}
            />

            {/* <section className="bg-surface-container-high rounded-[3rem] p-10 shadow-ambient">
              <h3 className="text-[11px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-50 mb-10 flex items-center gap-4">
                <div className="size-2.5 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(0,110,47,0.5)]" />
                Daily Rituals
              </h3>
              <div className="space-y-4">
                {ritualsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-4 opacity-50">
                    <Loader className="size-6 animate-spin" />
                    <span className="text-[10px] font-technical uppercase tracking-widest font-black">Aligning Rituals...</span>
                  </div>
                ) : dailyRituals.length === 0 ? (
                  <div className="p-8 text-center bg-white/40 rounded-4xl border border-dashed border-primary/20">
                     <Sparkles className="size-8 text-primary/40 mx-auto mb-4" />
                     <p className="text-xs font-technical font-black uppercase tracking-widest text-on-surface-variant opacity-60">
                       No rituals set for today.<br />
                       Plant your seeds in the planner.
                     </p>
                  </div>
                ) : dailyRituals.map((habit) => {
                  const isDone = progress[habit.id]?.[today - 1];
                  return (
                    <label
                      key={habit.id}
                      className={`flex items-center gap-5 p-6 rounded-4xl cursor-pointer transition-all duration-500 ease-(--ease-botanical) hover:scale-[1.03] ${!isDone
                        ? "bg-white shadow-ambient ring-2 ring-primary/5"
                        : "bg-surface-container-high/40 opacity-60 grayscale hover:grayscale-0 hover:opacity-100"
                        }`}
                    >
                      <div className="relative size-6 shrink-0">
                        <input
                          className="peer hidden"
                          type="checkbox"
                          checked={isDone || false}
                          onChange={() => handleToggle(habit.id)}
                        />
                        <div className="size-full rounded-lg border-2 border-primary/20 flex items-center justify-center transition-all peer-checked:bg-primary peer-checked:border-primary peer-checked:rotate-0 rotate-45 group">
                          {isDone && <CheckSquare className="size-4 text-white" strokeWidth={3} />}
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span
                          className={`text-sm font-black tracking-tight transition-all duration-500 ${isDone ? "line-through text-on-surface-variant opacity-40 font-medium" : "text-on-surface"}`}
                        >
                          {habit.name}
                        </span>
                        {habit.start_time && (
                          <span className="text-[9px] font-technical font-black tracking-widest text-primary uppercase flex items-center gap-1 opacity-60">
                            <Clock size={8} /> {format12h(habit.start_time)}
                          </span>
                        )}
                      </div>
                      {habit.is_mastery && (
                         <div className="ml-auto px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary text-[8px] font-black uppercase tracking-widest">Test</div>
                      )}
                    </label>
                  );
                })}
              </div>
            </section> */}
          </div>
        </div>

        <footer className="pt-20 pb-10 px-2 flex flex-col lg:flex-row items-center justify-between gap-8 border-t border-on-surface/5 opacity-30 group">
          <p className="text-[9px] font-technical font-black uppercase tracking-[0.4em] leading-relaxed max-w-sm text-center lg:text-left">
            © 2026 ARUMIND DIGITAL JOURNAL. ARCHITECTED FOR CONSISTENT GROWTH AND INTENTIONAL LEARNING.
          </p>
          <div className="flex gap-8">
            <span className="text-[9px] font-technical font-black uppercase tracking-widest cursor-help hover:text-primary transition-colors hover:underline">Privacy</span>
            <span className="text-[9px] font-technical font-black uppercase tracking-widest cursor-help hover:text-primary transition-colors hover:underline">Terms</span>
          </div>
        </footer>
      </div>

      <button
        onClick={() => setIsDailRoutineOpen(true)}
        className="fixed bottom-25 lg:bottom-10 right-5 size-16 bg-primary text-white rounded-[2.5rem] shadow-ambient-lg shadow-primary/20 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-500 z-50 group overflow-hidden"
      >
        <div className="absolute inset-0 bg-linear-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <CheckSquare className="size-6 transition-transform group-hover:rotate-12" />
        <div className="absolute -top-1 -right-1 size-4 bg-tertiary rounded-full border-2 border-primary flex items-center justify-center animate-bounce">
          <span className="text-[8px] font-black">{dailyRituals.filter(r => !progress[r.id]?.[today - 1]).length}</span>
        </div>
      </button>

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



const QuickScheduleModal = ({
  isOpen,
  onClose,
  habit,
  day,
  onUpdate
}: {
  isOpen: boolean,
  onClose: () => void,
  habit: Habit | null,
  day: number,
  onUpdate: (id: string, isMastery: boolean, newDay: number, newTime: string) => Promise<void>
}) => {
  const [selectedDay, setSelectedDay] = useState(day);
  const [selectedTime, setSelectedTime] = useState(habit?.start_time || "09:00");
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
      <div className="absolute inset-0 bg-on-surface/20 backdrop-blur-xl" onClick={onClose} />
      <div className="relative bg-white dark:bg-surface-container-high rounded-[3rem] shadow-ambient-lg w-full max-w-lg overflow-hidden border border-white/20 p-10 animate-in zoom-in-95 slide-in-from-bottom-8 duration-700 scale-105">
        <header className="mb-8">
          <h3 className="text-3xl font-black tracking-tighter leading-none mb-2">Sync Timeline</h3>
          <p className="text-xs opacity-60 font-medium">Update the temporal manifest for <span className="font-bold text-primary italic">“{habit.name}”</span></p>
        </header>

        <div className="space-y-8">
          <div>
            <label className="text-[10px] font-technical font-black uppercase tracking-[0.4em] text-primary mb-4 block">Day of the Month</label>
            <div className="grid grid-cols-7 gap-1">
              {daysInMonth.map(d => (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  className={`h-10 rounded-xl text-[11px] font-black transition-all ${selectedDay === d
                    ? "bg-primary text-white shadow-md shadow-primary/20 scale-110"
                    : "bg-surface-container-low/40 hover:bg-surface-container-low text-on-surface opacity-60"
                    }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-technical font-black uppercase tracking-[0.4em] text-primary mb-4 block">Start Time manifest</label>
            <input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full bg-surface-container-low/40 border-2 border-primary/5 rounded-2xl px-6 py-4 text-xl font-black outline-none focus:border-primary/20 transition-colors"
            />
          </div>

          <div className="pt-4 flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 py-5 rounded-full font-technical font-black text-[11px] uppercase tracking-widest text-on-surface-variant hover:bg-on-surface/5 transition-all"
            >
              Discard
            </button>
            <button
              disabled={updating}
              onClick={async () => {
                setUpdating(true);
                await onUpdate(habit.id, habit.is_mastery || false, selectedDay, selectedTime);
                setUpdating(false);
                onClose();
              }}
              className="flex-1 py-5 bg-primary text-white rounded-full font-technical font-black text-[11px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {updating ? <Loader className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Sync Timeline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardSkeleton = () => {
  return (
    <div className="space-y-12 animate-pulse pb-20 p-2 lg:p-6">
      <div className="h-4 w-48 bg-surface-container-low rounded-full mb-8"></div>
      <div className="flex flex-col lg:flex-row justify-between gap-12">
        <div className="space-y-6">
          <div className="h-20 w-160 bg-surface-container-low rounded-3xl"></div>
          <div className="h-24 w-120 bg-surface-container-low rounded-3xl"></div>
        </div>
        <div className="flex gap-6">
          <div className="size-40 bg-surface-container-low rounded-[3rem]"></div>
          <div className="size-40 bg-surface-container-low rounded-[3rem]"></div>
        </div>
      </div>
    </div>
  );
};
