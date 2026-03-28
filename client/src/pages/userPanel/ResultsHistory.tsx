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
             <span className="text-[10px] font-technical font-black text-primary uppercase tracking-[0.4em] mb-2 animate-pulse">Syncing Journal</span>
             <p className="text-xl font-black text-on-surface tracking-tighter">Archive Manifest Manifesting.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface font-narrative text-on-surface antialiased transition-colors duration-700 pb-20 animate-reveal">
      <main className="max-w-7xl mx-auto px-6 lg:px-12 py-10 space-y-12">

        {/* Stats Registry */}
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { label: 'Synchronized Entries', value: stats.total, icon: <History className="size-5" />, color: 'text-primary' },
            { label: 'Syllabus Coverage', value: stats.unique, icon: <Target className="size-5" />, color: 'text-secondary' },
            { label: 'Archival Completeness', value: stats.completed, icon: <CheckCircle2 className="size-5" />, color: 'text-tertiary' },
            { label: 'Efficiency Index', value: `${stats.rate}%`, icon: <TrendingUp className="size-5" />, color: 'text-primary' },
          ].map((s, idx) => (
            <div key={idx} className="bg-surface-container-low p-10 rounded-4xl shadow-ambient-sm group transition-all duration-500 hover:shadow-ambient hover:-translate-y-1 cursor-default">
              <div className="flex justify-between items-start mb-8">
                <div className={`p-4 rounded-3xl bg-surface-container-high ${s.color} group-hover:scale-110 transition-transform duration-500 shadow-sm`}>
                  {s.icon}
                </div>
                <div className="size-2 rounded-full bg-on-surface-variant/20 group-hover:bg-primary transition-colors" />
              </div>
              <p className="text-5xl font-technical font-black text-on-surface tracking-tighter">{s.value}</p>
              <p className="text-[10px] font-technical font-black text-on-surface-variant/40 uppercase tracking-[0.2em] mt-3">{s.label}</p>
            </div>
          ))}
        </section>

        {/* Filter Station */}
        <section className="flex flex-col lg:flex-row gap-8 items-center justify-between">
          <div className="relative w-full lg:w-2/3 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 size-5 text-on-surface-variant/30 transition-colors group-focus-within:text-primary" />
            <input
              type="text"
              placeholder="Query archive by Exam, Subject or Chapter..."
              className="w-full pl-16 pr-8 py-5 bg-surface-container-low rounded-4xl text-sm font-medium focus:ring-4 ring-primary/5 outline-none transition-all placeholder:text-on-surface-variant/20 border border-outline-variant/10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 p-2 bg-surface-container-low rounded-4xl w-full lg:w-auto border border-outline-variant/10">
            {['ALL', 'STARTED', 'COMPLETED'].map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`flex-1 lg:flex-none px-10 py-3 rounded-full text-[10px] font-technical font-black uppercase tracking-widest transition-all ${
                  statusFilter === filter
                    ? 'bg-white text-primary shadow-ambient-sm scale-105 font-black'
                    : 'text-on-surface-variant/40 hover:text-on-surface'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </section>

        {/* History Cards */}
        <section className="space-y-20">
          {Object.entries(filteredGroups).length === 0 ? (
            <div className="bg-surface-container-low/40 p-20 rounded-[3rem] text-center border-2 border-dashed border-outline-variant/10 animate-reveal">
              <div className="size-24 bg-surface-container-high rounded-full flex items-center justify-center mx-auto mb-8">
                <Search className="size-12 text-on-surface-variant/10" />
              </div>
              <h3 className="text-2xl font-black text-on-surface tracking-tight">Archive Empty.</h3>
              <p className="text-sm text-on-surface-variant/60 mt-4 max-w-xs mx-auto font-medium leading-relaxed">Adjust your search parameters or synthesize a new session to populate the record.</p>
              <button
                onClick={() => navigate('/user/dashboard')}
                className="mt-10 px-12 py-5 bg-linear-to-r from-primary to-primary-container text-white rounded-full font-technical font-black text-[10px] uppercase tracking-widest shadow-ambient-lg hover:scale-105 active:scale-95 transition-all"
              >
                Launch New Session
              </button>
            </div>
          ) : (
            Object.entries(filteredGroups).map(([exam, subjects]) => (
              <div key={exam} className="space-y-10">
                <div className="flex items-center gap-8 px-4 opacity-40 group/exam hover:opacity-100 transition-opacity">
                  <p className="text-[12px] font-technical font-black uppercase tracking-[0.5em] text-on-surface-variant">{exam}</p>
                  <div className="h-px flex-1 bg-outline-variant/20" />
                </div>

                <div className="grid gap-16 lg:grid-cols-1">
                  {Object.entries(subjects).map(([subject, atts]) => (
                    <div key={subject} className="bg-surface-container-low rounded-[3rem] overflow-hidden transition-all duration-700 hover:shadow-ambient border border-outline-variant/5">
                      <div className="bg-surface-container-high/40 px-12 py-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                        <div className="flex items-center gap-8">
                          <div className="size-20 rounded-4xl bg-surface-container-high flex items-center justify-center text-primary shadow-ambient-sm group-hover:scale-110 transition-transform duration-700">
                            <BookOpen size={36} />
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
                          <div
                            key={attempt.id}
                            onClick={() => navigate(`/user/results/${attempt.id}`)}
                            className="bg-surface-container-high/10 rounded-4xl px-10 py-8 flex items-center justify-between hover:bg-surface-container-high transition-all duration-500 group/item cursor-pointer"
                          >
                            <div className="flex items-center gap-8">
                              <div className={`size-14 rounded-3xl flex items-center justify-center transition-all duration-700 ${
                                attempt.status === 'COMPLETED' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary border border-secondary/20'
                              }`}>
                                {attempt.status === 'COMPLETED' ? <CheckCircle2 size={28} /> : <PlayCircle size={28} />}
                              </div>
                              <div className="space-y-2">
                                <span className="text-xl font-black text-on-surface group-hover/item:text-primary transition-colors tracking-tight">
                                  {attempt.chapter_name}
                                </span>
                                <div className="flex items-center gap-6">
                                  <span className="flex items-center gap-2 text-[10px] font-technical font-black text-on-surface-variant/40 uppercase tracking-widest">
                                    <Calendar size={14} className="text-primary/40" />
                                    {new Date(attempt.submitted_at || attempt.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                  <span className={`px-4 py-1.5 rounded-full text-[9px] font-technical font-black uppercase tracking-widest ${
                                    attempt.status === 'COMPLETED' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
                                  }`}>
                                    {attempt.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="size-12 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant/20 group-hover/item:text-primary group-hover/item:bg-primary/10 group-hover/item:scale-110 transition-all duration-500">
                              <ChevronRight size={20} />
                            </div>
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
}
