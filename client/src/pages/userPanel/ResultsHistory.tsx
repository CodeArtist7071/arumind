import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../../utils/supabase';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { 
  BookOpen, 
  ChevronRight, 
  Calendar, 
  Search, 
  CheckCircle2,
  PlayCircle,
  History,
  TrendingUp,
  Target
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

export default function ResultsHistory() {
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
        const { data: attemptsData, error: attemptsError } = await supabase
          .from('test_attempts')
          .select('*')
          .eq('user_id', user.id)
          .order('submitted_at', { ascending: false });

        if (attemptsError) throw attemptsError;

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
      <div className="flex h-[80vh] items-center justify-center bg-surface animate-reveal">
        <div className="flex flex-col items-center gap-6">
          <div className="size-16 bg-primary/10 rounded-3xl flex items-center justify-center">
             <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="flex flex-col items-center">
             <span className="text-[10px] font-technical font-black text-primary uppercase tracking-[0.4em] mb-2 animate-pulse">Syncing History</span>
             <p className="text-xl font-black text-on-surface tracking-tighter">History Log Loading.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface font-narrative text-on-surface antialiased transition-colors duration-700 pb-20 animate-reveal">
      <main className="max-w-7xl mx-auto md:px-12 py-0 md:py-10">

        {/* Mobile Feed: History Log */}
        <section className="md:hidden">
          {/* Sticky Glassmorphic Stats Header */}
          <div className="sticky top-0 z-40 bg-surface/95 backdrop-blur-xl border-b border-outline-variant/20 px-4 py-4 mb-6">
            <div className="flex flex-col gap-1 mb-4">
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">Learning activity</span>
              <h1 className="text-2xl font-bold text-on-surface tracking-tight">Test results</h1>
              <p className="text-sm text-on-surface-variant">Review scores and continue where you left off.</p>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'Attempts', value: stats.total },
                { label: 'Chapters', value: stats.unique },
                { label: 'Completed', value: stats.completed },
              ].map((s, idx) => (
                <div key={idx} className="bg-surface-container-low px-3 py-2.5 rounded-xl border border-outline-variant/20 min-w-0">
                  <p className="text-xs font-medium text-on-surface-variant mb-0.5">{s.label}</p>
                  <p className="text-lg font-bold text-primary tabular-nums">{s.value}</p>
                </div>
              ))}
            </div>

            <label className="relative block mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-on-surface-variant" aria-hidden="true" />
              <input type="search" aria-label="Search test results" placeholder="Search exam, subject, or chapter" className="w-full min-h-11 pl-10 pr-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </label>
            <div className="flex gap-2 overflow-x-auto no-scrollbar" role="group" aria-label="Filter results by status">
              {['ALL', 'STARTED', 'COMPLETED'].map(filter => <button key={filter} type="button" onClick={() => setStatusFilter(filter)} aria-pressed={statusFilter === filter} className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-semibold transition-colors ${statusFilter === filter ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant'}`}>{filter === 'ALL' ? 'All results' : filter === 'STARTED' ? 'In progress' : 'Completed'}</button>)}
            </div>
          </div>

          {/* Timeline Feed: Zero-BordersEditorial Look */}
          <div className="relative px-4 space-y-8 pb-20">
            {/* Central Timeline Line */}
            <div className="absolute left-9 top-0 bottom-0 w-px bg-linear-to-b from-primary/20 via-primary/5 to-transparent" />

            {Object.keys(filteredGroups).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-outline-variant/50 bg-surface-container-low p-8 text-center text-sm text-on-surface-variant">No matching results. Try changing your search or filter.</div>
            ) : (
                Object.entries(filteredGroups).map(([exam, subjects]) => (
                  <div key={exam} className="relative z-10 space-y-4">
                    <div className="flex items-center gap-2 px-1">
                      <div className="size-2 rounded-full bg-primary shrink-0" />
                      <p className="text-sm font-semibold text-primary leading-none">{exam}</p>
                    </div>

                    <div className="space-y-4">
                      {Object.entries(subjects).map(([subject, atts]) => (
                        <div key={subject} className="overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-low">
                           <div className="flex items-center gap-2 border-b border-outline-variant/20 px-4 py-3">
                              <BookOpen className="size-4 text-primary" />
                              <h3 className="text-sm font-semibold text-on-surface">{subject}</h3>
                           </div>

                           <div className="divide-y divide-outline-variant/20 px-3">
                             {atts.map((attempt) => (
                               <button
                                 key={attempt.id}
                                 type="button"
                                 onClick={() => navigate(`/user/results/${attempt.id}`)}
                                 className="group/item flex min-h-[76px] w-full items-center gap-3 py-3 text-left transition-colors hover:bg-surface-container-high/60"
                               >
                                   <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                                     attempt.status === 'COMPLETED' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
                                   }`}>
                                     {attempt.status === 'COMPLETED' ? <CheckCircle2 className="size-5" /> : <PlayCircle className="size-5" />}
                                   </div>
                                   <div className="min-w-0 flex-1">
                                      <p className="text-sm font-semibold text-on-surface group-hover/item:text-primary transition-colors truncate">{attempt.chapter_name}</p>
                                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                                        <span className="text-xs text-on-surface-variant">
                                          {new Date(attempt.submitted_at || attempt.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                        <span className={`text-xs font-semibold ${
                                           attempt.status === 'COMPLETED' ? 'text-primary' : 'text-secondary'
                                        }`}>{attempt.status}</span>
                                      </div>
                                   </div>
                                   <ChevronRight size={18} className="text-on-surface-variant group-hover/item:text-primary transition-colors" />
                               </button>
                             ))}
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
            )}
          </div>
        </section>

        {/* Desktop manifestation (Hidden on Mobile) */}
        <div className="hidden md:block space-y-12">
          <section className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary">Learning activity</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-on-surface">Test results</h1>
              <p className="mt-2 text-sm text-on-surface-variant">Review your attempts, scores, and progress by subject.</p>
            </div>
            <button type="button" onClick={() => navigate('/user/dashboard')} className="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90">Start a practice test</button>
          </section>
          {/* Stats Registry */}
          <section className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: 'Total attempts', value: stats.total, icon: <History size={20} />, color: 'text-primary' },
              { label: 'Chapters practiced', value: stats.unique, icon: <Target size={20} />, color: 'text-primary' },
              { label: 'Completed', value: stats.completed, icon: <CheckCircle2 size={20} />, color: 'text-primary' },
              { label: 'Completion rate', value: `${stats.rate}%`, icon: <TrendingUp size={20} />, color: 'text-primary' },
            ].map((s, idx) => (
              <div key={idx} className="bg-surface-container-low p-5 md:p-6 rounded-2xl border border-outline-variant/20 shadow-sm">
                <div className="flex justify-between items-start mb-5">
                  <div className={`p-3 rounded-xl bg-primary/10 ${s.color}`}>
                    {s.icon}
                  </div>
                </div>
                <p className="text-3xl font-bold text-on-surface tracking-tight leading-none">{s.value}</p>
                <p className="text-sm text-on-surface-variant mt-2">{s.label}</p>
              </div>
            ))}
          </section>

          {/* Filter Station */}
          <section className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between rounded-2xl bg-surface-container-low p-4 border border-outline-variant/20">
            <div className="relative w-full xl:max-w-xl group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 size-5 text-on-surface-variant/30 group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search history..."
                className="w-full min-h-12 pl-12 pr-4 py-3 bg-surface rounded-xl text-sm focus:ring-2 focus:ring-primary/30 outline-none transition-all placeholder:text-on-surface-variant/60 border border-outline-variant/30"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter results by status">
              {['ALL', 'STARTED', 'COMPLETED'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  type="button"
                  aria-pressed={statusFilter === filter}
                  className={`min-h-11 px-5 rounded-full text-sm font-semibold transition-all ${
                    statusFilter === filter
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-surface text-on-surface-variant border border-outline-variant/30 hover:text-primary'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </section>

          {/* Desktop History Cards */}
          <section className="space-y-20">
            {Object.entries(filteredGroups).length === 0 ? (
              <div className="bg-surface-container-low/40 p-20 rounded-4xl md:rounded-[3rem] text-center border-2 border-dashed border-outline-variant/10 animate-reveal">
                <div className="size-24 bg-surface-container-high rounded-full flex items-center justify-center mx-auto mb-8">
                  <Search className="size-12 text-on-surface-variant/10" />
                </div>
                <h3 className="text-2xl font-black text-on-surface tracking-tight">Log Empty.</h3>
                <p className="text-sm text-on-surface-variant/60 mt-4 max-w-xs mx-auto font-medium leading-relaxed">Adjust your search parameters.</p>
                <button onClick={() => navigate('/user/dashboard')} className="mt-10 px-12 py-5 bg-linear-to-r from-primary to-primary-container text-white rounded-full font-technical font-black text-xs uppercase tracking-widest shadow-ambient-lg hover:scale-105 active:scale-95 transition-all">Start New Practice</button>
              </div>
            ) : (
              Object.entries(filteredGroups).map(([exam, subjects]) => (
                <div key={exam} className="space-y-10">
                  <div className="flex items-center gap-8 px-4 opacity-40 group/exam hover:opacity-100 transition-opacity">
                    <p className="text-xs font-technical font-black uppercase tracking-[0.5em] text-on-surface-variant">{exam}</p>
                    <div className="h-px flex-1 bg-outline-variant/20" />
                  </div>

                  <div className="grid gap-10">
                    {Object.entries(subjects).map(([subject, atts]) => (
                      <div key={subject} className="bg-surface-container-low rounded-[3rem] overflow-hidden border border-outline-variant/5">
                        <div className="bg-surface-container-high/40 px-12 py-10 flex justify-between items-center gap-8">
                          <div className="flex items-center gap-8">
                            <div className="size-20 rounded-4xl bg-surface-container-high flex items-center justify-center text-primary shadow-ambient-sm">
                              <BookOpen size={40} />
                            </div>
                            <div className="space-y-1">
                              <h3 className="text-3xl font-black text-on-surface tracking-tighter leading-none">{subject}</h3>
                              <p className="text-[10px] font-technical font-black text-primary uppercase tracking-[0.3em]">Resource Cluster</p>
                            </div>
                          </div>
                          <div className="px-8 py-3 bg-primary/5 text-primary rounded-full font-technical font-black text-[10px] uppercase tracking-widest border border-primary/10">
                            {atts.length} {atts.length === 1 ? 'Record' : 'Records'} Detected
                          </div>
                        </div>

                        <div className="p-4 space-y-3">
                          {atts.map((attempt) => (
                            <div key={attempt.id} onClick={() => navigate(`/user/results/${attempt.id}`)} className="bg-surface-container-high/10 rounded-4xl px-10 py-8 flex items-center justify-between hover:bg-surface-container-high transition-all duration-500 group/item cursor-pointer">
                              <div className="flex items-center gap-8 min-w-0">
                                <div className={`size-14 rounded-3xl flex items-center justify-center shrink-0 ${attempt.status === 'COMPLETED' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary border border-secondary/20'}`}>
                                  {attempt.status === 'COMPLETED' ? <CheckCircle2 size={28} /> : <PlayCircle size={28} />}
                                </div>
                                <div className="space-y-2 min-w-0">
                                  <span className="text-xl font-black text-on-surface group-hover/item:text-primary transition-colors tracking-tight block truncate uppercase">{attempt.chapter_name}</span>
                                  <div className="flex items-center gap-6">
                                    <span className="flex items-center gap-2 text-[10px] font-technical font-black text-on-surface-variant/40 uppercase tracking-widest"><Calendar size={12} className="text-primary/40" />{new Date(attempt.submitted_at || attempt.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    <span className={`px-4 py-1 rounded-full text-[9px] font-technical font-black uppercase tracking-widest ${attempt.status === 'COMPLETED' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>{attempt.status}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="size-12 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant/20 group-hover/item:text-primary group-hover/item:bg-primary/10 group-hover/item:scale-110 transition-all duration-500 shrink-0"><ChevronRight size={20} /></div>
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
        </div>
      </main>
    </div>
  );
}
