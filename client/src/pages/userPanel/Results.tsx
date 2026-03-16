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
  History
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const formatDate = (dateString: string) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: '2-digit', minute: '2-digit' });
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
          supabase.from("exams").select("name").eq("id", attemptData.exam_id).single(),
          supabase.from("subjects").select("name").eq("id", attemptData.subject_id).single(),
          supabase.from("chapters").select("name").eq("id", attemptData.chapter_id).single()
        ]);

        setAttempt({
          ...attemptData,
          exams: examRes.data,
          subjects: subRes.data,
          chapters: chapRes.data
        });

        const { data: qData, error: qError } = await supabase
          .from("questions")
          .select("*")
          .eq("chapter_id", attemptData.chapter_id);

        if (qError) throw qError;
        setQuestions(qData || []);

        const { data: aData, error: aError } = await supabase
          .from("test_attempt_answers")
          .select("*")
          .eq("attempt_id", attemptId);

        if (aError) throw aError;
        
        const answerMap = (aData || []).reduce((acc: any, curr: any) => {
          acc[curr.question_id] = curr;
          return acc;
        }, {});
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
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
    const scorePercent = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    
    let duration = "N/A";
    if (attempt?.started_at && attempt?.submitted_at) {
      const start = new Date(attempt.started_at).getTime();
      const end = new Date(attempt.submitted_at).getTime();
      const diffMs = end - start;
      const mins = Math.floor(diffMs / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
      duration = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    }

    return { correct, incorrect, skipped, totalScore, maxScore, accuracy, duration, attempted, scorePercent };
  }, [questions, answers, attempt]);

  const distributionData = [
    { name: 'Correct', value: metrics.correct, color: '#10b981' },
    { name: 'Incorrect', value: metrics.incorrect, color: '#f43f5e' },
    { name: 'Skipped', value: metrics.skipped, color: '#94a3b8' }
  ].filter(d => d.value > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-6 p-8">
        <div className="relative size-24">
           <div className="absolute inset-0 border-4 border-[#1a57db]/20 rounded-full" />
           <div className="absolute inset-0 border-4 border-[#1a57db] border-t-transparent rounded-full animate-spin" />
           <Trophy className="absolute inset-0 m-auto size-8 text-[#1a57db] animate-bounce" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Analyzing Mastery</h2>
          <p className="text-sm font-bold text-slate-400 animate-pulse uppercase tracking-[0.2em]">Calculating results & AI insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 font-['Inter'] text-slate-900 dark:text-slate-100 pb-20">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
           <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate(-1)}
                className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-slate-500"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                   <Target className="text-[#1a57db]" size={18} />
                   Performance Report
                </h1>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Attempt #{attempt?.id.slice(0, 8)}</p>
              </div>
           </div>

           <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/user/dashboard')}
                className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-[#1a57db]/5 text-[#1a57db] rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#1a57db]/10 transition-all"
              >
                <LayoutDashboard size={14} />
                Dashboard
              </button>
              <div className="size-10 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 font-black text-xs">
                 {metrics.totalScore}
              </div>
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-10 space-y-12">
        
        {/* HERO PERFORMANCE CARD */}
        <section className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[4rem] border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 size-80 bg-[#1a57db]/5 rounded-full blur-3xl group-hover:bg-[#1a57db]/10 transition-colors" />
          
          <div className="flex flex-col lg:flex-row items-center gap-12 relative z-10">
             {/* Score Ring */}
             <div className="relative size-60 md:size-72 shrink-0">
               <svg className="w-full h-full transform -rotate-90">
                  <circle cx="50%" cy="50%" r="45%" strokeWidth="20" fill="transparent" className="text-slate-100 dark:text-slate-800" stroke="currentColor" />
                  <circle 
                    cx="50%" cy="50%" r="45%" strokeWidth="20" fill="transparent" 
                    strokeDasharray="283%" 
                    strokeDashoffset={283 - (metrics.scorePercent * 2.83)}
                    className="text-[#1a57db]" stroke="currentColor" strokeLinecap="round" 
                  />
               </svg>
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter">{metrics.totalScore}</span>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mt-1">Score Out of {metrics.maxScore}</span>
               </div>
             </div>

             <div className="flex-1 space-y-8 w-full">
                <div className="space-y-4 text-center lg:text-left">
                   <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                      <Zap size={12} fill="currentColor" />
                      {metrics.accuracy}% Accuracy Achieved
                   </div>
                   <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter">
                      {metrics.accuracy >= 80 ? "Phenomenal Mastery!" : metrics.accuracy >= 50 ? "Solid Progress!" : "Keep Pushing Harder!"}
                   </h2>
                   <p className="text-slate-500 dark:text-slate-400 text-lg font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0">
                      You've completed the assessment for <span className="text-[#1a57db] font-black">{attempt?.chapters?.name}</span>. Your performance indicates a <span className="font-bold underline">{metrics.accuracy < 50 ? "need for foundational revision" : "strong grasp of concepts"}</span>.
                   </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   {[
                     { label: 'Time Taken', value: metrics.duration, icon: <Clock size={16} /> },
                     { label: 'Questions', value: questions.length, icon: <BookOpen size={16} /> },
                     { label: 'Exam Date', value: formatDate(attempt?.submitted_at || "").split(',')[0], icon: <Calendar size={16} /> },
                     { label: 'Status', value: attempt?.status, icon: <Zap size={16} /> }
                   ].map((item, i) => (
                     <div key={i} className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-4xl border border-slate-100 dark:border-slate-800 space-y-2 group/stat hover:border-[#1a57db]/30 transition-all">
                        <div className="text-slate-400 group-hover/stat:text-[#1a57db] transition-colors">{item.icon}</div>
                        <p className="text-xl font-black text-slate-900 dark:text-white">{item.value}</p>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{item.label}</p>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
           
           {/* PERFORMANCE INSIGHTS */}
           <div className="lg:col-span-5 space-y-8">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 space-y-8 shadow-xl">
                 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3">
                    <BarChart3 size={16} className="text-[#1a57db]" />
                    Question Distribution
                 </h3>

                 <div className="h-[240px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                         <Pie
                            data={distributionData}
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                         >
                            {distributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                         </Pie>
                         <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', fontWeight: 'bold' }} />
                      </PieChart>
                   </ResponsiveContainer>
                 </div>

                 <div className="space-y-3">
                    {distributionData.map((d, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                         <div className="flex items-center gap-3">
                            <div className="size-3 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-xs font-black uppercase tracking-tight text-slate-600 dark:text-slate-300">{d.name}</span>
                         </div>
                         <span className="text-sm font-black text-slate-900 dark:text-white">{d.value}</span>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="bg-linear-to-br from-indigo-600 to-blue-700 p-8 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                    <BrainCircuit size={120} />
                 </div>
                 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-100/70 mb-6 flex items-center gap-3">
                    <Zap size={16} />
                    AI Action Plan
                 </h3>
                 <div className="space-y-6 relative z-10">
                    <div className="bg-white/10 p-5 rounded-3xl border border-white/10 backdrop-blur-sm">
                       <p className="text-sm font-bold leading-relaxed italic">
                         {metrics.accuracy < 50 
                           ? `Focus on rebuilding basic concepts of ${attempt?.chapters?.name}. Your strength in accuracy is low.`
                           : `You're ready for more complex subjects. Double down on mock tests to maintain this momentum.`}
                       </p>
                    </div>
                    <button 
                      onClick={() => navigate(`/user/dashboard`)} 
                      className="w-full py-4 bg-white text-[#1a57db] rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all"
                    >
                       Start Targeted Practice
                    </button>
                 </div>
              </div>
           </div>

           {/* QUESTION REVIEW */}
           <div className="lg:col-span-7 space-y-8">
              <div className="flex items-center justify-between px-4">
                 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3">
                    <History size={16} className="text-[#1a57db]" />
                    Question Review
                 </h3>
                 <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                       <div className="size-2 rounded-full bg-emerald-500" />
                       <span className="text-[9px] font-black uppercase text-slate-400">Correct</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="size-2 rounded-full bg-rose-500" />
                       <span className="text-[9px] font-black uppercase text-slate-400">Wrong</span>
                    </div>
                 </div>
              </div>

              <div className="space-y-4">
                 {questions.map((q, i) => {
                   const ans = answers[q.id];
                   const isCorrect = ans?.selected_option === q.correct_answer;
                   const isOpened = openQuestion === q.id;
                   
                   return (
                     <div key={q.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden group/q transition-all">
                        <div 
                          onClick={() => setOpenQuestion(isOpened ? null : q.id)}
                          className="p-6 md:p-8 flex items-start justify-between gap-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                           <div className="flex items-start gap-5">
                              <div className={`size-10 shrink-0 rounded-2xl flex items-center justify-center font-black text-sm border-2 transition-all ${
                                !ans?.selected_option ? 'border-slate-100 bg-slate-50 text-slate-300' :
                                isCorrect ? 'border-emerald-100 bg-emerald-50 text-emerald-500' : 'border-rose-100 bg-rose-50 text-rose-500'
                              }`}>
                                 {i + 1}
                              </div>
                              <div className="space-y-1">
                                 <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-relaxed">{q.question}</h4>
                                 <div className="flex items-center gap-3">
                                    <span className="text-[10px] uppercase font-black tracking-widest text-[#1a57db]">{q.difficulty_level || 'Medium'}</span>
                                    <div className="h-1 w-1 rounded-full bg-slate-200" />
                                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">{q.marks} Marks</span>
                                 </div>
                              </div>
                           </div>
                           <div className={`p-2 rounded-xl transition-all ${isOpened ? 'bg-[#1a57db] text-white rotate-180' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                              <ChevronDown size={14} />
                           </div>
                        </div>

                        {isOpened && (
                          <div className="px-8 pb-8 pt-2 space-y-6 animate-in slide-in-from-top-2 duration-300">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {q.options?.map((opt) => {
                                  let style = "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-100";
                                  if (opt.l === q.correct_answer) style = "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 shadow-md shadow-emerald-500/5";
                                  if (ans?.selected_option === opt.l && opt.l !== q.correct_answer) style = "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 shadow-md shadow-rose-500/5";

                                  return (
                                    <div key={opt.l} className={`p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${style}`}>
                                       <div className={`size-6 rounded-lg flex items-center justify-center font-black text-[10px] border ${
                                         opt.l === q.correct_answer ? 'bg-white border-emerald-100' : 'bg-white/50 border-slate-200'
                                       }`}>
                                          {opt.l}
                                       </div>
                                       <span className="text-xs font-bold">{opt.v}</span>
                                       {opt.l === q.correct_answer && <CheckCircle2 size={16} className="ml-auto" />}
                                       {ans?.selected_option === opt.l && opt.l !== q.correct_answer && <XCircle size={16} className="ml-auto" />}
                                    </div>
                                  );
                                })}
                             </div>

                             <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-3 mb-3 text-[#1a57db]">
                                   <Info size={16} />
                                   <span className="text-[10px] font-black uppercase tracking-widest">Expert Explanation</span>
                                </div>
                                <p className="text-xs font-medium text-slate-500 leading-relaxed italic">
                                   {q.explanation || `The correct answer is Option ${q.correct_answer}. This topic covers essential concepts related to ${attempt?.subjects?.name}. Review your notes on this chapter for more clarity.`}
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
      </main>
    </div>
  );
};

export default Results;