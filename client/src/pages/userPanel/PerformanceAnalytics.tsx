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
  const { examData } = useSelector((state: RootState) => state.exams ?? null);
  const targetedExams = examData.filter((el) =>
    profile.target_exams.includes(el.id),
  );

  useEffect(() => {
    dispatch(fetchExams());
  }, [dispatch]);

  useEffect(() => {
    if (profile?.target_exams?.[0] && !selectedExam) {
      setSelectedExam(profile.target_exams[0]);
    }
  }, [profile, selectedExam, targetedExams]);

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

    // Per-attempt scores for growth chart
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
      performanceTrajectory: performanceTrajectory.slice(-12), // Show up to 12
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
          ? `Advanced ${metrics.strongChapters[0].subject} Quiz`
          : "General Overview Quiz",
      desc: "Strengthen your base by taking a mixed-subject practice set.",
    });
    return insights.slice(0, 3);
  }, [metrics]);

  // Latest report from the most recent attempt
  const latestReport =
    attempts.length > 0
      ? {
          title:
            chapters.find((c) => c.id === attempts[0].chapter_id)?.name ||
            "Practice Session",
          date: attempts[0].submitted_at
            ? `Completed on ${new Date(attempts[0].submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
            : "In Progress",
          score: `${metrics?.accuracy || 0}%`,
          attemptId: attempts[0].id,
        }
      : null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 border-4 border-green-700 border-t-transparent rounded-full animate-spin" />
          <p className="font-bold text-gray-500 animate-pulse">
            Calculating your performance...
          </p>
        </div>
      </div>
    );
  }

  const performanceTrajectory = metrics?.performanceTrajectory || [];
  const maxScore = 100; // Accuracy is 0-100

  return (
    <main className="pb-20 px-6 lg:px-12 max-w-7xl mx-auto space-y-16 animate-reveal">
      {/* Hero / Editorial Greeting */}
      <section className="pt-8">
        <h1 className="text-6xl font-black leading-[0.9] tracking-tighter text-on-surface">
          Growth <span className="text-primary italic">&</span> <br />
          Precision.
        </h1>
        <p className="mt-8 text-on-surface-variant max-w-lg text-lg font-medium leading-relaxed opacity-80">
          Your journey through the{" "}
          <span className="text-primary font-black px-2 py-0.5 bg-primary/5 rounded-lg">
            {targetedExams?.find((e: any) => e.id === selectedExam)?.name || "curriculum"}
          </span>{" "}
          is showing strong technical mastery and consistent momentum.
        </p>
      </section>

      {/* Target Selector Tube */}
      <div className="bg-surface-container-high rounded-full p-2 w-fit shadow-ambient backdrop-blur-xl border border-outline-variant/5">
        <div className="flex flex-wrap gap-2">
          {targetedExams?.map((item: any, index: number) => (
            <button
              key={index}
              onClick={() => setSelectedExam(item.id)}
              className={`px-8 py-3 rounded-full font-technical font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-500 cursor-pointer ${
                selectedExam === item.id 
                  ? "bg-primary text-on-primary shadow-lg shadow-primary/20 scale-105" 
                  : "text-on-surface-variant hover:bg-surface/50 hover:text-on-surface"
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Analytics Grid */}
      <div className="grid lg:grid-cols-12 gap-8">
        {/* Core Metric: Large Stamping */}
        <div className="lg:col-span-4 bg-surface-container-low p-10 rounded-[3rem] shadow-ambient hover-bloom group">
            <div className="size-16 bg-surface-container-high rounded-2xl flex items-center justify-center text-primary mb-8 shadow-sm group-hover:bg-primary group-hover:text-white transition-all duration-500">
              <TrendingUp size={28} />
            </div>
            <h3 className="text-[11px] font-technical font-black uppercase tracking-widest text-on-surface-variant opacity-60 mb-2">Momentum Trend</h3>
          <p className="text-8xl font-technical font-black text-on-surface tracking-tighter leading-none">
            {metrics?.testsCount || 0}
          </p>
          <p className="text-sm font-bold text-on-surface-variant mt-4 opacity-60">Completed Sessions</p>
        </div>

        {/* Dynamic Growth Chart Component */}
        <GrowthChart
          performanceTrajectory={performanceTrajectory}
          maxScore={maxScore}
          chartMode={chartMode}
          setChartMode={setChartMode}
        />

        {/* Detailed Breakdown Section */}
        <div className="lg:col-span-8">
          <SubjectMastery examid={selectedExam} metrics={metrics} />
        </div>

        {/* Speed vs Precision Tube */}
        <div className="lg:col-span-4 bg-surface-container-low p-10 rounded-[3rem] shadow-ambient">
          <h3 className="text-xl font-black text-on-surface mb-10 tracking-tight">Focus Balance</h3>
          <div className="space-y-12">
            <div className="flex items-center gap-8">
              <div className="shrink-0 size-24 border-10 border-primary/20 rounded-full flex items-center justify-center text-2xl font-technical font-black text-primary bg-primary/5 shadow-inner">
                {metrics?.accuracy || 0}<span className="text-xs opacity-40">%</span>
              </div>
              <div>
                <p className="text-[10px] font-technical font-black text-on-surface-variant uppercase tracking-widest opacity-40">Accuracy</p>
                <p className="text-sm font-bold text-on-surface leading-tight mt-1">Syllabus Precision</p>
              </div>
            </div>
            
            <div className="flex items-center gap-8">
              <div className="shrink-0 size-24 border-10 border-on-surface/5 rounded-full flex items-center justify-center text-2xl font-technical font-black text-on-surface-variant bg-on-surface/5 shadow-inner">
                {metrics?.avgTimeSec || 0}<span className="text-xs opacity-40">s</span>
              </div>
              <div>
                <p className="text-[10px] font-technical font-black text-on-surface-variant uppercase tracking-widest opacity-40">Tempo</p>
                <p className="text-sm font-bold text-on-surface leading-tight mt-1">Avg Response Speed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Insights & Distribution Tubes */}
        <div className="lg:col-span-6">
           <QuestionDistribution metrics={metrics} />
        </div>
        
        <div className="lg:col-span-6">
           <AiInsights aiInsights={aiInsights} />
        </div>

        {/* Chapter Pods: Strong vs Weak */}
        <div className="lg:col-span-6 bg-surface-container-low p-10 rounded-[3rem] shadow-ambient hover-bloom">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-xl font-black text-on-surface tracking-tight flex items-center gap-4">
              <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                 <CheckCircle size={20} />
              </div>
              Masthead Chapters
            </h3>
          </div>
          <div className="space-y-4">
            {(metrics?.strongChapters || []).length > 0 ? (
              metrics!.strongChapters.map((ch, i) => (
                <div key={i} className="flex justify-between items-center p-6 bg-white/40 rounded-3xl hover:bg-white transition-all duration-300 group">
                  <div>
                    <p className="font-technical font-black text-sm text-on-surface uppercase tracking-wider">{ch.name}</p>
                    <p className="text-[10px] font-technical font-black text-primary uppercase tracking-[0.2em] mt-1 opacity-60">{ch.subject}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-2xl font-technical font-black text-primary tracking-tighter">
                       {ch.accuracy}%
                     </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-on-surface-variant text-xs italic opacity-40 p-6">Complete more sessions to identify strengths.</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-6 bg-surface-container-low p-10 rounded-[3rem] shadow-ambient hover-bloom">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-xl font-black text-on-surface tracking-tight flex items-center gap-4">
              <div className="size-10 bg-tertiary/10 rounded-xl flex items-center justify-center text-tertiary">
                 <FileWarning size={20} />
              </div>
              Soil Enrichment
            </h3>
          </div>
          <div className="space-y-4">
            {(metrics?.weakChapters || []).length > 0 ? (
              metrics!.weakChapters.map((ch, i) => (
                <div key={i} className="flex justify-between items-center p-6 bg-tertiary/5 rounded-3xl hover:bg-tertiary/10 transition-all duration-300 group">
                  <div>
                    <p className="font-technical font-black text-sm text-on-surface uppercase tracking-wider">{ch.name}</p>
                    <p className="text-[10px] font-technical font-black text-tertiary uppercase tracking-[0.2em] mt-1 opacity-60">{ch.subject}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-2xl font-technical font-black text-tertiary tracking-tighter">
                       {ch.accuracy}%
                     </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-on-surface-variant text-xs italic opacity-40 p-6">Your garden is fully balanced.</p>
            )}
          </div>
        </div>
      </div>

      {/* Call to Action Footer Pod */}
      <footer className="flex flex-col md:flex-row items-center justify-between gap-8 p-12 bg-primary/5 rounded-[4rem] border border-primary/10 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <TrendingUp size={200} />
        </div>
        <div className="flex items-center gap-8 relative z-10">
          <div className="size-20 rounded-3xl bg-primary flex items-center justify-center shadow-xl shadow-primary/30 text-white group hover:scale-105 transition-transform duration-500">
            <TrendingUp size={36} className="group-hover:translate-y-[-4px] transition-transform" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-on-surface mb-2 tracking-tight">
              Cultivate your potential.
            </h3>
            <p className="text-on-surface-variant text-sm font-medium leading-relaxed max-w-sm">
              We've synthesized your performance data into a specialized growth path.
            </p>
          </div>
        </div>
        <div className="flex gap-4 relative z-10">
          <button
            onClick={() => attempts.length > 0 && navigate(`/user/results/${attempts[0].id}`)}
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

const GrowthChart = ({
  performanceTrajectory,
  maxScore,
  chartMode,
  setChartMode,
}: {
  performanceTrajectory: any[];
  maxScore: number;
  chartMode: "Practice" | "Mock";
  setChartMode: (m: "Practice" | "Mock") => void;
}) => {
  return (
    <div className="lg:col-span-8 bg-surface-container-low p-10 rounded-[3rem] shadow-ambient">
      <div className="flex justify-between items-center mb-12">
        <h3 className="text-xl font-black text-on-surface tracking-tight flex items-center gap-4">
          <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
             <TrendingUp size={20} />
          </div>
          Session Trajectory
        </h3>
        <div className="flex gap-1 bg-surface-container-high p-1 rounded-full shadow-inner">
          <button
            onClick={() => setChartMode("Practice")}
            className={`text-[10px] font-technical font-black uppercase tracking-[0.2em] px-6 py-2 rounded-full transition-all duration-500 cursor-pointer ${
              chartMode === "Practice" 
                ? "bg-primary text-on-primary shadow-md scale-105" 
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Practice
          </button>
          <button
            onClick={() => setChartMode("Mock")}
            className={`text-[10px] font-technical font-black uppercase tracking-[0.2em] px-6 py-2 rounded-full transition-all duration-500 cursor-pointer ${
              chartMode === "Mock" 
                ? "bg-tertiary text-white shadow-md scale-105" 
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Mock
          </button>
        </div>
      </div>
      <div className="flex items-end gap-3 h-56 px-4">
        {(performanceTrajectory.length > 0
          ? performanceTrajectory
          : Array(10).fill({ accuracy: 0, chapterName: "Seedling" })
        ).map((item, i) => {
          const barColor = chartMode === "Practice" ? "bg-primary" : "bg-tertiary";
          const barOpacity = item.accuracy === 0 ? "opacity-10" : "opacity-100";
          
          return (
            <div
              key={i}
              className="flex-1 bg-on-surface/5 rounded-t-2xl relative group h-full flex flex-col justify-end transition-all duration-700 ease-(--ease-botanical) hover:bg-on-surface/10"
            >
              <div
                className={`rounded-t-2xl transition-all duration-1000 ease-out shadow-sm ${barColor} ${barOpacity} group-hover:brightness-110`}
                style={{ height: `${(item.accuracy / maxScore) * 100}%` }}
              />
              
              {/* Tooltip Pod */}
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-on-surface text-surface text-[10px] font-technical font-black px-4 py-3 rounded-2xl shadow-ambient opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all pointer-events-none whitespace-nowrap z-20 flex flex-col items-center gap-1 border border-outline-variant/10">
                <span className={chartMode === "Practice" ? "text-primary-container" : "text-tertiary"}>
                  {item.accuracy}%
                </span>
                <span className="text-[8px] uppercase tracking-widest opacity-40">
                  {item.chapterName}
                </span>
                <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-on-surface rotate-45" />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-8 px-4 opacity-30">
        {(performanceTrajectory.length > 0
          ? performanceTrajectory
          : Array(10).fill(null)
        ).map((_, i) => (
          <span
            key={i}
            className="flex-1 text-center text-[9px] font-technical font-black uppercase tracking-[0.2em] text-on-surface-variant"
          >
            S{i + 1}
          </span>
        ))}
      </div>
    </div>
  );
};
