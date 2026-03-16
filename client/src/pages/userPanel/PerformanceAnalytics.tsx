import { Bell, Book, CheckCircle, Download, FileWarning, History, Pen, Share, TrendingUp, Trophy, Target, Globe, Clock, FlaskConical, Beaker, Calculator, Calendar } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../../utils/supabase';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';

const PerformanceAnalytics = () => {
  const { user } = useSelector((state: RootState) => state.user);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [allAnswers, setAllAnswers] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        // 1. Fetch all test attempts for the user
          const { data: atts, error: attsError } = await supabase
            .from('test_attempts')
            .select('*')
            .eq('user_id', user.id)
            .order('submitted_at', { ascending: false });

        // 2. Fetch all answers for these attempts
        const attemptIds = (atts || []).map(a => a.id);
        const { data: answersData } = await supabase
          .from('test_attempt_answers')
          .select('*, questions(*)')
          .in('attempt_id', attemptIds);

        // 3. Fetch chapters and subjects for mapping
        const [chapRes, subRes] = await Promise.all([
          supabase.from('chapters').select('*'),
          supabase.from('subjects').select('*')
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
  }, [user?.id]);

  const metrics = useMemo(() => {
    if (attempts.length === 0) return null;

    let totalPoints = 0;
    let maxPossiblePoints = 0;
    let totalCorrect = 0;
    let totalIncorrect = 0;
    let totalSkipped = 0;
    let totalTimeMs = 0;

    const subjectStats: Record<string, any> = {};
    const chapterStats: Record<string, any> = {};

    allAnswers.forEach(ans => {
      const q = ans.questions;
      if (!q) return;

      const subId = q.subject_id;
      const chapId = q.chapter_id;

      if (!subjectStats[subId]) {
        subjectStats[subId] = { correct: 0, total: 0, totalMarks: 0, maxMarks: 0, timeMs: 0 };
      }
      if (!chapterStats[chapId]) {
        chapterStats[chapId] = { correct: 0, total: 0, subId };
      }

      subjectStats[subId].total++;
      subjectStats[subId].maxMarks += q.marks || 0;
      chapterStats[chapId].total++;

      if (ans.selected_option === q.correct_answer) {
        totalCorrect++;
        totalPoints += q.marks || 0;
        subjectStats[subId].correct++;
        subjectStats[subId].totalMarks += q.marks || 0;
        chapterStats[chapId].correct++;
      } else if (ans.selected_option) {
        totalIncorrect++;
      } else {
        totalSkipped++;
      }
    });

    attempts.forEach(a => {
      if (a.started_at && a.submitted_at) {
        totalTimeMs += new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime();
      }
    });

    const accuracy = (totalCorrect + totalIncorrect) > 0 
      ? Math.round((totalCorrect / (totalCorrect + totalIncorrect)) * 100) 
      : 0;

    const avgTimeMin = attempts.length > 0 
      ? Math.round((totalTimeMs / attempts.length) / 60000) 
      : 0;

    // Aggregate strong/weak chapters
    const sortedChapters = Object.entries(chapterStats)
      .map(([id, stats]: [string, any]) => ({
        id,
        name: chapters.find(c => c.id === id)?.name || "Unknown",
        subject: subjects.find(s => s.id === stats.subId)?.name || "Unknown",
        accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
      }))
      .sort((a, b) => b.accuracy - a.accuracy);

    const breakdown = Object.entries(subjectStats).map(([id, s]) => {
      const subject = subjects.find(sub => sub.id === id);
      return {
        subject: subject?.name || "Unknown",
        questions: s.total,
        score: `${s.totalMarks} / ${s.maxMarks}`,
        accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
        time: "N/A", // We don't track per-subject time yet
        color: "blue",
        icon: <FlaskConical className="size-6 text-blue-600" />
      };
    });

    return {
      stats: [
        { label: 'Total Score', value: `${totalPoints} / ${maxPossiblePoints || (totalCorrect + totalIncorrect + totalSkipped)}`, trend: '+0 pts', trendColor: 'text-green-600', icon: <Trophy className="size-6 text-blue-600" /> },
        { label: 'Accuracy', value: `${accuracy}%`, trend: '+0%', trendColor: 'text-green-600', icon: <Target className="size-6 text-orange-500" /> },
        { label: 'Tests Taken', value: `#${attempts.length}`, subtitle: `All-time attempts`, icon: <Globe className="size-6 text-blue-500" /> },
        { label: 'Avg Time', value: `${avgTimeMin} min`, subtitle: `Per practice session`, icon: <Clock className="size-6 text-purple-500" /> }
      ],
      subjectBreakdown: breakdown,
      strongChapters: sortedChapters.filter(c => c.accuracy >= 80).slice(0, 2),
      weakChapters: sortedChapters.filter(c => c.accuracy < 50).slice(0, 2),
      dist: { correct: totalCorrect, incorrect: totalIncorrect, skipped: totalSkipped, total: totalCorrect + totalIncorrect + totalSkipped }
    };
  }, [attempts, allAnswers, chapters, subjects]);


  const aiInsights = useMemo(() => {
    if (!metrics) return [
      { type: 'Getting Started', color: 'text-blue-400', title: 'Begin your journey', desc: 'Complete your first practice test to unlock personalized AI insights and study plans.' }
    ];

    const insights = [];
    if (metrics.weakChapters.length > 0) {
      insights.push({
        type: 'Focus Area',
        color: 'text-[#1a57db]',
        title: `${metrics.weakChapters[0].name} Concepts`,
        desc: `Your accuracy is ${metrics.weakChapters[0].accuracy}% in this chapter. We recommend reviewing the core concepts.`
      });
    }
    
    if (metrics.dist.skipped > 5) {
      insights.push({
        type: 'Action Required',
        color: 'text-green-400',
        title: 'Improve Time Management',
        desc: `You've skipped ${metrics.dist.skipped} questions. Try to allocate at least 60s per question to improve attempts.`
      });
    }

    insights.push({
      type: 'Next Recommended',
      color: 'text-blue-400',
      title: metrics.strongChapters.length > 0 ? `Advanced ${metrics.strongChapters[0].subject} Quiz` : 'General Overview Quiz',
      desc: 'Strengthen your base by taking a mixed-subject practice set.'
    });

    return insights.slice(0, 3);
  }, [metrics]);


  const stats = metrics?.stats || [
    {
      label: 'Total Score',
      value: '---',
      trend: '+0 pts',
      trendColor: 'text-slate-400',
      icon: <Trophy className="size-6 text-slate-400" />,
    },
    {
      label: 'Accuracy',
      value: '0%',
      trend: '+0%',
      trendColor: 'text-slate-400',
      icon: <Target className="size-6 text-slate-400" />,
    },
    {
      label: 'Tests Taken',
      value: '#0',
      subtitle: 'Start practicing now',
      icon: <Globe className="size-6 text-slate-400" />,
    },
    {
      label: 'Avg Time',
      value: '0 min',
      subtitle: 'Avg: -- min',
      icon: <Clock className="size-6 text-slate-400" />,
    }
  ];

  const subjectBreakdown = metrics?.subjectBreakdown || [];
  const strongChapters = metrics?.strongChapters || [];
  const weakChapters = metrics?.weakChapters || [];
  const distribution = metrics?.dist || { correct: 0, incorrect: 0, skipped: 0, total: 0 };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 border-4 border-[#1a57db] border-t-transparent rounded-full animate-spin" />
          <p className="font-bold text-slate-500 animate-pulse">Calculating your performance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 font-['Inter'] text-slate-900 dark:text-slate-100">
      {/* Navigation Header */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white/90 px-6 md:px-20 py-4 sticky top-0 z-50 dark:border-slate-800 dark:bg-slate-900/90 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-4 text-[#1a57db]">
          <div className="size-8 flex items-center justify-center bg-[#1a57db]/10 rounded-lg">
            
          </div>
          <h2 className="text-lg font-black leading-tight tracking-tight text-slate-900 dark:text-slate-100">
            EduMetrics Pro
          </h2>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center justify-center rounded-lg h-10 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 text-sm font-bold gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200">
            <Share size="20px" />
            <span className="hidden sm:inline"></span>
          </button>
          <button className="flex items-center justify-center rounded-lg h-10 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 text-sm font-bold gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200">
            <Download size="20px" />
            <span className="hidden sm:inline">Report</span>
          </button>
          <button 
            onClick={() => navigate('/user/dashboard')}
            className="flex items-center justify-center rounded-lg h-10 bg-[#1a57db] text-white px-6 text-sm font-bold gap-2 shadow-lg hover:bg-[#1a57db]/90 hover:shadow-xl transition-all duration-200"
          >
            <History size="20px" />
            <span>Retake Test</span>
          </button>
        </div>
      </header>

      <main className="flex flex-1 justify-center py-12 px-4 md:px-10">
        <div className="flex flex-col max-w-[1200px] flex-1 gap-12">
          {/* Hero Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/80 dark:bg-slate-900/80 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-md">
            <div className="flex flex-col gap-3">
              <span className="text-[#1a57db] font-bold text-sm uppercase tracking-wider">
                {attempts.length > 0 ? `${attempts[0].status === 'completed' ? 'Latest Attempt Completed' : 'Attempt In Progress'}` : 'No Attempts Found'}
              </span>
              <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight text-slate-900 dark:text-slate-100">
                {attempts.length > 0 ? (chapters.find(c => c.id === attempts[0].chapter_id)?.name || "Practice Session") : "Performance Overview"}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-lg">
                {attempts.length > 0 
                  ? `Keep it up! You have completed ${attempts.length} sets of practice questions.` 
                  : "Start your first practice test to see your performance metrics here!"}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => navigate('/user/results')}
                className="px-8 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold shadow-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-300"
              >
                View Full History
              </button>
              <button 
                onClick={() => {
                  if (attempts.length > 0) {
                    navigate(`/user/results/${attempts[0].id}`);
                  } else {
                    navigate('/user/dashboard');
                  }
                }}
                className="px-8 py-4 bg-[#1a57db] text-white rounded-2xl font-bold shadow-2xl shadow-[#1a57db]/25 hover:bg-[#1a57db]/90 hover:scale-105 transition-all duration-300"
              >
                {attempts.length > 0 ? "Review Solutions" : "Take a Test"}
              </button>
            </div>
          </div>

          {/* Score Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="flex flex-col gap-3 rounded-3xl p-8 bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 backdrop-blur-md"
              >
                <div className="flex items-center justify-between">
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider">{stat.label}</p>
                  {stat.icon}
                </div>
                <p className={`text-4xl font-black text-slate-900 dark:text-slate-100 ${stat.value.includes('/') ? 'leading-tight' : ''}`}>
                  {stat.value}
                </p>
                {stat.subtitle ? (
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">{stat.subtitle}</p>
                ) : (
                  <div className={`flex items-center gap-1 ${stat.trendColor} text-sm font-bold`}>
                    <TrendingUp color='white' size={20} />
                    <span>{stat.trend}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Middle Section: Chart & AI Suggestions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Question Distribution Chart */}
            <div className="lg:col-span-2 flex flex-col gap-8 p-10 bg-white/70 dark:bg-slate-900/70 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">Question Distribution</h3>
                <span className="text-slate-500 dark:text-slate-400 text-lg font-semibold">Total {distribution.total} Questions</span>
              </div>
              <div className="flex flex-col gap-8">
                <div className="h-12 w-full flex rounded-3xl overflow-hidden bg-slate-100/50 dark:bg-slate-800/50 shadow-inner border border-slate-200/50 dark:border-slate-700/50">
                  <div className="bg-linear-to-r from-green-500 to-green-600 h-full shadow-lg" style={{ width: `${(distribution.correct / (distribution.total || 1)) * 100}%` }} title={`Correct: ${distribution.correct}`} />
                  <div className="bg-linear-to-r from-red-500 to-red-600 h-full shadow-lg" style={{ width: `${(distribution.incorrect / (distribution.total || 1)) * 100}%` }} title={`Incorrect: ${distribution.incorrect}`} />
                  <div className="bg-linear-to-r from-slate-400 to-slate-500 h-full shadow-lg" style={{ width: `${(distribution.skipped / (distribution.total || 1)) * 100}%` }} title={`Unattempted: ${distribution.skipped}`} />
                </div>
                <div className="grid grid-cols-3 gap-8">
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-green-50/50 dark:bg-green-900/20 border border-green-200/50 dark:border-green-800/50">
                    <div className="size-4 rounded-full bg-green-500 shadow-lg" />
                    <div className="flex flex-col">
                      <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{distribution.correct}</span>
                      <span className="text-xs uppercase font-bold text-green-600 tracking-wider">Correct</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-red-50/50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-800/50">
                    <div className="size-4 rounded-full bg-red-500 shadow-lg" />
                    <div className="flex flex-col">
                      <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{distribution.incorrect}</span>
                      <span className="text-xs uppercase font-bold text-red-600 tracking-wider">Incorrect</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                    <div className="size-4 rounded-full bg-slate-400 shadow-lg" />
                    <div className="flex flex-col">
                      <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{distribution.skipped}</span>
                      <span className="text-xs uppercase font-bold text-slate-600 tracking-wider">Skipped</span>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-[#1a57db]/10 rounded-3xl border border-[#1a57db]/20 shadow-lg">
                  <div className="flex items-start gap-4">
                    <Bell className="text-[#1a57db] mt-1" size="24px" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                        <strong>Pro Tip:</strong> You spent 42% of your total time on just 15 skipped questions. Better time management on difficult problems could increase your score by up to 20 points.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Insights */}
            <div className="flex flex-col gap-6 p-10 bg-linear-to-br from-slate-900/95 to-slate-800/95 text-white rounded-3xl border border-slate-800/50 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <Book className="text-[#1a57db]" size="28px" />
                <h3 className="text-xl font-black">AI Improvement Plan</h3>
              </div>
              <div className="flex flex-col gap-4">
                {aiInsights.map((insight, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-2 p-5 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-sm hover:bg-white/20 transition-all duration-300"
                  >
                    <span className={`${insight.color} text-xs font-bold uppercase tracking-widest`}>{insight.type}</span>
                    <p className="text-lg font-bold">{insight.title}</p>
                    <p className="text-sm text-slate-300">{insight.desc}</p>
                  </div>
                ))}
              </div>
              <button className="w-full py-4 bg-[#1a57db] rounded-2xl font-bold text-lg shadow-2xl shadow-[#1a57db]/30 hover:bg-[#1a57db]/90 hover:shadow-3xl hover:scale-105 transition-all duration-300">
                Start Recommended Drill
              </button>
            </div>
          </div>

          {/* Detailed Breakdown Table */}
          <div className="flex flex-col gap-6">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">Subject-wise Breakdown</h2>
            <div className="overflow-x-auto rounded-3xl border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/70 shadow-2xl backdrop-blur-md">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 dark:bg-slate-800/70 border-b border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md">
                  <tr>
                    {['Subject', 'Questions', 'Score', 'Accuracy', 'Avg Time', 'Action'].map((header) => (
                      <th
                        key={header}
                        className="px-8 py-6 text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider text-center border-r last:border-r-0 border-slate-100 dark:border-slate-800"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/50">
                  {subjectBreakdown.map((subject, index) => (
                    <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors duration-200">
                      <td className="px-8 py-8">
                        <div className="flex items-center gap-4">
                          <div className={`size-12 rounded-2xl flex items-center justify-center shadow-lg ${
                            `bg-${subject.color}-100 dark:bg-${subject.color}-900/30 text-${subject.color}-600`
                          }`}>
                            {subject.icon}
                          </div>
                          <span className="font-black text-xl text-slate-900 dark:text-slate-100">{subject.subject}</span>
                        </div>
                      </td>
                      <td className="px-8 py-8 text-center text-lg text-slate-700 dark:text-slate-300 font-semibold">{subject.questions}</td>
                      <td className="px-8 py-8 text-center text-lg font-bold text-slate-900 dark:text-slate-100">{subject.score}</td>
                      <td className="px-8 py-8">
                        <div className="flex items-center gap-3 justify-center">
                          <div className={`w-28 bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden shadow-inner`}>
                            <div className={`bg-${subject.color}-500 h-full rounded-full shadow-lg`} style={{ width: `${subject.accuracy}%` }} />
                          </div>
                          <span className="text-lg font-black text-slate-900 dark:text-slate-100">{subject.accuracy}%</span>
                        </div>
                      </td>
                      <td className="px-8 py-8 text-center text-lg text-slate-700 dark:text-slate-300 font-semibold">{subject.time}</td>
                      <td className="px-8 py-8">
                        <button className="text-[#1a57db] hover:underline font-bold text-lg hover:text-[#1a57db]/80 transition-colors duration-200">
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Strong vs Weak Chapters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="flex flex-col gap-6">
              <h3 className="text-2xl font-black flex items-center gap-3 text-slate-900 dark:text-slate-100">
                <CheckCircle className="text-green-600" size="28px" />
                Strongest Chapters
              </h3>
              <div className="flex flex-col gap-4">
                {strongChapters.map((chapter, index) => (
                  <div
                    key={index}
                    className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 backdrop-blur-md flex justify-between items-center"
                  >
                    <div>
                      <p className="font-black text-xl text-slate-900 dark:text-slate-100">{chapter.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{chapter.subject}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-600 font-black text-2xl">{chapter.accuracy}%</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Accuracy</p>
                    </div>
                  </div>
                ))}
                {strongChapters.length === 0 && (
                  <p className="text-slate-400 text-sm italic p-4">Complete more tests to see your strengths.</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <h3 className="text-2xl font-black flex items-center gap-3 text-slate-900 dark:text-slate-100">
                <FileWarning className="text-red-600" size="28px" />
                Focus Areas (Weak Chapters)
              </h3>
              <div className="flex flex-col gap-4">
                {weakChapters.map((chapter, index) => (
                  <div
                    key={index}
                    className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-linear-to-r from-rose-50/70 to-red-50/70 dark:from-red-900/40 dark:to-red-800/40 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 backdrop-blur-md flex justify-between items-center"
                  >
                    <div>
                      <p className="font-black text-xl text-slate-900 dark:text-slate-100">{chapter.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{chapter.subject}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-red-600 font-black text-2xl">{chapter.accuracy}%</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Accuracy</p>
                    </div>
                  </div>
                ))}
                {weakChapters.length === 0 && (
                  <p className="text-slate-400 text-sm italic p-4">Keep practicing! No weak areas identified yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Footer CTA */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 p-12 bg-linear-to-r from-[#1a57db]/10 to-[#1a57db]/5 border border-[#1a57db]/20 rounded-3xl mb-16 shadow-2xl">
            <div className="flex items-center gap-8">
              <div className="size-20 rounded-2xl bg-white/80 dark:bg-slate-800/80 flex items-center justify-center shadow-2xl backdrop-blur-md">
                <Pen  className="text-4xl text-[#1a57db]" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-2">Ready to master the concepts?</h3>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md">
                  We've generated a custom study plan based on these results.
                </p>
              </div>
            </div>
            <div className="flex gap-6">
              <button 
                onClick={() => attempts.length > 0 && navigate(`/user/results/${attempts[0].id}`)}
                className="px-10 py-4 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-lg shadow-xl hover:bg-slate-50 hover:shadow-2xl transition-all duration-300 backdrop-blur-md"
              >
                Review Errors
              </button>
              <button className="px-10 py-4 bg-[#1a57db] text-white rounded-2xl font-bold text-lg shadow-2xl shadow-[#1a57db]/40 hover:scale-105 hover:shadow-3xl transition-all duration-300">
                Go to Study Plan
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/50 dark:border-slate-800/50 py-12 px-6 text-center text-slate-500/80 text-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
        <p>
          © 2024 EduMetrics Pro • All mock tests are property of their respective owners •{' '}
          <a className="text-[#1a57db] font-bold hover:underline transition-colors duration-200" href="#">
            Privacy Policy
          </a>
        </p>
      </footer>
    </div>
  );
};

export default PerformanceAnalytics;
