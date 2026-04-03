import React, { useState } from "react";
import { useCurriculumLattice } from "../../hooks/useCurriculumLattice";
import { QuestionDrawer } from "../../components/admin/QuestionDrawer";
import {
  ChevronRight,
  ChevronDown,
  BookOpen,
  Layers,
  BarChart,
  HelpCircle,
  ArrowRight,
  Loader2,
  Database,
  Search,
} from "lucide-react";
import { supabase } from "../../utils/supabase";

/**
 * Curriculum Lattice Manifestation.
 * A smart, hierarchical visualization of the OPrep curriculum: Exams -> Subjects -> Chapters.
 */
const CurriculumLattice: React.FC = () => {
  const { exams, loading, error, refresh } = useCurriculumLattice();
  const [expandedExams, setExpandedExams] = useState<Set<string>>(new Set());
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [chapters, setChapters] = useState<any[]>([]);
  const [loadingChapters, setLoadingChapters] = useState<string | null>(null);

  const [drawerState, setDrawerState] = useState<{
    isOpen: boolean;
    chapterId: string | null;
    chapterName: string;
  }>({
    isOpen: false,
    chapterId: null,
    chapterName: "",
  });

  const toggleExam = (id: string) => {
    setExpandedExams((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSubject = async (sid: string) => {
    const isExpanding = !expandedSubjects.has(sid);
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });

    if (isExpanding) {
      setLoadingChapters(sid);
      try {
        const { data: res, error: fetchErr } = await supabase
          .from("chapters")
          .select("*")
          .eq("subject_id", sid)
          .order("display_order", { ascending: true });

        if (fetchErr) throw fetchErr;
        setChapters((prev) => [...prev.filter((c) => c.subject_id !== sid), ...(res || [])]);
      } catch (err) {
        console.error("Failed to fetch chapters manifestation:", err);
      } finally {
        setLoadingChapters(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-on-surface-variant animate-in fade-in duration-500">
        <Loader2 className="animate-spin mb-4 text-[#16a34a]" size={48} />
        <span className="text-sm font-black uppercase tracking-[0.3em] text-[#16a34a]/60">
          Synthesizing Knowledge Lattice...
        </span>
      </div>
    );
  }

  return (
    <div className="p-10 space-y-12 animate-in fade-in duration-500">
      {/* Editorial Header */}
      <header className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-slate-100 dark:border-slate-800 pb-10">
        <div className="max-w-xl">
          <h2 className="text-5xl font-bold tracking-tighter text-slate-800 dark:text-slate-100 italic leading-none">
            Curriculum <span className="text-[#16a34a]">Lattice</span>
          </h2>
          <p className="text-sm text-slate-500 mt-4 leading-relaxed font-medium">
            Analyze and orchestrate the hierarchical manifestation of knowledge sectors, 
            ranging from primary board examinations to specific assessment entities.
          </p>
        </div>
        <div className="flex gap-4">
            <button 
                onClick={refresh}
                className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
            >
                <Database size={14} /> Re-sync
            </button>
        </div>
      </header>

      {/* Lattice Visualization */}
      <div className="space-y-6">
        {exams.map((exam) => (
          <div
            key={exam.id}
            className={`bg-surface-container-high dark:bg-slate-900/80 rounded-3xl border transition-all duration-500 overflow-hidden ${
              expandedExams.has(exam.id)
                ? "border-[#16a34a]/40 shadow-2xl shadow-[#16a34a]/5"
                : "border-slate-100 dark:border-slate-800 hover:border-slate-200"
            }`}
          >
            {/* Exam Level Card */}
            <div
              onClick={() => toggleExam(exam.id)}
              className="p-8 cursor-pointer flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 group"
            >
              <div className="flex items-center gap-6">
                <div className={`p-4 rounded-2xl transition-all duration-500 ${
                    expandedExams.has(exam.id) ? 'bg-[#16a34a] text-white' : 'bg-[#16a34a]/10 text-[#16a34a]'
                }`}>
                  <BarChart size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">{exam.name}</h3>
                  <div className="flex gap-4 mt-1">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                      {exam.subjects.length} Subjects
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#16a34a]">
                      {exam.totalChapters} Chapters Manifested
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 w-full lg:w-auto">
                <div className="flex -space-x-3 overflow-hidden opacity-40 group-hover:opacity-100 transition-opacity">
                   {exam.subjects.slice(0, 3).map((s: any, i: number) => (
                       <div key={i} className="w-8 h-8 rounded-full bg-primary border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-black uppercase">
                           {s.name.charAt(0)}
                       </div>
                   ))}
                </div>
                <div className={`p-2 rounded-full bg-primary transition-transform duration-500 ${expandedExams.has(exam.id) ? 'rotate-180 bg-[#16a34a]/10 text-[#16a34a]' : ''}`}>
                   <ChevronDown size={20} />
                </div>
              </div>
            </div>

            {/* Subject Level Manifestation */}
            <div className={`grid transition-all duration-500 ease-botanical ${expandedExams.has(exam.id) ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden bg-surface-container-high px-8 pb-8 space-y-4">
                    {exam.subjects.map((subject: any) => (
                        <div key={subject.id} className="bg-surface-container-low rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-sm overflow-hidden">
                            <div 
                                onClick={(e) => { e.stopPropagation(); toggleSubject(subject.id); }}
                                className="p-6 flex items-center justify-between cursor-pointer hover:bg-[#16a34a]/5 transition-colors group/subject"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-primary group-hover/subject:text-[#16a34a] transition-colors">
                                        <BookOpen size={16} />
                                    </div>
                                    <span className="font-bold text-primary ">{subject.name}</span>
                                    <span className="text-[9px] font-black tracking-widest text-primary px-2 py-0.5 bg-slate-100 rounded">
                                        {subject.chapterCount} Chapters
                                    </span>
                                </div>
                                <div className="flex items-center gap-4">
                                    {loadingChapters === subject.id && <Loader2 size={14} className="animate-spin text-[#16a34a]" />}
                                    <ChevronRight size={16} className={`text-slate-300 transition-transform duration-300 ${expandedSubjects.has(subject.id) ? 'rotate-90' : ''}`} />
                                </div>
                            </div>

                            {/* Chapter Level Manifestation */}
                            <div className={`grid transition-all duration-300 ${expandedSubjects.has(subject.id) ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                <div className="overflow-hidden bg-surface-container-low dark:bg-slate-950/40 border-t border-slate-50 dark:border-slate-800">
                                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {chapters.filter(c => c.subject_id === subject.id).map(chapter => (
                                            <div 
                                                key={chapter.id}
                                                onClick={() => setDrawerState({ isOpen: true, chapterId: chapter.id, chapterName: chapter.name })}
                                                className="bg-surface-container-lowest p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-[#16a34a] hover:shadow-lg hover:shadow-[#16a34a]/5 transition-all cursor-pointer group/chapter"
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <Layers size={14} className="text-primary group-hover/chapter:text-[#16a34a]" />
                                                        <span className="text-sm font-bold opacity-80 group-hover/chapter:opacity-100">{chapter.name}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex gap-2">
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Order: {chapter.display_order || 'N/A'}</span>
                                                    </div>
                                                    <div className="text-[#16a34a] opacity-0 group-hover/chapter:opacity-100 transition-opacity">
                                                        <ArrowRight size={14} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        ))}
      </div>

      {/* Question Orchestration Drawer */}
      <QuestionDrawer 
        isOpen={drawerState.isOpen}
        chapterId={drawerState.chapterId}
        chapterName={drawerState.chapterName}
        onClose={() => setDrawerState(prev => ({ ...prev, isOpen: false }))}
      />

      <footer className="pt-20 opacity-30 text-[10px] font-black uppercase tracking-[0.4em] text-center italic">
        Curriculum Lattice Matrix — Orchestrated by Antigravity v1.0
      </footer>
    </div>
  );
};

export default CurriculumLattice;
