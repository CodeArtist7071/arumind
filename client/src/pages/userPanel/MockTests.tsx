import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { AppDispatch, RootState } from "../../store";
import { fetchExams } from "../../slice/examSlice";
import {
  Book,
  ChevronRight,
  Zap,
  Target,
  Clock,
  ShieldCheck,
  Notebook,
} from "lucide-react";
import { useNavigate, useLocation, Outlet } from "react-router";

interface SelectExamProps {
  targetRef: React.RefObject<HTMLElement> | null;
  targetedExams: any[];
  navigate: any;
  onAction: (exam: any) => void;
}

const MockTests = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { examData, loading: examsLoading } = useSelector(
    (state: RootState) => state.exams,
  );
  const { profile } = useSelector((state: RootState) => state.user);
  const { user } = useSelector((state: RootState) => state.user);

  const location = useLocation();
  const isPreferenceActive = location.pathname.includes("/preference/");

  useEffect(() => {
    dispatch(fetchExams());
  }, [dispatch]);

  const targetedExams = examData.filter((el) =>
    profile?.target_exams?.includes(el.id),
  );

  const handleStartExam = (id: string) => {
    navigate(`preference/${id}`);
  };

  return (
    <div className="min-h-screen bg-surface-container-low overflow-hidden relative">
      <div 
        className={`p-6 lg:p-10 transition-all duration-800 ease-premium ${
          isPreferenceActive 
            ? "scale-[0.97] opacity-40 blur-[1px] pointer-events-none translate-x-[-2%]" 
            : "scale-100 opacity-100 blur-0 translate-x-0"
        }`}
      >
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight text-on-surface dark:text-white">
              Adaptive Mock <span className="text-primary">Portal</span>
            </h1>
            <p className="text-on-surface-variant dark:text-slate-400 font-medium max-w-lg">
              Generate personalized mock tests based on your past performance.
              Improve your score with AI-driven question selection.
            </p>
          </div>
          <div className="bg-primary text-white px-6 py-3 rounded-2xl shadow-xl shadow-green-600/20 flex items-center gap-3">
            <Zap className="size-5" fill="white" />
            <span className="font-bold tracking-wide uppercase text-sm">
              Adaptive Learning Active
            </span>
          </div>
        </div>

        {/* Exams Grid */}
        <div className="lg:w-[70%] gap-6">
          <SelectExam
            targetedExams={targetedExams}
            navigate={navigate}
            targetRef={null} onAction={(exam:any)=>handleStartExam(exam.id)}          />

          {targetedExams.length === 0 && !examsLoading && (
            <div className="col-span-full py-20 text-center space-y-4">
              <div className="size-20 bg-surface-container-high dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <Target className="size-10" />
              </div>
              <h3 className="text-xl font-bold">No targeted exams found</h3>
              <p className="text-on-surface-variant">
                Please set your target exams in your profile or dashboard.
              </p>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-10  dark:border-slate-800">
          <div className="flex gap-4">
            <div className="size-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 shrink-0">
              <ShieldCheck className="size-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-on-surface dark:text-white">
                Performance-Led
              </h4>
              <p className="text-xs text-on-surface-variant">
                Ratios focus on your weak points while revisiting mastered
                topics.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="size-12 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 shrink-0">
              <Clock className="size-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-on-surface dark:text-white">
                Timed Sessions
              </h4>
              <p className="text-xs text-on-surface-variant">
                Practice under pressure with customizable timers for better
                endurance.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="size-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 shrink-0">
              <Target className="size-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-on-surface dark:text-white">
                Exam Specific
              </h4>
              <p className="text-xs text-on-surface-variant">
                Questions are curated exactly to your chosen exam's curriculum.
              </p>
            </div>
          </div>
        </div>
        </div>
      </div>
      <Outlet />
    </div>
  );
};

export default MockTests;

const SelectExam = ({ targetRef, targetedExams, navigate, onAction }: SelectExamProps) => {
  return (
    <section ref={targetRef} className="scroll-mt-32">
      {/* <div className="flex justify-between items-center mb-8">
        <h3 className="text-[11px] font-technical font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-60">
          Target Landscapes
        </h3>
        <button
          onClick={() => navigate("exam-lists")}
          className="text-[10px] font-technical bg-primary px-3 py-2 rounded-full font-black uppercase tracking-widest text-white hover:bg-primary/80 transition-opacity"
        >
          Add More Exams +
        </button>
      </div> */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {targetedExams.map((exam, index) => (
          <div
            key={index}
            className="p-8 bg-surface-container-high/40 rounded-[2.5rem] shadow-ambient hover:bg-surface-container-high group cursor-pointer relative overflow-hidden transition-all duration-500"
            onClick={() => onAction(exam)}
          >
            <div className="size-14 bg-surface-container-high rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm">
              <Notebook className="size-6" />
            </div>
            <h4 className="font-black text-2xl mb-2 text-on-surface tracking-tighter leading-none">
              {exam.name}
            </h4>
            <p className="text-xs text-on-surface-variant mb-6 font-medium leading-relaxed opacity-60">
              {exam.full_name}
            </p>
            <div className="pt-6 border-t border-on-surface/5 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-technical font-black uppercase tracking-widest text-on-surface-variant group-hover:text-black opacity-40 mb-1">
                  Status
                </p>
                <p className="text-[10px] font-technical font-black text-primary uppercase tracking-widest leading-none">
                  Active Cycle
                </p>
              </div>
              <ChevronRight className="size-5 text-on-surface-variant opacity-20 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-500" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
