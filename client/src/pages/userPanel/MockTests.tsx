import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { AppDispatch, RootState } from "../../store";
import { fetchExams } from "../../slice/examSlice";
import {
  Zap,
  Target,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { useNavigate, useLocation, Outlet } from "react-router";
import { ExamSelectorCard } from "../../components/ui/ExamSelectorCard";
import { ExamSelectorCardMobile } from "../../components/ui/ExamSelectorCardMobile";

const MockTests = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { examData, loading: examsLoading } = useSelector(
    (state: RootState) => state.exams,
  );
  const { profile } = useSelector((state: RootState) => state.user);

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
    <div className="min-h-screen overflow-hidden bg-surface-container-low relative">
      <div 
        className={`p-6 lg:p-10 transition-all duration-800 ease-premium ${
          isPreferenceActive 
            ? "scale-[0.97] opacity-40 blur-[1px] pointer-events-none translate-x-[-2%]" 
            : "scale-100 opacity-100 blur-0 translate-x-0"
        }`}
      >
      <div className="mx-auto max-w-7xl space-y-8 sm:space-y-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-on-surface dark:text-white sm:text-3xl">
              Adaptive Mock Test <span className="text-primary">Portal</span>
            </h1>
            <p className="hidden md:block text-on-surface-variant text-sm md:text-md dark:text-slate-400 font-medium max-w-lg">
              Generate personalized mock tests based on your past performance.
              Improve your score with AI-driven question selection.
            </p>
          </div>
          <div className="lg:w-[70%] gap-6">
            <ExamSelectorCard
              targetedExams={targetedExams}
              onSelect={(exam) => handleStartExam(exam.id)}
              onViewAll={() => navigate("/select-exams")}
              loading={examsLoading}
            />
            <ExamSelectorCardMobile
              targetedExams={targetedExams}
              onSelect={(exam) => handleStartExam(exam.id)}
              onViewAll={() => navigate("/select-exams")}
              loading={examsLoading}
            />
          </div>
        </div>

        {/* Exams Grid */}
        {/*<div className="lg:w-[70%] gap-6">
          <ExamSelectorCard
            targetedExams={targetedExams}
            onSelect={(exam) => handleStartExam(exam.id)}
            onViewAll={() => navigate("/select-exams")}
            loading={examsLoading}
          />
          <ExamSelectorCardMobile
            targetedExams={targetedExams}
            onSelect={(exam) => handleStartExam(exam.id)}
            onViewAll={() => navigate("/select-exams")}
            loading={examsLoading}
          />
        </div>*/}

        {/* Info Section */}
        <div className="hidden grid-cols-1 md:grid-cols-3 gap-8 pt-10  dark:border-slate-800">
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
