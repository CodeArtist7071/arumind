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
  Trash
} from "lucide-react";
import React, { useEffect, useRef, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../store";
import { fetchExams } from "../../slice/examSlice";
import { useNavigate, Outlet } from "react-router-dom";
import { supabase } from "../../utils/supabase";

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

  const [isRitualDrawerOpen, setIsRitualDrawerOpen] = useState(false);
  const [selectedExamInDrawer, setSelectedExamInDrawer] = useState<string | null>(null);

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

  const filteredRitualsInDrawer = useMemo(() => {
    if (!selectedExamInDrawer) return dailyRituals;
    return dailyRituals.filter(h => !h.exam_id || h.exam_id === selectedExamInDrawer);
  }, [dailyRituals, selectedExamInDrawer]);

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
              <p className="text-on-surface-variant max-w-xl text-xl lg:text-2xl leading-relaxed opacity-0 animate-greeting-delay font-medium font-narrative">
                Your OPSC preparation is <span className="font-technical font-black text-primary border-b-2 border-primary/20">65%</span> complete.
                You are currently in the top <span className="font-technical font-black text-primary border-b-2 border-primary/20">5%</span> of botanical aspirants.
              </p>
            </div>

            <div className="flex gap-4">
              <div className="bg-surface-container-low px-8 py-6 rounded-[2.5rem] shadow-ambient hover:scale-105 transition-transform duration-500 group">
                <p className="text-[9px] font-technical text-on-surface-variant uppercase font-black tracking-[0.2em] mb-2 opacity-50 group-hover:opacity-100 transition-opacity">
                  Daily Streak
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-technical font-black text-tertiary">12</span>
                  <FireIcon className="size-8 text-tertiary animate-pulse" />
                </div>
              </div>

              <div className="bg-surface-container-low px-8 py-6 rounded-[2.5rem] shadow-ambient hover:scale-105 transition-transform duration-500 group">
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
            <section ref={targetRef} className="scroll-mt-32">
              <div className="flex justify-between items-center mb-8 px-2">
                <h3 className="text-[11px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-60">Target Landscapes</h3>
                <button
                  onClick={() => navigate("exam-lists")}
                  className="text-[10px] font-technical bg-primary px-3 py-2 rounded-full font-black uppercase tracking-widest text-white hover:bg-primary/80 transition-opacity"
                >
                  Add More Exams +
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {targetedExams.map((exam, index) => (
                  <div
                    key={index}
                    className="p-8 bg-surface-container-low dark:bg-surface-container-high rounded-[2.5rem] shadow-ambient hover-bloom group cursor-pointer relative overflow-hidden"
                    onClick={() => navigate(`exam/${exam.id}`)}
                  >
                    <div className="size-14 bg-surface-container-high rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm">
                      <Notebook className="size-6" />
                    </div>
                    <h4 className="font-black text-2xl mb-2 text-on-surface tracking-tighter leading-none">{exam.name}</h4>
                    <p className="text-xs text-on-surface-variant mb-6 font-medium leading-relaxed opacity-60">
                      {exam.full_name}
                    </p>
                    <div className="pt-6 border-t border-on-surface/5 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-technical font-black uppercase tracking-widest text-on-surface-variant group-hover:text-black opacity-40 mb-1">Status</p>
                        <p className="text-[10px] font-technical font-black text-primary uppercase tracking-widest leading-none">Active Cycle</p>
                      </div>
                      <ChevronRight className="size-5 text-on-surface-variant opacity-20 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-500" />
                    </div>
                  </div>
                ))}
              </div>
            </section>

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
        onClick={() => setIsRitualDrawerOpen(true)}
        className="fixed bottom-10 right-10 size-16 bg-primary text-white rounded-[2.5rem] shadow-ambient-lg shadow-primary/20 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-500 z-50 group overflow-hidden"
      >
        <div className="absolute inset-0 bg-linear-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <CheckSquare className="size-6 transition-transform group-hover:rotate-12" />
        <div className="absolute -top-1 -right-1 size-4 bg-tertiary rounded-full border-2 border-primary flex items-center justify-center animate-bounce">
           <span className="text-[8px] font-black">{dailyRituals.filter(r => !progress[r.id]?.[today-1]).length}</span>
        </div>
      </button>

      <div 
        className={`fixed inset-0 z-60 transition-all duration-700 ease-botanical ${isRitualDrawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <div 
          className="absolute inset-0 bg-on-surface/5 backdrop-blur-sm"
          onClick={() => setIsRitualDrawerOpen(false)}
        />
        <div 
          className={`absolute top-0 right-0 h-full w-full max-w-96 bg-surface-container-high/95 backdrop-blur-3xl shadow-ambient-lg border-l border-on-surface/5 px-4 py-10 transform transition-transform duration-700 ease-botanical ${isRitualDrawerOpen ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="flex justify-between items-center mb-12">
            <div>
               <h3 className="text-2xl font-black tracking-tighter text-on-surface leading-none">Daily Routine</h3>
               <p className="text-[10px] font-technical font-black uppercase tracking-widest text-primary mt-2">Active Cycle: {new Date().toLocaleString('default', { month: 'long' })}</p>
            </div>
            <button 
              onClick={() => setIsRitualDrawerOpen(false)}
              className="size-10 rounded-full bg-on-surface/5 flex items-center justify-center hover:bg-on-surface/10 transition-colors"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto custom-scrollbar-hide mb-8 p-1">
            <button
              onClick={() => setSelectedExamInDrawer(null)}
              className={`px-4 py-2 rounded-full font-technical font-black text-[9px] uppercase tracking-widest transition-all ${
                !selectedExamInDrawer ? "bg-primary text-white shadow-md" : "bg-on-surface/5 text-on-surface opacity-60 hover:opacity-100"
              }`}
            >
              All
            </button>
            {targetedExams.map((ex) => (
              <button
                key={ex.id}
                onClick={() => setSelectedExamInDrawer(ex.id)}
                className={`px-4 py-2 rounded-full font-technical font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${
                  selectedExamInDrawer === ex.id ? "bg-primary text-white shadow-md" : "bg-on-surface/5 text-on-surface opacity-60 hover:opacity-100"
                }`}
              >
                {ex.name}
              </button>
            ))}
          </div>

          <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-280px)] custom-scrollbar pr-5">
             {filteredRitualsInDrawer.length === 0 ? (
               <div className="py-12 text-center bg-white/40 rounded-4xl border border-dashed border-primary/20 p-8">
                  <Sparkles className="size-8 text-primary/40 mx-auto mb-4" />
                  <div className="space-y-2">
                    <p className="text-xs font-technical font-black uppercase tracking-widest text-on-surface-variant opacity-60 px-4">
                      No task is added for this month.<br /> 
                    </p>
                    <p className="text-sm font-black text-on-surface">Please go to study planner.</p>
                  </div>
               </div>
             ) : (
               filteredRitualsInDrawer.map((habit) => {
                  const isDone = progress[habit.id]?.[today - 1];
                  return (
                    <label
                      key={habit.id}
                      className={`flex items-center gap-5 px-3 py-3 rounded-4xl cursor-pointer transition-all duration-500 hover:scale-[1.02] ${!isDone
                        ? "bg-white shadow-sm ring-1 ring-primary/5"
                        : "bg-surface-container-high/40 opacity-60 grayscale"
                        }`}
                    >
                      <div className="relative size-6 shrink-0">
                        <input
                          className="peer hidden"
                          type="checkbox"
                          checked={isDone || false}
                          onChange={() => handleToggle(habit.id)}
                        />
                        <div className="size-full rounded-lg border-2 border-primary/20 flex items-center justify-center transition-all peer-checked:bg-primary peer-checked:border-primary peer-checked:rotate-0 rotate-45">
                          {isDone && <CheckSquare className="size-4 text-white" strokeWidth={3} />}
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-sm font-black tracking-tight ${isDone ? "line-through opacity-40" : "text-on-surface"}`}>
                          {habit.name}
                        </span>
                        {habit.start_time && (
                          <span className="text-[9px] font-technical font-black text-primary opacity-60">
                             {format12h(habit.start_time)}
                          </span>
                        )}
                      </div>
                    </label>
                  );
               })
             )}
          </div>

          <div className="absolute bottom-10 left-10 right-10">
             <button 
               onClick={() => { setIsRitualDrawerOpen(false); navigate(`../plan-study/${selectedExamInDrawer || dailyRituals[0]?.exam_id}`); }}
               className="w-full py-4 bg-primary text-on-primary rounded-full font-technical font-black text-[11px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
             >
               Open Master Planner
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;

const UpcomingMockTest = ({ 
  habits, 
  progress,
  onDelete, 
  onNavigate 
}: { 
  habits: Habit[], 
  progress: Record<string, boolean[]>,
  onDelete: (id: string, isMastery: boolean) => Promise<void>,
  onNavigate: (examId: string, chapterId?: string) => void
}) => {
  const navigate = useNavigate();
  const masteryTests = React.useMemo(() => {
    return habits
      .filter((h) => h.is_mastery)
      .map((h) => {
        const prog = progress[h.id] || [];
        const scheduledDayIdx = prog.indexOf(true);
        const day = scheduledDayIdx === -1 ? "-" : (scheduledDayIdx + 1).toString();
        const monthName = new Date().toLocaleString('default', { month: 'short' });
        
        return {
          id: h.id,
          month: monthName,
          displayDate: day,
          title: h.name,
          displayTime: h.start_time ? format12h(h.start_time) : "TBD",
          examId: h.exam_id,
          chapterId: h.chapter_id,
          priority: h.priority,
        };
      })
      .sort((a, b) => Number(a.displayDate) - Number(b.displayDate))
      .slice(0, 3);
  }, [habits, progress]);

  return (
    <section>
      <div className="flex justify-between items-center mb-8 px-2">
        <h3 className="text-[11px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-60">Scheduled Tests</h3>
        <Sparkles className="size-3.5 text-primary animate-pulse" />
      </div>
      <div className="bg-primary/95 backdrop-blur-md rounded-4xl overflow-hidden shadow-ambient p-3 ring-1 ring-white/10">
        <div className="space-y-2">
          {masteryTests.length === 0 ? (
            <div className="px-6 py-12 text-center text-white/40">
              <p className="text-[10px] font-technical font-black uppercase tracking-widest font-narrative mb-2">Botanical Garden Quiet</p>
              <p className="text-xs italic opacity-60">No mastery chapter tests scheduled for this cycle.</p>
            </div>
          ) : masteryTests.map((mock) => (
            <div
              key={mock.id}
              className="px-3 py-2 flex items-center gap-6 hover:bg-white transition-all duration-500 group rounded-3xl relative"
            >
              <div className="flex flex-col items-center justify-center min-w-20 bg-surface-container-high py-3 rounded-3xl group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm border border-black/5">
                <span className="text-[10px] font-technical font-black uppercase tracking-[0.2em] mb-1 opacity-50 group-hover:text-white/80 group-hover:opacity-100">
                  {mock.month}
                </span>
                <span className="text-3xl font-technical font-black group-hover:text-white tracking-tighter">
                  {mock.displayDate}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xl font-black text-white group-hover:text-primary transition-colors truncate tracking-tighter leading-tight mb-1">
                  {mock.title}
                </h4>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-technical uppercase tracking-[0.2em] text-white group-hover:text-on-surface-variant font-black opacity-60">
                    {mock.displayTime}
                  </p>
                  <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${
                    mock.priority === "HIGH" ? "bg-red-500/20 text-red-200" : "bg-yellow-500/20 text-yellow-200"
                  }`}>
                    {mock.priority}
                  </span>
                </div>
              </div>
              
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 p-1.5 rounded-2xl shadow-sm">
                <button 
                  onClick={() => mock.examId && onNavigate(mock.examId, mock.chapterId)}
                  className="p-1.5 hover:bg-green-50 rounded-xl text-primary transition-colors"
                  title="Prepare Now"
                >
                  <ChevronRight size={14} />
                </button>
                <button 
                  onClick={() => onDelete(mock.id, true)}
                  className="p-1.5 hover:bg-red-50 rounded-xl text-red-400 transition-colors"
                  title="Remove from Schedule"
                >
                  <Trash size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button 
          onClick={() => navigate("../study-planner")}
          className="w-full py-8 text-[10px] font-technical font-black uppercase tracking-[0.4em] text-white hover:text-white/70 transition-all duration-500 opacity-60 hover:opacity-100"
        >
          Manifest All Activity →
        </button>
      </div>
    </section>
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
