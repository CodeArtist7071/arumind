import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../../utils/supabase';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { 
  ArrowLeft, 
  BookOpen, 
  ChevronRight, 
  Calendar, 
  Layers, 
  Search, 
  Filter,
  Trophy,
  Target,
  CheckCircle2,
  PlayCircle,
  LayoutDashboard,
  History,
  TrendingUp,
  Award
} from 'lucide-react';

interface Attempt {
  id: string;
  exam_id: string;
  subject_id: string;
  chapter_id: string;
  status: string;
  started_at: string;
  submitted_at: string;
  exam_name?: string;
  subject_name?: string;
  chapter_name?: string;
}

const ResultsHistory = () => {
  const { user } = useSelector((state: RootState) => state.user);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        // 1. Fetch all attempts
        const { data: attemptsData, error: attemptsError } = await supabase
          .from('test_attempts')
          .select('*')
          .eq('user_id', user.id)
          .order('submitted_at', { ascending: false });

        if (attemptsError) throw attemptsError;

        // 2. Fetch metadata in parallel
        const [examsRes, subjectsRes, chaptersRes] = await Promise.all([
          supabase.from('exams').select('id, name'),
          supabase.from('subjects').select('id, name'),
          supabase.from('chapters').select('id, name')
        ]);

        const examsMap = (examsRes.data || []).reduce((acc: any, cur: any) => ({ ...acc, [cur.id]: cur.name }), {});
        const subjectsMap = (subjectsRes.data || []).reduce((acc: any, cur: any) => ({ ...acc, [cur.id]: cur.name }), {});
        const chaptersMap = (chaptersRes.data || []).reduce((acc: any, cur: any) => ({ ...acc, [cur.id]: cur.name }), {});

        const enrichedAttempts = (attemptsData || []).map(a => ({
          ...a,
          exam_name: examsMap[a.exam_id] || "Unknown Exam",
          subject_name: subjectsMap[a.subject_id] || "Unknown Subject",
          chapter_name: chaptersMap[a.chapter_id] || "Unknown Chapter"
        }));

        setAttempts(enrichedAttempts);
      } catch (error) {
        console.error("Error fetching results history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user?.id]);

  const stats = useMemo(() => {
    if (attempts.length === 0) return { total: 0, completed: 0, unique: 0, rate: 0 };
    const completed = attempts.filter(a => a.status === 'COMPLETED').length;
    const unique = new Set(attempts.map(a => a.chapter_id)).size;
    const rate = Math.round((completed / attempts.length) * 100);
    return { total: attempts.length, completed, unique, rate };
  }, [attempts]);

  const filteredGroups = useMemo(() => {
    let result = attempts;
    
    if (statusFilter !== "ALL") {
      result = result.filter(a => a.status === statusFilter);
    }
    
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(a => 
        a.exam_name?.toLowerCase().includes(lowerSearch) ||
        a.subject_name?.toLowerCase().includes(lowerSearch) ||
        a.chapter_name?.toLowerCase().includes(lowerSearch)
      );
    }

    const groups: Record<string, Record<string, Attempt[]>> = {};
    result.forEach(a => {
      if (!groups[a.exam_name!]) groups[a.exam_name!] = {};
      if (!groups[a.exam_name!][a.subject_name!]) groups[a.exam_name!][a.subject_name!] = [];
      groups[a.exam_name!][a.subject_name!].push(a);
    });

    return groups;
  }, [attempts, searchTerm, statusFilter]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 border-4 border-[#1a57db] border-t-transparent rounded-full animate-spin" />
          <p className="font-bold text-slate-500 animate-pulse">Retreiving your progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 font-['Inter'] text-slate-900 dark:text-slate-100 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 text-slate-500"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
                <History className="size-5 text-[#1a57db]" />
                Practice History
              </h1>
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none mt-1">
                Aswin's Learning Journey
              </p>
            </div>
          </div>

          <button 
            onClick={() => navigate('/user/dashboard')}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-sm font-bold transition-all"
          >
            <LayoutDashboard className="size-4" />
            Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-10">
        
        {/* Stats Section */}
        {/* <section className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Attempts', value: stats.total, icon: <TrendingUp className="size-5" />, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Chapters Covered', value: stats.unique, icon: <Layers className="size-5" />, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
            { label: 'Completed', value: stats.completed, icon: <Award className="size-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
            { label: 'Success Rate', value: `${stats.rate}%`, icon: <Target className="size-5" />, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
          ].map((s, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
              <div className={`size-10 ${s.bg} ${s.color} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                {s.icon}
              </div>
              <p className="text-2xl font-black">{s.value}</p>
              <p className="text-md font-bold text-slate-400">{s.label}</p>
            </div>
          ))}
        </section> */}

        {/* Filter Section */}
        <section className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by Exam, Subject or Chapter..."
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-2 ring-[#1a57db] outline-none shadow-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 p-2 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl w-full md:w-auto">
            {['ALL', 'STARTED', 'COMPLETED'].map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`flex-1 md:flex-none px-4 py-3 rounded-lg text-md font-bold transition-all ${
                  statusFilter === filter 
                    ? 'bg-white dark:bg-slate-700 text-[#1a57db] dark:text-white shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </section>

        {/* History Cards */}
        <section className="space-y-12">
          {Object.entries(filteredGroups).length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-500">
              <div className="size-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="size-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-black text-slate-400">No matching attempts found</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto font-medium">Try adjusting your filters or start a new practice test to fill your history.</p>
              <button
                onClick={() => navigate('/user/dashboard')}
                className="mt-8 px-8 py-3 bg-[#1a57db] text-white rounded-2xl font-black shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all"
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            Object.entries(filteredGroups).map(([exam, subjects]) => (
              <div key={exam} className="space-y-6">
                <div className="flex items-center gap-4 px-2">
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                  <h2 className="text-xl font-bold uppercase text-slate-300 whitespace-nowrap">
                    {exam}
                  </h2>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                </div>

                <div className="grid gap-8 lg:grid-cols-1">
                  {Object.entries(subjects).map(([subject, atts]) => (
                    <div key={subject} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 group">
                      <div className="bg-linear-to-r from-[#1a57db]/5 to-transparent px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center group-hover:from-[#1a57db]/10 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="size-10 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-[#1a57db] shadow-xs border border-slate-100 dark:border-slate-700">
                            <BookOpen className="size-5" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight">{subject}</h3>
                            <p className="text-sm text-slate-400 font-semibold mt-0.5">Subject Stream</p>
                          </div>
                        </div>
                        <div className="bg-[#1a57db] text-white text-sm font-black px-3 py-2 rounded-md shadow-lg shadow-blue-500/20 tracking-normal">
                          {atts.length} {atts.length === 1 ? 'Attempt' : 'Attempts'}
                        </div>
                      </div>

                      <div className="divide-y divide-slate-50 dark:divide-slate-800/50 p-2">
                        {atts.map((attempt) => (
                          <div
                            key={attempt.id}
                            onClick={() => navigate(`/user/results/${attempt.id}`)}
                            className="m-2 rounded-2xl px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300 group/item cursor-pointer"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`size-10 rounded-xl flex items-center justify-center ${
                                attempt.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'
                              }`}>
                                {attempt.status === 'COMPLETED' ? <CheckCircle2 className="size-5" /> : <PlayCircle className="size-5" />}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-md font-medium text-slate-600 dark:text-slate-100 group-hover/item:text-[#1a57db] transition-colors">
                                  {attempt.chapter_name}
                                </span>
                                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1">
                                  <span className="flex items-center gap-1.5">
                                    <Calendar className="size-3" />
                                    {new Date(attempt.submitted_at || attempt.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-md ${
                                    attempt.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                  }`}>
                                    {attempt.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <ChevronRight className="size-5 text-slate-200 group-hover/item:text-[#1a57db] group-hover/item:translate-x-1 transition-all" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
};

export default ResultsHistory;
