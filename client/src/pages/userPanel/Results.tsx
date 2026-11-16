import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { supabase } from "../../utils/supabase";
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  BarChart3,
  BrainCircuit,
  LayoutDashboard,
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  Zap,
  Target,
  Trophy,
  ChevronRight,
  ChevronDown,
  Info,
  History,
  Shield,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { HtmlContent } from "../../components/ui/HtmlContent";

const formatDate = (dateString: string) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

interface AttemptDetails {
  id: string;
  started_at: string;
  submitted_at: string;
  status: string;
  exam_id: string;
  subject_id: string;
  chapter_id: string;
  exams?: { name: string };
  subjects?: { name: string };
  chapters?: { name: string };
}

interface Question {
  id: number;
  question: string;
  correct_answer: string;
  options?: { l: string; v: string }[];
  marks: number;
  difficulty_level: string;
  explanation?: string;
}

interface Answer {
  question_id: number;
  selected_option: string;
  is_submitted: boolean;
}

const Results = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<AttemptDetails | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [openQuestion, setOpenQuestion] = useState<number | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!attemptId) return;

      try {
        setLoading(true);
        const { data: attemptData, error: attemptError } = await supabase
          .from("test_attempts")
          .select("*")
          .eq("id", attemptId)
          .single();

        if (attemptError) throw attemptError;

        const [examRes, subRes, chapRes] = await Promise.all([
          supabase
            .from("exams")
            .select("name")
            .eq("id", attemptData.exam_id)
            .single(),
          supabase
            .from("subjects")
            .select("name")
            .eq("id", attemptData.subject_id)
            .single(),
          supabase
            .from("chapters")
            .select("name")
            .eq("id", attemptData.chapter_id)
            .single(),
        ]);

        setAttempt({
          ...attemptData,
          exams: examRes.data,
          subjects: subRes.data,
          chapters: chapRes.data,
        });

        const { data: aData, error: aError } = await supabase
          .from("test_attempt_answers")
          .select(`
            *,
            questions (*)
          `)
          .eq("attempt_id", attemptId);

        if (aError) throw aError;

        const retrievedQuestions: Question[] = [];
        const answerMap: Record<number, Answer> = {};

        (aData || []).forEach((row: any) => {
          if (row.questions) {
            retrievedQuestions.push(row.questions);
            answerMap[row.question_id] = {
              question_id: row.question_id,
              selected_option: row.selected_option,
              is_submitted: row.is_submitted
            };
          }
        });

        // Sort questions by their original order: question_number first, then id as fallback
        retrievedQuestions.sort((a: any, b: any) => {
          const numA = a.question_number ?? 0;
          const numB = b.question_number ?? 0;
          if (numA !== numB) return numA - numB;
          return (a.id || 0) - (b.id || 0);
        });

        setQuestions(retrievedQuestions);
        setAnswers(answerMap);
      } catch (err) {
        console.error("Error fetching results:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [attemptId]);

  const metrics = useMemo(() => {
    let correct = 0;
    let incorrect = 0;
    let skipped = 0;
    let totalScore = 0;
    let maxScore = 0;

    questions.forEach((q) => {
      const ans = answers[q.id];
      maxScore += q.marks || 0;
      const isCorrect = ans?.selected_option === q.correct_answer;

      if (!ans || !ans.selected_option) {
        skipped++;
      } else if (isCorrect) {
        correct++;
        totalScore += q.marks || 0;
      } else {
        incorrect++;
      }
    });

    const attempted = correct + incorrect;
    const accuracy =
      attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
    const scorePercent =
      maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    let duration = "N/A";
    if (attempt?.started_at && attempt?.submitted_at) {
      const start = new Date(attempt.started_at).getTime();
      const end = new Date(attempt.submitted_at).getTime();
      const diffMs = end - start;
      const mins = Math.floor(diffMs / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
      duration = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    }

    return {
      correct,
      incorrect,
      skipped,
      totalScore,
      maxScore,
      accuracy,
      duration,
      attempted,
      scorePercent,
    };
  }, [questions, answers, attempt]);

  const distributionData = [
    { name: "Correct", value: metrics.correct, color: "#10b981" },
    { name: "Incorrect", value: metrics.incorrect, color: "#f43f5e" },
    { name: "Skipped", value: metrics.skipped, color: "#94a3b8" },
  ].filter((d) => d.value > 0);

  if (loading || !attempt) {
    return (
      <div className="min-h-screen bg-surface-container-low dark:bg-slate-950 flex flex-col items-center justify-center p-6 animate-reveal">
        <div className="relative size-32 flex items-center justify-center mb-8">
          <div className="absolute inset-0 border-8 border-[#16a34a]/10 rounded-full" />
          <div className="absolute inset-0 border-8 border-[#16a34a] border-t-transparent rounded-full animate-spin" />
          <Trophy className="size-12 text-[#16a34a] animate-bounce" />
        </div>
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-black text-on-surface dark:text-white uppercase tracking-tighter">
            Analyzing Mastery
          </h2>
          <div className="flex items-center justify-center gap-2">
            <span className="size-1.5 bg-primary rounded-full animate-pulse" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
              Calculating results & AI insights
            </p>
            <span className="size-1.5 bg-primary rounded-full animate-pulse delay-75" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-narrative text-on-surface antialiased transition-colors duration-700 pb-20">
      <main className="max-w-7xl mx-auto p-4 md:p-10">

        {/* MOBILE MANIFESTATION - High Density & Elegant */}
        <section className="lg:hidden space-y-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate("/user/results")}
              className="p-2.5 bg-surface-container-high rounded-xl text-on-surface-variant shadow-sm"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex flex-col">
              <span className="text-[8px] font-technical font-black text-primary uppercase tracking-[0.4em]">Performance Report</span>
              <h1 className="text-xl font-black text-on-surface tracking-tighter">Test Results</h1>
            </div>
          </div>

          {/* Mobile Hero: Compact Score & Insights */}
          <div className="bg-surface-container-low p-6 rounded-3xl shadow-ambient-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 size-48 bg-primary/5 rounded-full blur-3xl" />

            <div className="flex flex-col items-center text-center gap-6 relative z-10">
              <div className="relative size-40">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="50%" cy="50%" r="45%" strokeWidth="8" fill="transparent" className="text-surface-container-highest" stroke="currentColor" />
                  <circle cx="50%" cy="50%" r="45%" strokeWidth="8" fill="transparent" strokeDasharray="283%" strokeDashoffset={283 - metrics.scorePercent * 2.83} className="text-primary transition-all duration-1000 ease-botanical" stroke="currentColor" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-technical font-black text-on-surface">{metrics.totalScore}</span>
                  <span className="text-[7px] font-technical font-black uppercase text-on-surface-variant/40 tracking-widest mt-1">Total {metrics.maxScore}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[8px] font-technical font-black uppercase tracking-widest">
                  <Zap size={10} fill="currentColor" />
                  {metrics.accuracy}% System Accuracy
                </div>
                <h2 className="text-3xl font-black text-on-surface tracking-tighter">
                  {metrics.accuracy >= 80 ? "Exemplary Performance" : metrics.accuracy >= 50 ? "Consistent Progress" : "Needs Review"}
                </h2>
                <p className="text-[11px] text-on-surface-variant leading-relaxed opacity-70">
                  Result analysis complete for <span className="text-primary font-bold">{attempt?.chapters?.name}</span>.
                </p>
              </div>

              {/* Mobile Metrics: 2x2 Dense Grid */}
              <div className="grid grid-cols-2 gap-3 w-full mt-2">
                {[
                  { label: "Duration", value: metrics.duration, icon: <Clock size={14} /> },
                  { label: "Inventory", value: questions.length, icon: <BookOpen size={14} /> },
                  { label: "Accuracy", value: `${metrics.accuracy}%`, icon: <Target size={14} /> },
                  { label: "Status", value: attempt?.status, icon: <Shield size={14} /> },
                ].map((item, i) => (
                  <div key={i} className="bg-surface-container-high/40 p-3 rounded-2xl border border-outline-variant/10 text-left">
                    <div className="text-primary mb-1">{item.icon}</div>
                    <p className="text-sm font-technical font-black text-on-surface">{item.value}</p>
                    <p className="text-[7px] font-technical font-black text-on-surface-variant/40 uppercase tracking-widest leading-none mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile Insights: Living Highlights */}
          <div className="bg-primary text-white p-6 rounded-3xl shadow-xl space-y-4">
            <div className="flex items-center gap-2 opacity-50">
              <Zap size={12} fill="currentColor" />
              <span className="text-[8px] font-technical font-black uppercase tracking-[0.3em]">Performance Insight</span>
            </div>
            <p className="text-sm font-bold leading-relaxed tracking-tight">
              {metrics.accuracy < 50
                ? `Focusing on the foundational structure of ${attempt?.chapters?.name} is recommended. Reinforcement needed.`
                : `Demonstrating cognitive patterns required for advanced complex reasoning.`}
            </p>
          </div>

          {/* Mobile Question Review: Ultra-Clean Timeline */}
          <div className="space-y-4 pb-20">
            <div className="flex items-center justify-between px-2">
              <span className="text-[8px] font-technical font-black uppercase tracking-[0.3em] text-on-surface-variant/40">Analytical Feed</span>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5"><div className="size-1.5 rounded-full bg-primary" /><span className="text-[7px] font-technical font-black uppercase text-on-surface-variant/60">Correct</span></div>
                <div className="flex items-center gap-1.5"><div className="size-1.5 rounded-full bg-error" /><span className="text-[7px] font-technical font-black uppercase text-on-surface-variant/60">Erroneous</span></div>
              </div>
            </div>

            <div className="space-y-6">
              {questions.map((q, i) => {
                const ans = answers[q.id];
                const isCorrect = ans?.selected_option === q.correct_answer;

                return (
                  <div key={q.id} className="bg-surface-container-low rounded-3xl overflow-hidden border border-outline-variant/10 shadow-ambient-sm p-5 space-y-5">
                    <div className="flex items-start gap-4">
                      <div className={`size-8 rounded-lg flex items-center justify-center font-technical font-black text-[10px] border-2 shrink-0 ${!ans?.selected_option ? "border-outline-variant/20 bg-surface-container-high text-on-surface-variant/40" :
                        isCorrect ? "border-primary/20 bg-primary/5 text-primary" : "border-error/20 bg-error/5 text-error"
                        }`}>
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <h4 className="text-[13px] font-black text-on-surface leading-snug"><HtmlContent html={q.question} /></h4>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {q.options?.map((opt) => (
                        <div key={opt.l} className={`p-3 rounded-xl border flex flex-row justify-between items-center gap-3 min-h-[20px] ${opt.l === q.correct_answer ? "bg-primary/5 border-primary/20 text-primary" :
                          ans?.selected_option === opt.l ? "bg-error/5 border-error/20 text-error" :
                            "bg-surface-container-high/40 border-outline-variant/5 text-on-surface-variant/70"
                          }`}>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-technical font-black opacity-40">{opt.l}</span>
                            <span className="text-[11px] ml-4 font-bold tracking-tight leading-tight"><HtmlContent html={opt.v} /></span>

                          </div>
                          {opt.l === q.correct_answer && <CheckCircle2 className="ml-2" size={10} />}
                          {ans?.selected_option === opt.l && opt.l !== q.correct_answer && <XCircle size={10} />}

                        </div>
                      ))}
                    </div>

                    <div className="bg-surface-container-high/40 p-4 rounded-2xl border border-dashed border-outline-variant/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Info size={12} className="text-primary" />
                        <p className="text-[9px] font-technical font-black text-primary uppercase tracking-widest">Preparation Insight</p>
                      </div>
                      <p className="text-[10px] font-medium text-on-surface-variant/80 leading-relaxed italic"><HtmlContent html={q.explanation || `Core evaluation confirms Option ${q.correct_answer} is correct.`} /></p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* DESKTOP MANIFESTATION (HIDDEN ON MOBILE) */}
        <div className="hidden lg:block space-y-12">
          {/* HERO PERFORMANCE CARD */}
          <PerformanceCard
            metrics={metrics}
            attempt={attempt}
            questions={questions}
          />

          <div className="grid sm:grid-cols-1 lg:grid-cols-12 gap-10">
            {/* PERFORMANCE INSIGHTS */}
            <div className="lg:col-span-5 space-y-8">
              <div className="bg-surface-container-low p-8 rounded-[2.5rem] space-y-8 shadow-ambient-sm">
                <h3 className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-on-surface-variant/40 flex items-center gap-3">
                  <BarChart3 size={16} className="text-primary" />
                  Distribution Metrics
                </h3>

                <div className="h-[240px] w-full relative">
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-mono font-black">{metrics.accuracy}%</span>
                    <span className="text-[8px] font-mono font-bold uppercase tracking-widest opacity-40">Accuracy</span>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distributionData}
                        innerRadius={70}
                        outerRadius={95}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                      >
                        {distributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: "20px",
                          border: "none",
                          fontSize: "12px",
                          fontFamily: "Space Grotesk, monospace",
                          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)"
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2">
                  {distributionData.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 bg-surface-container-high/40 rounded-2xl group transition-all duration-300 hover:bg-surface-container-high"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: d.color }}
                        />
                        <span className="text-[11px] font-mono font-bold uppercase tracking-tight text-on-surface-variant/70">
                          {d.name}
                        </span>
                      </div>
                      <span className="text-sm font-mono font-black text-on-surface">
                        {d.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-primary text-white p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 p-8 opacity-10 group-hover:scale-125 group-hover:-rotate-12 transition-all duration-700">
                  <BrainCircuit size={160} />
                </div>
                <h3 className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-white/50 mb-6 flex items-center gap-3">
                  <Zap size={16} fill="currentColor" />
                  Performance Insights
                </h3>
                <div className="space-y-8 relative z-10">
                  <p className="text-xl font-narrative font-bold leading-relaxed tracking-tight">
                    {metrics.accuracy < 50
                      ? `Our analysis suggests focusing on the foundational concepts of ${attempt?.chapters?.name}. Your current performance profile requires review.`
                      : `Excellent performance in ${attempt?.chapters?.name}. You are demonstrating strong conceptual clarity in this topic.`}
                  </p>
                  <button
                    onClick={() => navigate(`/user/dashboard`)}
                    className="w-full py-4 cursor-pointer bg-white text-primary rounded-full font-mono font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            </div>

            {/* QUESTION REVIEW */}
            <div className="lg:col-span-7 h-185 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
              <div className="flex items-center justify-between px-4">
                <h3 className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-on-surface-variant/40 flex items-center gap-3">
                  <History size={16} className="text-primary" />
                  Analytical Review
                </h3>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-primary" />
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-on-surface-variant/60">
                      Correct
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-error" />
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-on-surface-variant/60">
                      Erroneous
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {questions.map((q, i) => {
                  const ans = answers[q.id];
                  const isCorrect = ans?.selected_option === q.correct_answer;
                  const isOpened = openQuestion === q.id;

                  return (
                    <div
                      key={q.id}
                      className="bg-surface-container-low rounded-4xl overflow-hidden group/q transition-all duration-500 hover-bloom"
                    >
                      <div
                        onClick={() => setOpenQuestion(isOpened ? null : q.id)}
                        className="p-8 flex items-start justify-between gap-6 cursor-pointer hover:bg-surface-container-high/60 transition-colors"
                      >
                        <div className="flex items-start gap-6">
                          <div
                            className={`size-12 shrink-0 rounded-2xl flex items-center justify-center font-mono font-black text-sm border-2 transition-all duration-500 ${!ans?.selected_option
                              ? "border-surface-container-highest bg-surface-container-high text-on-surface-variant/40"
                              : isCorrect
                                ? "border-primary/20 bg-primary/5 text-primary"
                                : "border-error/20 bg-error/5 text-error"
                              }`}
                          >
                            {String(i + 1).padStart(2, '0')}
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-lg font-bold text-on-surface leading-snug group-hover/q:text-primary transition-colors">
                              <HtmlContent html={q.question} />
                            </h4>
                            <div className="flex items-center gap-4">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
                                {q.difficulty_level || "Medium"}
                              </span>
                              <div className="h-1 w-1 rounded-full bg-on-surface-variant/20" />
                              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-on-surface-variant/40">
                                Valuation <span className="text-on-surface-variant">{q.marks}u</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        <div
                          className={`p-2.5 rounded-full transition-all duration-500 ${isOpened ? "bg-primary text-white rotate-180" : "bg-surface-container-highest text-on-surface-variant/40"}`}
                        >
                          <ChevronDown size={14} />
                        </div>
                      </div>

                      {isOpened && (
                        <div className="px-8 pb-10 pt-2 space-y-8 animate-in slide-in-from-top-4 duration-500 ease-botanical">
                          <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4">
                            {q.options?.map((opt) => {
                              let style = "bg-surface-container-high text-on-surface-variant/70 border-transparent";
                              if (opt.l === q.correct_answer)
                                style = "bg-primary/10 text-primary border-primary/20 shadow-emerald-500/10";
                              if (ans?.selected_option === opt.l && opt.l !== q.correct_answer)
                                style = "bg-error/10 text-error border-error/20 shadow-rose-500/10";

                              return (
                                <div
                                  key={opt.l}
                                  className={`p-5 rounded-3xl border-2 flex items-center gap-4 transition-all duration-300 ${style}`}
                                >
                                  <div
                                    className={`size-8 rounded-xl flex items-center justify-center font-mono font-bold text-sm border transition-colors ${opt.l === q.correct_answer
                                      ? "bg-white border-primary/30 text-primary"
                                      : "bg-surface-container-highest/50 border-on-surface-variant/10 text-on-surface-variant/40"
                                      }`}
                                  >
                                    {opt.l}
                                  </div>
                                  <span className="text-sm font-bold tracking-tight">
                                    <HtmlContent html={opt.v} />
                                  </span>
                                  {opt.l === q.correct_answer && (
                                    <CheckCircle2 size={18} className="ml-auto opacity-100" />
                                  )}
                                  {ans?.selected_option === opt.l && opt.l !== q.correct_answer && (
                                    <XCircle size={18} className="ml-auto opacity-100" />
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          <div className="bg-surface-container-high/40 p-8 rounded-4xl border-2 border-dashed border-on-surface-variant/10">
                            <div className="flex items-center gap-3 mb-4 text-primary">
                              <Info size={18} />
                              <span className="text-[10px] font-mono font-black uppercase tracking-[0.3em]">
                                Performance Insights
                              </span>
                            </div>
                            <p className="text-sm font-medium text-on-surface-variant/80 leading-relaxed italic pr-6">
                              <HtmlContent html={q.explanation ||
                                `Option ${q.correct_answer} is the correct answer. Reviewing the core concepts of ${attempt?.subjects?.name} will clarify this topic.`} />
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Results;

const PerformanceCard = ({ metrics, attempt, questions }) => {
  return (
    <section className="bg-surface-container-low p-10 md:p-20 rounded-[3rem] shadow-ambient-lg relative overflow-hidden group transition-all duration-700 hover:shadow-ambient-xl">
      <div className="absolute top-0 right-0 -mt-20 -mr-20 size-96 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-1000" />

      <div className="flex sm:flex-col lg:flex-row items-center gap-16 relative z-10">
        {/* Score Ring */}
        <div className="relative size-64 md:size-80 shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              strokeWidth="16"
              fill="transparent"
              className="text-surface-container-highest"
              stroke="currentColor"
            />
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              strokeWidth="16"
              fill="transparent"
              strokeDasharray="283%"
              strokeDashoffset={283 - metrics.scorePercent * 2.83}
              className="text-primary transition-all duration-1000 ease-botanical"
              stroke="currentColor"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-7xl font-mono font-black text-on-surface tracking-tighter">
              {metrics.totalScore}
            </span>
            <span className="text-[10px] font-mono font-bold uppercase text-on-surface-variant/40 tracking-[0.2em] mt-1">
              Total <span className="text-on-surface-variant">{metrics.maxScore}</span>
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-10 w-full">
          <div className="space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[10px] font-mono font-bold uppercase tracking-widest">
              <Zap size={12} fill="currentColor" />
              {metrics.accuracy}% System Accuracy
            </div>
            <h2 className="text-5xl md:text-7xl font-narrative font-black text-on-surface tracking-tighter leading-[0.9]">
              {metrics.accuracy >= 80
                ? "Excellent Mastery"
                : metrics.accuracy >= 50
                  ? "Consistent Progress"
                  : "Needs Review"}
            </h2>
            <p className="text-on-surface-variant text-xl font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0 opacity-70">
              You've completed the evaluation for{" "}
              <span className="text-primary font-bold">
                {attempt?.chapters?.name}
              </span>
              . Your performance indicators suggest a{" "}
              <span className="font-bold underline decoration-primary/30 underline-offset-4">
                {metrics.accuracy < 50
                  ? "conceptual gap"
                  : "robust understanding"}
              </span>
              .
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                label: "Time Taken",
                value: metrics.duration,
                icon: <Clock size={16} />,
              },
              {
                label: "Inventory",
                value: questions.length,
                icon: <BookOpen size={16} />,
              },
              {
                label: "Record Date",
                value: formatDate(attempt?.submitted_at || "").split(",")[0],
                icon: <Calendar size={16} />,
              },
              {
                label: "Status Code",
                value: attempt?.status,
                icon: <Shield size={16} />,
              },
            ].map((item, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-surface-container-high/40 transition-all duration-300 group/stat hover:bg-surface-container-highest"
              >
                <div className="text-on-surface-variant/40 group-hover/stat:text-primary transition-colors mb-3">
                  {item.icon}
                </div>
                <p className="text-2xl font-mono font-black text-on-surface">
                  {item.value}
                </p>
                <p className="text-[9px] font-mono font-bold uppercase text-on-surface-variant/40 tracking-[0.2em] mt-1">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
