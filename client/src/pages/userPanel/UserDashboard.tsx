import { FireIcon } from "@heroicons/react/24/outline";
import {
  Bell,
  ChevronRight,
  SearchAlert,
  Settings,
  Notebook,
  TrendingUp,
  History,
  Target
} from "lucide-react";
import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../store";
import { fetchExams } from "../../slice/examSlice";
import { useNavigate, Outlet } from "react-router-dom";

const UserDashboard = () => {
  const { user, profile } = useSelector((state: RootState) => state.user);
  const { examData, loading } = useSelector((state: RootState) => state.exams ?? null);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(fetchExams());

    // Focus Target Landscapes after a delay with a truly smooth transition
    const timer = setTimeout(() => {
      const element = targetRef.current;
      if (!element) return;
      
      const scrollableParent = element.closest('.overflow-y-auto');
      if (scrollableParent) {
        // Calculate target position relative to the scrollable container
        const targetPos = element.offsetTop - 80;
        const startPos = scrollableParent.scrollTop;
        const distance = targetPos - startPos;
        const duration = 1500; // 1.5 seconds for premium feel
        let start: number | null = null;

        const cubicBezier = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        const step = (timestamp: number) => {
          if (!start) start = timestamp;
          const progress = Math.min((timestamp - start) / duration, 1);
          scrollableParent.scrollTop = startPos + distance * cubicBezier(progress);
          if (progress < 1) {
            requestAnimationFrame(step);
          }
        };
        requestAnimationFrame(step);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [dispatch]);

  const targetedExams = examData.filter((el) =>
    profile.target_exams.includes(el.id),
  );

  const subjectProgress = [
    { name: "History & Geography of Odisha", percent: 82 },
    { name: "General Studies & Current Affairs", percent: 45 },
    { name: "Odia Language & Literature", percent: 95 },
    { name: "Aptitude & Mental Ability", percent: 30 },
  ];

  const checklist = [
    { text: "Read Current Affairs (Odia)", checked: true },
    { text: "Solve 20 Math PYQs", checked: true },
    { text: "Attempt GS Sectional Mock", checked: false, active: true },
    { text: "Revise Odisha History notes", checked: false },
  ];

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-12 pb-20 p-2 lg:p-6">
      {/* Editorial Hero Section */}
      <section className="relative px-2">
        <h2 className="text-[10px] font-technical uppercase tracking-[0.5em] text-on-surface-variant opacity-40 mb-6 font-black translate-x-1">Morning Reflection</h2>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="animate-greeting">
            <h1 className="text-6xl lg:text-8xl font-black tracking-tighter text-on-surface leading-[0.85] mb-8">
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
        {/* Left Content Column */}
        <div className="lg:col-span-8 space-y-12">
          {/* Target Exams - The Garden View */}
          <section ref={targetRef} className="scroll-mt-32">
            <div className="flex justify-between items-center mb-8 px-2">
              <h3 className="text-[11px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-60">Target Landscapes</h3>
              <button
                onClick={() => navigate("exam-lists")}
                className="text-[10px] font-technical font-black uppercase tracking-widest text-primary hover:opacity-70 transition-opacity"
              >
                Expand Horizons +
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {targetedExams.map((exam, index) => (
                <div
                  key={index}
                  className="p-8 bg-surface-container-low rounded-[2.5rem] shadow-ambient hover-bloom group cursor-pointer relative overflow-hidden"
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
                      <p className="text-[9px] font-technical font-black uppercase tracking-widest text-on-surface-variant opacity-40 mb-1">Status</p>
                      <p className="text-[10px] font-technical font-black text-primary uppercase tracking-widest leading-none">Active Cycle</p>
                    </div>
                    <ChevronRight className="size-5 text-on-surface-variant opacity-20 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-500" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Subject Growth - Tonal Layering */}
          <section>
            <h3 className="text-[11px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-60 mb-8 px-2">Growth Analytics</h3>
            <div className="bg-surface-container-low rounded-[3rem] p-10 shadow-ambient">
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

        {/* Right Sidebar Column */}
        <div className="lg:col-span-4 space-y-12">
          <UpcomingMockTest />

          {/* Daily Rituals */}
          <section className="bg-surface-container-low rounded-[3rem] p-10 shadow-ambient">
            <h3 className="text-[11px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-50 mb-10 flex items-center gap-4">
              <div className="size-2.5 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(0,110,47,0.5)]" />
              Daily Rituals
            </h3>
            <div className="space-y-4">
              {checklist.map((item, index) => (
                <label
                  key={index}
                  className={`flex items-center gap-5 p-6 rounded-4xl cursor-pointer transition-all duration-500 ease-(--ease-botanical) hover:scale-[1.03] ${item.active
                    ? "bg-white shadow-ambient ring-2 ring-primary/5"
                    : "bg-surface-container-high/40 opacity-60 grayscale hover:grayscale-0 hover:opacity-100"
                    }`}
                >
                  <input
                    className="rounded-full border-2 border-primary/20 text-primary focus:ring-primary size-6 shadow-sm cursor-pointer transition-all"
                    type="checkbox"
                    checked={item.checked}
                    readOnly
                  />
                  <span
                    className={`text-sm font-black tracking-tight ${item.checked ? "line-through text-on-surface-variant opacity-40 font-medium" : "text-on-surface"}`}
                  >
                    {item.text}
                  </span>
                </label>
              ))}
            </div>
          </section>
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
      <Outlet />
    </div>
  );
};

export default UserDashboard;

const UpcomingMockTest = () => {
  const upcomingMocks = [
    {
      month: "Aug",
      displayDate: "24",
      title: "OPSC Prelims Full Mock 12",
      displayTime: "10:00 AM",
      marks: "200 Marks",
    },
    {
      month: "Aug",
      displayDate: "26",
      title: "Odisha GK Sectional Test",
      displayTime: "04:00 PM",
      marks: "50 Marks",
    },
  ];

  return (
    <section>
      <h3 className="text-[11px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-60 mb-8 px-2">Scheduled Tests</h3>
      <div className="bg-surface-container-low rounded-[3rem] overflow-hidden shadow-ambient p-3">
        <div className="space-y-2">
          {upcomingMocks.map((mock, index) => (
            <div
              key={index}
              className="p-8 flex items-center gap-8 hover:bg-white transition-all duration-500 group rounded-4xl"
            >
              <div className="flex flex-col items-center justify-center min-w-[80px] bg-surface-container-high py-5 rounded-4xl group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm border border-black/5">
                <span className="text-[10px] font-technical font-black uppercase tracking-[0.2em] mb-1 opacity-50 group-hover:text-white/80 group-hover:opacity-100">
                  {mock.month}
                </span>
                <span className="text-3xl font-technical font-black group-hover:text-white tracking-tighter">
                  {mock.displayDate}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xl font-black text-on-surface group-hover:text-primary transition-colors truncate tracking-tighter leading-tight mb-1">
                  {mock.title}
                </h4>
                <p className="text-[10px] font-technical uppercase tracking-[0.2em] text-on-surface-variant font-black opacity-60">
                  {mock.displayTime} <span className="opacity-20 mx-2">•</span> {mock.marks}
                </p>
              </div>
            </div>
          ))}
        </div>
        <button className="w-full py-8 text-[10px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant hover:text-primary transition-all duration-500 opacity-60 hover:opacity-100">
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
