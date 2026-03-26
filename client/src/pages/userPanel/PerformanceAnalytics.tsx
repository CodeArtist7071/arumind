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
      <div className="flex min-h-screen items-center justify-center bg-white">
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
    <main className="md:ml-64 pt-24 pb-12 px-6 md:px-12 max-w-7xl mx-auto">
      {/* Hero */}
      <section className="mb-12">
        <h1 className="text-5xl font-extrabold leading-tight">
          Growth <span className="text-green-700">&</span> Precision.
        </h1>
        <p className="mt-4 text-gray-600 max-w-xl text-lg font-medium">
          Your{" "}
          <span className="text-green-700 font-bold">
            {targetedExams?.find((e: any) => e.id === selectedExam)?.name ||
              "exam"}
          </span>{" "}
          preparation trajectory is showing consistent growth.
        </p>
      </section>
      <div className="bg-green-200 rounded-full p-2 mb-12 w-fit">
        <div
          className={`flex flex-wrap gap-6`}
        >
          {targetedExams?.map((item: any, index: number) => (
            <button
              key={index}
              onClick={() => setSelectedExam(item.id)}
              className={`px-8 py-3 rounded-full font-black text-sm uppercase tracking-widest transition-all cursor-pointer shadow-sm border-2 ${selectedExam === item.id ? "bg-green-700 text-white border-green-700 shadow-green-200 shadow-lg scale-105" : "bg-white text-green-800 border-green-100 hover:border-green-300 hover:bg-green-50"}`}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid md:grid-cols-12 gap-6">
        {/* Ranking */}
        <div className="md:col-span-4 bg-white p-6 rounded-xl shadow">
          <h3 className="text-xl font-bold mb-4">Odisha Rankings</h3>
          <p className="text-6xl font-bold text-green-700">
            {metrics?.testsCount || 0}
          </p>
          <p className="text-sm text-gray-500">Tests Completed</p>
        </div>

        {/* Growth Chart */}
        <GrowthChart
          performanceTrajectory={performanceTrajectory}
          maxScore={maxScore}
          chartMode={chartMode}
          setChartMode={setChartMode}
        />

        <SubjectMastery examid={selectedExam} metrics={metrics} />

        {/* Accuracy vs Speed */}
        <div className="md:col-span-6 bg-white p-6 rounded-xl shadow">
          <h3 className="text-xl font-bold mb-6">Accuracy vs Speed</h3>
          <div className="flex justify-around">
            <div className="text-center">
              <div className="w-20 h-20 border-4 border-green-300 rounded-full flex items-center justify-center text-xl font-black text-green-800">
                {metrics?.accuracy || 0}%
              </div>
              <p className="text-xs mt-2 text-gray-500 font-medium">Accuracy</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 border-4 border-gray-300 rounded-full flex items-center justify-center text-xl font-black text-gray-700">
                {metrics?.avgTimeSec || 0}s
              </div>
              <p className="text-xs mt-2 text-gray-500 font-medium">
                Avg Time/Test
              </p>
            </div>
          </div>
        </div>
        <QuestionDistribution metrics={metrics} />
        <AiInsights aiInsights={aiInsights} />

        {/* Strong vs Weak Chapters */}
        <div className="md:col-span-6 bg-white p-6 rounded-xl shadow">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
            <CheckCircle className="text-green-600" size={20} />
            Strongest Chapters
          </h3>
          {(metrics?.strongChapters || []).length > 0 ? (
            metrics!.strongChapters.map((ch, i) => (
              <div
                key={i}
                className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0"
              >
                <div>
                  <p className="font-bold text-sm">{ch.name}</p>
                  <p className="text-xs text-gray-500">{ch.subject}</p>
                </div>
                <p className="text-green-700 font-black text-lg">
                  {ch.accuracy}%
                </p>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-sm italic">
              Complete more tests to see strengths.
            </p>
          )}
        </div>

        <div className="md:col-span-6 bg-white p-6 rounded-xl shadow">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
            <FileWarning className="text-red-500" size={20} />
            Focus Areas
          </h3>
          {(metrics?.weakChapters || []).length > 0 ? (
            metrics!.weakChapters.map((ch, i) => (
              <div
                key={i}
                className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0"
              >
                <div>
                  <p className="font-bold text-sm">{ch.name}</p>
                  <p className="text-xs text-gray-500">{ch.subject}</p>
                </div>
                <p className="text-red-600 font-black text-lg">
                  {ch.accuracy}%
                </p>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-sm italic">
              No weak areas identified yet.
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 bg-green-50 border border-green-100 rounded-xl mb-8">
        <div className="flex items-center gap-6">
          <div className="size-16 rounded-xl bg-white flex items-center justify-center shadow text-green-700">
            <Pen size={28} />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-1">
              Ready to master the concepts?
            </h3>
            <p className="text-gray-600 text-sm max-w-md">
              We've generated a custom study plan based on these results.
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() =>
              attempts.length > 0 && navigate(`/user/results/${attempts[0].id}`)
            }
            className="px-6 py-3 bg-white border border-gray-200 rounded-xl font-bold text-sm shadow hover:shadow-lg transition-all"
          >
            Review Errors
          </button>
          <button
            onClick={() => navigate("/user/dashboard")}
            className="px-6 py-3 bg-green-700 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-green-800 transition-all"
          >
            Go to Study Plan
          </button>
        </div>
      </div>
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
    <div className="md:col-span-8 bg-[#f5f4e8] p-8 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
          <TrendingUp className="text-green-700" />
          Performance Trajectory
        </h3>
        <div className="flex gap-1 bg-green-100 p-1 text-white rounded-xl items-center shadow-inner">
          <button
            onClick={() => setChartMode("Practice")}
            className={`text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-lg transition-all cursor-pointer ${chartMode === "Practice" ? "bg-green-700 text-white shadow-md" : "text-green-800 hover:bg-green-200"}`}
          >
            Practice
          </button>
          <button
            onClick={() => setChartMode("Mock")}
            className={`text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-lg transition-all cursor-pointer ${chartMode === "Mock" ? "bg-green-700 text-white shadow-md" : "text-green-800 hover:bg-green-200"}`}
          >
            Mock
          </button>
        </div>
      </div>
      <div className="flex items-end gap-3 h-48">
        {(performanceTrajectory.length > 0
          ? performanceTrajectory
          : Array(10).fill({ accuracy: 0, chapterName: "No Data" })
        ).map((item, i) => (
          <div
            key={i}
            className="flex-1 bg-green-200/50 rounded-t-xl relative group h-full flex flex-col justify-end"
          >
            <div
              className={`rounded-t-xl transition-all duration-700 ease-out ${chartMode === "Practice" ? "bg-green-700" : "bg-green-900"}`}
              style={{ height: `${(item.accuracy / maxScore) * 100}%` }}
            />
            <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-black px-3 py-2 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-all group-hover:-top-16 pointer-events-none whitespace-nowrap z-20 flex flex-col items-center gap-1">
              <span className="text-green-400 font-black">
                {item.accuracy}%
              </span>
              <span className="text-[8px] uppercase tracking-tighter opacity-80">
                {item.chapterName}
              </span>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-gray-900" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-4">
        {(performanceTrajectory.length > 0
          ? performanceTrajectory
          : Array(10).fill(null)
        ).map((_, i) => (
          <span
            key={i}
            className="flex-1 text-center text-[10px] text-gray-400 font-black uppercase tracking-widest"
          >
            Set {i + 1}
          </span>
        ))}
      </div>
    </div>
  );
};
