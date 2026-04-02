import {
  Bell,
  Book,
  CheckCircle,
  Edit3Icon,
  FileWarning,
  History,
  Layers,
  Pen,
  TrendingUp,
  Trophy,
  Target,
  Globe,
  Clock,
  FlaskConical,
  WorkflowIcon,
} from "lucide-react";
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../utils/supabase";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../../store";
import { fetchExams } from "../../slice/examSlice";
import SubjectMastery from "../../components/performanceAnalytics/SubjectMastery";
import AiInsights from "../../components/performanceAnalytics/AiInsights";
import QuestionDistribution from "../../components/performanceAnalytics/QuestionDistribution";
import { GrowthChart } from "../../components/performanceAnalytics/GrowthChart";
import { MastHeadChapters } from "../../components/performanceAnalytics/MastHeadChapters";
import { SoilEnrichment } from "../../components/performanceAnalytics/SoilEnrichment";
import { FocusBalance } from "../../components/performanceAnalytics/FocusBalance";
import { ExamTicker } from "../../components/ui/ExamTicker";

const PerformanceAnalytics = () => {
  const { profile } = useSelector(
    (state: RootState) => state.user ?? { profile: null },
  );
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [allAnswers, setAllAnswers] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [chartMode, setChartMode] = useState<"Practice" | "Mock">("Practice");
  const { examData } = useSelector(
    (state: RootState) => state.exams ?? { examData: [] },
  );

  const targetedExams = useMemo(() => {
    if (!examData || !profile?.target_exams) return [];
    return examData.filter((el) => profile.target_exams.includes(el.id));
  }, [examData, profile?.target_exams]);

  useEffect(() => {
    dispatch(fetchExams());
  }, [dispatch]);

  useEffect(() => {
    if (profile?.target_exams?.[0] && !selectedExam) {
      setSelectedExam(profile.target_exams[0]);
    }
  }, [profile, selectedExam]);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.id || !selectedExam) return;
      try {
        setLoading(true);
        const { data: atts } = await supabase
          .from("test_attempts")
          .select("*")
          .eq("exam_id", selectedExam)
          .eq("user_id", profile?.id)
          .order("submitted_at", { ascending: false });

        const attemptIds = (atts || []).map((a) => a.id);
        const { data: answersData } =
          attemptIds.length > 0
            ? await supabase
                .from("test_attempt_answers")
                .select("*, questions(*)")
                .in("attempt_id", attemptIds)
            : { data: [] };

        const [chapRes, subRes] = await Promise.all([
          supabase.from("chapters").select("*"),
          supabase.from("subjects").select("*"),
        ]);

        setAttempts(atts || []);
        setAllAnswers(answersData || []);
        setChapters(chapRes.data || []);
        setSubjects(subRes.data || []);
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profile?.id, selectedExam]);

  const filteredAttempts = useMemo(() => {
    return attempts;
  }, [attempts]);

  const filteredAnswers = useMemo(() => {
    const attemptIds = new Set(filteredAttempts.map((a) => a.id));
    return allAnswers.filter((ans) => attemptIds.has(ans.attempt_id));
  }, [allAnswers, filteredAttempts]);

  const metrics = useMemo(() => {
    if (filteredAttempts.length === 0) return null;

    let totalCorrect = 0,
      totalIncorrect = 0,
      totalSkipped = 0,
      totalTimeMs = 0;
    const subjectStats: Record<string, any> = {};
    const chapterStats: Record<string, any> = {};

    const answersByAttempt: Record<string, any[]> = {};
    filteredAnswers.forEach((ans) => {
      if (!answersByAttempt[ans.attempt_id])
        answersByAttempt[ans.attempt_id] = [];
      answersByAttempt[ans.attempt_id].push(ans);
    });

    const performanceTrajectory: any[] = [];
    [...filteredAttempts].reverse().forEach((att) => {
      const attAnswers = answersByAttempt[att.id] || [];
      let correct = 0,
        answered = 0;
      attAnswers.forEach((ans) => {
        if (!ans.questions) return;
        if (ans.selected_option === ans.questions.correct_answer) correct++;
        if (ans.selected_option) answered++;
      });
      const chapter = chapters.find((c) => c.id === att.chapter_id);
      performanceTrajectory.push({
        accuracy: answered > 0 ? Math.round((correct / answered) * 100) : 0,
        chapterName: chapter?.name || "Practice Session",
      });
    });

    filteredAnswers.forEach((ans) => {
      const q = ans.questions;
      if (!q) return;
      const subId = q.subject_id;
      const chapId = q.chapter_id;

      if (!subjectStats[subId])
        subjectStats[subId] = {
          correct: 0,
          total: 0,
          totalMarks: 0,
          maxMarks: 0,
        };
      if (!chapterStats[chapId])
        chapterStats[chapId] = { correct: 0, total: 0, subId };

      subjectStats[subId].total++;
      subjectStats[subId].maxMarks += q.marks || 0;
      chapterStats[chapId].total++;

      if (ans.selected_option === q.correct_answer) {
        totalCorrect++;
        subjectStats[subId].correct++;
        subjectStats[subId].totalMarks += q.marks || 0;
        chapterStats[chapId].correct++;
      } else if (ans.selected_option) {
        totalIncorrect++;
      } else {
        totalSkipped++;
      }
    });

    filteredAttempts.forEach((a) => {
      if (a.started_at && a.submitted_at) {
        totalTimeMs +=
          new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime();
      }
    });

    const accuracy =
      totalCorrect + totalIncorrect > 0
        ? Math.round((totalCorrect / (totalCorrect + totalIncorrect)) * 100)
        : 0;
    const avgTimeSec =
      filteredAttempts.length > 0
        ? Math.round(totalTimeMs / filteredAttempts.length / 1000)
        : 0;

    const sortedChapters = Object.entries(chapterStats)
      .map(([id, stats]: [string, any]) => ({
        id,
        name: chapters.find((c) => c.id === id)?.name || "Unknown",
        subject: subjects.find((s) => s.id === stats.subId)?.name || "Unknown",
        accuracy:
          stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      }))
      .sort((a, b) => b.accuracy - a.accuracy);

    const breakdown = Object.entries(subjectStats)
      .map(([id, s]) => {
        const subject = subjects.find((sub) => sub.id === id);
        return {
          subject: subject?.name || "Unknown",
          accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
        };
      })
      .sort((a, b) => b.accuracy - a.accuracy);

    return {
      accuracy,
      avgTimeSec,
      testsCount: filteredAttempts.length,
      totalCorrect,
      totalIncorrect,
      totalSkipped,
      subjectBreakdown: breakdown,
      strongChapters: sortedChapters
        .filter((c) => c.accuracy >= 80)
        .slice(0, 2),
      weakChapters: sortedChapters.filter((c) => c.accuracy < 50).slice(0, 2),
      performanceTrajectory: performanceTrajectory.slice(-12),
    };
  }, [filteredAttempts, filteredAnswers, chapters, subjects]);

  const aiInsights = useMemo(() => {
    if (!metrics)
      return [
        {
          type: "Getting Started",
          title: "Begin your journey",
          desc: "Complete your first practice test to unlock personalized AI insights.",
        },
      ];
    const insights: any[] = [];
    if (metrics.weakChapters.length > 0) {
      insights.push({
        type: "Focus Area",
        title: `${metrics.weakChapters[0].name} Concepts`,
        desc: `Your accuracy is ${metrics.weakChapters[0].accuracy}% in this chapter. Review the core concepts.`,
      });
    }
    if (metrics.totalSkipped > 5) {
      insights.push({
        type: "Action Required",
        title: "Improve Time Management",
        desc: `You've skipped ${metrics.totalSkipped} questions. Allocate at least 60s per question.`,
      });
    }
    insights.push({
      type: "Next Recommended",
      title:
        metrics.strongChapters.length > 0
          ? `${metrics.strongChapters[0].subject} Mastery`
          : "General Practice",
      desc: "Maintain your momentum with a personalized session.",
    });
    return insights.slice(0, 3);
  }, [metrics]);

  if (loading) return <PerformanceSkeleton />;

  if (!metrics) {
    return (
      <main className="pb-20 px-6 lg:px-12 max-w-7xl mx-auto space-y-16 animate-reveal">
        <section className="pt-8 text-center py-20 bg-surface-container-high rounded-[3rem]">
          <FlaskConical className="size-16 text-primary/20 mx-auto mb-6" />
          <h2 className="text-3xl font-black text-on-surface">
            Data Seedlings Needed
          </h2>
          <p className="text-on-surface-variant max-w-md mx-auto mt-4">
            Complete your first exam to begin generating growth trends and AI
            insights.
          </p>
          <button
            onClick={() => navigate("/user/dashboard")}
            className="mt-8 px-8 py-4 bg-primary text-white rounded-full font-technical font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20 hover:scale-105 transition-all"
          >
            Start Preparation
          </button>
        </section>
      </main>
    );
  }

  const performanceTrajectory = metrics.performanceTrajectory;
  const maxScore = 100;

  return (
    <main className="pb-20 px-6 lg:px-12 max-w-7xl mx-auto space-y-16 animate-reveal">
      <section className="pt-8">
        <h1 className="text-6xl font-black leading-[0.9] tracking-tighter text-on-surface">
          Growth <span className="text-primary italic">&</span> <br />
          Precision.
        </h1>
        <p className="mt-8 text-on-surface-variant max-w-lg text-lg font-medium leading-relaxed opacity-80">
          Your journey through the{" "}
          <span className="text-primary font-black px-2 py-0.5 bg-primary/5 rounded-lg">
            {targetedExams?.find((e: any) => e.id === selectedExam)?.name ||
              "curriculum"}
          </span>{" "}
          ecosystem shows developing technical mastery and consistent momentum.
        </p>
      </section>

      <ExamTicker
        targetedExams={targetedExams}
        selectedExam={selectedExam}
        setSelectedExam={setSelectedExam}
      />

      <div className="grid sm:grid-cols-1 lg:grid-cols-12 overflow-hidden gap-8">
        <div className="w-full md:col-span-6 lg:col-span-4 mx-auto bg-primary p-10 rounded-[3rem] shadow-ambient hover-bloom group">
          <div className="size-16 bg-surface-container-high rounded-2xl flex items-center justify-center text-primary mb-8 shadow-sm group-hover:bg-primary group-hover:text-white transition-all duration-500">
            <TrendingUp size={28} />
          </div>
          <h3 className="text-[11px] font-technical font-black uppercase tracking-widest text-white opacity-60 mb-2">
            Momentum Trend
          </h3>
          <p className="text-8xl font-technical font-black text-white tracking-tighter leading-none">
            {metrics.testsCount || 0}
          </p>
          <p className="text-sm font-bold text-white mt-4">
            Completed Sessions
          </p>
        </div>

        <GrowthChart
          performanceTrajectory={performanceTrajectory}
          maxScore={maxScore}
          chartMode={chartMode}
          setChartMode={setChartMode}
        />

        <div className="sm:col-span-full lg:col-span-8">
          <SubjectMastery examid={selectedExam} metrics={metrics} />
        </div>

        <FocusBalance metrics={metrics} />
        <div className="sm:col-span-full lg:col-span-6">
          <QuestionDistribution metrics={metrics} />
        </div>
        <div className="lg:col-span-6">
          <AiInsights aiInsights={aiInsights} />
        </div>
        <MastHeadChapters metrics={metrics} />
        <SoilEnrichment metrics={metrics} />
      </div>

      <footer className="flex flex-col md:flex-row items-center justify-between gap-8 p-12 bg-primary/5 rounded-[4rem] border border-primary/10 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <TrendingUp size={200} />
        </div>
        <div className="flex items-center gap-8 relative z-10">
          <div className="size-20 rounded-3xl bg-primary flex items-center justify-center shadow-xl shadow-primary/30 text-white group hover:scale-105 transition-transform duration-500">
            <TrendingUp
              size={36}
              className="group-hover:translate-y-[-4px] transition-transform"
            />
          </div>
          <div>
            <h3 className="text-2xl font-black text-on-surface mb-2 tracking-tight">
              Cultivate your potential.
            </h3>
            <p className="text-on-surface-variant text-sm font-medium leading-relaxed max-w-sm">
              We've synthesized your performance data into a specialized growth
              path.
            </p>
          </div>
        </div>
        <div className="flex gap-4 relative z-10">
          <button
            onClick={() =>
              attempts.length > 0 && navigate(`/user/results/${attempts[0].id}`)
            }
            className="px-8 py-4 bg-surface rounded-full font-technical font-black text-[11px] uppercase tracking-[0.2em] text-on-surface-variant shadow-sm hover:shadow-xl hover:text-on-surface transition-all active:scale-95"
          >
            Review Errors
          </button>
          <button
            onClick={() => navigate("/user/dashboard")}
            className="px-8 py-4 bg-linear-to-r from-primary to-primary-container text-on-primary rounded-full font-technical font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Return to Study
          </button>
        </div>
      </footer>
    </main>
  );
};

export default PerformanceAnalytics;

function PerformanceSkeleton() {
  return (
    <main className="pb-20 px-6 lg:px-12 max-w-7xl mx-auto space-y-16 animate-pulse">
      <section className="pt-8 space-y-6">
        <div className="h-16 w-2/3 bg-surface-container-high rounded-xl" />
        <div className="h-6 w-1/2 bg-surface-container-high rounded-lg" />
      </section>

      <div className="flex gap-3 flex-wrap">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-28 rounded-full bg-surface-container-high"
          />
        ))}
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 bg-surface-container-low p-10 rounded-[3rem] space-y-6">
          <div className="size-16 bg-surface-container-high rounded-2xl" />
          <div className="h-4 w-24 bg-surface-container-high rounded" />
          <div className="h-16 w-32 bg-surface-container-high rounded" />
          <div className="h-4 w-40 bg-surface-container-high rounded" />
        </div>
        <div className="lg:col-span-8 bg-surface-container-low p-10 rounded-[3rem] h-[300px]" />
        <div className="lg:col-span-8 bg-surface-container-low p-10 rounded-[3rem] h-[250px]" />
        <div className="lg:col-span-4 bg-surface-container-low p-10 rounded-[3rem] space-y-10">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-6">
              <div className="size-20 rounded-full bg-surface-container-high" />
              <div className="space-y-2">
                <div className="h-3 w-20 bg-surface-container-high rounded" />
                <div className="h-4 w-32 bg-surface-container-high rounded" />
              </div>
            </div>
          ))}
        </div>
        <div className="lg:col-span-6 bg-surface-container-low p-10 rounded-[3rem] h-[200px]" />
        <div className="lg:col-span-6 bg-surface-container-low p-10 rounded-[3rem] space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 bg-surface-container-high rounded-2xl"
            />
          ))}
        </div>
        <div className="lg:col-span-6 bg-surface-container-low p-10 rounded-[3rem] space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-20 bg-surface-container-high rounded-2xl"
            />
          ))}
        </div>
        <div className="lg:col-span-6 bg-surface-container-low p-10 rounded-[3rem] space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-20 bg-surface-container-high rounded-2xl"
            />
          ))}
        </div>
      </div>

      <footer className="p-12 rounded-[4rem] bg-primary/5 flex flex-col md:flex-row gap-8 justify-between items-center">
        <div className="flex items-center gap-6">
          <div className="size-20 bg-primary/20 rounded-3xl" />
          <div className="space-y-3">
            <div className="h-6 w-48 bg-surface-container-high rounded" />
            <div className="h-4 w-64 bg-surface-container-high rounded" />
          </div>
        </div>
        <div className="flex gap-4">
          <div className="h-12 w-32 bg-surface-container-high rounded-full" />
          <div className="h-12 w-36 bg-surface-container-high rounded-full" />
        </div>
      </footer>
    </main>
  );
}
