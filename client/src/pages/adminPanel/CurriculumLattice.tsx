import React, { useMemo, useState } from "react";
import { useCurriculumLattice } from "../../hooks/useCurriculumLattice";
import { QuestionDrawer } from "../../components/admin/QuestionDrawer";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Layers3,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { supabase } from "../../utils/supabase";

const CurriculumLattice: React.FC = () => {
  const { exams, questionCountsByChapter, loading, error, refresh } = useCurriculumLattice();
  const [expandedExams, setExpandedExams] = useState<Set<string>>(new Set());
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [chapters, setChapters] = useState<any[]>([]);
  const [loadingChapters, setLoadingChapters] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [drawerState, setDrawerState] = useState({ isOpen: false, chapterId: null as string | null, chapterName: "" });

  const filteredExams = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return exams;
    return exams.map((exam: any) => ({
      ...exam,
      subjects: exam.subjects.filter((subject: any) => {
        const subjectMatch = subject.name.toLowerCase().includes(term);
        const chapterMatch = chapters.some(chapter => chapter.subject_id === subject.id && chapter.name.toLowerCase().includes(term));
        return exam.name.toLowerCase().includes(term) || subjectMatch || chapterMatch;
      }),
    })).filter((exam: any) => exam.name.toLowerCase().includes(term) || exam.subjects.length > 0);
  }, [exams, chapters, search]);

  const toggleExam = (id: string) => setExpandedExams(current => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleSubject = async (subjectId: string) => {
    const expanding = !expandedSubjects.has(subjectId);
    setExpandedSubjects(current => {
      const next = new Set(current);
      if (next.has(subjectId)) next.delete(subjectId); else next.add(subjectId);
      return next;
    });
    if (!expanding || chapters.some(chapter => chapter.subject_id === subjectId)) return;
    setLoadingChapters(subjectId);
    try {
      const { data, error: fetchError } = await supabase.from("chapters").select("*").eq("subject_id", subjectId).order("display_order", { ascending: true }).order("name");
      if (fetchError) throw fetchError;
      setChapters(current => [...current.filter(chapter => chapter.subject_id !== subjectId), ...(data || [])]);
    } catch (fetchError) {
      console.error("Failed to load curriculum chapters", fetchError);
    } finally {
      setLoadingChapters(null);
    }
  };

  const totalSubjects = exams.reduce((sum: number, exam: any) => sum + exam.subjects.length, 0);
  const totalChapters = exams.reduce((sum: number, exam: any) => sum + exam.totalChapters, 0);
  const totalQuestions = exams.reduce((sum: number, exam: any) => sum + exam.totalQuestions, 0);

  if (loading) return <div className="flex min-h-[55vh] flex-col items-center justify-center gap-3 text-[#71806c]"><Loader2 className="animate-spin text-[#4c8b3e]" size={30} /><span className="text-sm">Loading curriculum…</span></div>;

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#66805d] dark:text-[#a9c99e]">Admin · Content structure</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#1b2419] dark:text-[#e8eee4] sm:text-3xl">Curriculum designer</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#778171] dark:text-[#a6b09f]">Browse exams, subjects, and chapters. Open a chapter to review and manage its questions.</p>
        </div>
        <button type="button" onClick={refresh} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-[#dfe6d9] bg-[#fbfcf8] px-3.5 text-sm font-medium text-[#52604d] transition hover:bg-[#edf3e9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4c8b3e] dark:border-white/10 dark:bg-[#171e17] dark:text-[#c3cdbd] dark:hover:bg-white/[0.06] sm:self-auto"><RefreshCw size={15} />Refresh</button>
      </header>

      <section aria-label="Curriculum totals" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Exams", value: exams.length, icon: BookOpen },
          { label: "Subjects", value: totalSubjects, icon: Layers3 },
          { label: "Chapters", value: totalChapters, icon: CircleHelp },
        ].map(({ label, value, icon: Icon }) => <article key={label} className="flex items-center gap-3 rounded-2xl border border-[#e5e9e0] bg-[#fbfcf8] p-4 dark:border-white/10 dark:bg-[#171e17]"><span className="grid size-10 place-items-center rounded-xl bg-[#e8f0e3] text-[#315f29] dark:bg-[#263d24] dark:text-[#c9e4c0]"><Icon size={18} /></span><div><p className="text-xs text-[#778171] dark:text-[#a6b09f]">{label}</p><p className="text-xl font-semibold tabular-nums text-[#263b22] dark:text-[#e8eee4]">{value}</p></div></article>)}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e5e9e0] bg-[#fbfcf8] dark:border-white/10 dark:bg-[#171e17]">
        <div className="flex flex-col gap-3 border-b border-[#e8ece4] p-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div><h2 className="text-sm font-semibold text-[#263b22] dark:text-[#e8eee4]">Curriculum structure</h2><p className="mt-0.5 text-xs text-[#778171] dark:text-[#a6b09f]">{totalQuestions.toLocaleString()} questions across the listed exams</p></div>
          <label className="group relative block w-full sm:max-w-xs"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#879181] group-focus-within:text-[#315f29]" /><input value={search} onChange={event => setSearch(event.target.value)} aria-label="Search curriculum" placeholder="Search exams, subjects, chapters…" className="min-h-10 w-full rounded-xl border border-[#e2e8dc] bg-white pl-10 pr-3 text-sm text-[#263b22] outline-none placeholder:text-[#9aa493] focus:border-[#7ba36e] focus:ring-4 focus:ring-[#7ba36e]/10 dark:border-white/10 dark:bg-[#111711] dark:text-[#e8eee4]" /></label>
        </div>

        {error && <div role="alert" className="m-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-200">Unable to load curriculum: {error}</div>}
        <div className="divide-y divide-[#e8ece4] dark:divide-white/10">
          {filteredExams.map((exam: any) => {
            const expanded = expandedExams.has(exam.id) || Boolean(search.trim());
            return <article key={exam.id}>
              <button type="button" aria-expanded={expanded} onClick={() => toggleExam(exam.id)} className="flex min-h-[76px] w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-[#f5f8f2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#4c8b3e] dark:hover:bg-white/[0.03] sm:px-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e8f0e3] text-[#315f29] dark:bg-[#263d24] dark:text-[#c9e4c0]"><BookOpen size={18} /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#263b22] dark:text-[#e8eee4]">{exam.name}</span><span className="mt-1 block text-xs text-[#778171] dark:text-[#a6b09f]">{exam.subjects.length} subjects <span className="px-1">·</span> {exam.totalChapters} chapters <span className="px-1">·</span> {exam.totalQuestions} questions</span></span>
                <span className="hidden rounded-full bg-[#f0f4ec] px-2.5 py-1 text-xs font-medium text-[#53634d] dark:bg-white/[0.07] dark:text-[#c4d0be] sm:inline-flex">Exam</span>{expanded ? <ChevronDown size={18} className="shrink-0 text-[#71806c]" /> : <ChevronRight size={18} className="shrink-0 text-[#71806c]" />}
              </button>
              {expanded && <div className="space-y-2 bg-[#f7f9f5] p-3 dark:bg-[#111711] sm:px-6 sm:py-4">
                {exam.subjects.map((subject: any) => {
                  const subjectExpanded = expandedSubjects.has(subject.id);
                  const subjectChapters = chapters.filter(chapter => chapter.subject_id === subject.id && (!search.trim() || chapter.name.toLowerCase().includes(search.trim().toLowerCase()) || subject.name.toLowerCase().includes(search.trim().toLowerCase())));
                  return <div key={`${exam.id}-${subject.id}`} className="overflow-hidden rounded-xl border border-[#e5e9e0] bg-[#fbfcf8] dark:border-white/10 dark:bg-[#171e17]">
                    <button type="button" aria-expanded={subjectExpanded} onClick={() => toggleSubject(subject.id)} className="flex min-h-12 w-full items-center gap-3 px-3.5 py-3 text-left hover:bg-[#f5f8f2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#4c8b3e] dark:hover:bg-white/[0.03]">
                      {subjectExpanded ? <ChevronDown size={16} className="shrink-0 text-[#71806c]" /> : <ChevronRight size={16} className="shrink-0 text-[#71806c]" />}
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#34402f] dark:text-[#d6dfd1]">{subject.name}</span>
                      <span className="text-xs text-[#778171] dark:text-[#a6b09f]">{subject.chapterCount} chapters</span>
                      {loadingChapters === subject.id && <Loader2 size={15} className="animate-spin text-[#4c8b3e]" />}
                    </button>
                    {subjectExpanded && <div className="border-t border-[#e8ece4] p-3 dark:border-white/10 sm:p-4">
                      {subjectChapters.length ? <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                        {subjectChapters.map(chapter => {
                          const questionCount = questionCountsByChapter[chapter.id] ?? 0;
                          return <button key={chapter.id} type="button" onClick={() => setDrawerState({ isOpen: true, chapterId: chapter.id, chapterName: chapter.name })} className="group flex min-h-12 items-center gap-3 rounded-lg border border-[#edf0e9] bg-white px-3 text-left transition hover:border-[#bfd3b5] hover:bg-[#f8fbf6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4c8b3e] dark:border-white/[0.06] dark:bg-[#111711] dark:hover:border-[#46623d] dark:hover:bg-white/[0.03]"><Layers3 size={15} className="shrink-0 text-[#82907b] group-hover:text-[#315f29] dark:group-hover:text-[#b7d7ad]" /><span className="min-w-0 flex-1 truncate text-sm text-[#34402f] dark:text-[#d6dfd1]">{chapter.name}</span><span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#edf5e9] px-2 py-1 text-xs font-medium tabular-nums text-[#315f29] dark:bg-[#203620] dark:text-[#c9e4c0]" aria-label={`${questionCount} ${questionCount === 1 ? "question" : "questions"}`}>{questionCount.toLocaleString()} {questionCount === 1 ? "question" : "questions"}</span>{chapter.display_order && <span className="shrink-0 text-xs text-[#879181]">#{chapter.display_order}</span>}<ChevronRight size={15} className="shrink-0 text-[#a1aa9b] group-hover:text-[#315f29]" /></button>;
                        })}
                      </div> : <p className="px-2 py-3 text-sm text-[#778171] dark:text-[#a6b09f]">{loadingChapters === subject.id ? "Loading chapters…" : "No chapters found for this subject."}</p>}
                    </div>}
                  </div>;
                })}
              </div>}
            </article>;
          })}
          {!filteredExams.length && <div className="px-5 py-14 text-center"><p className="text-sm font-medium text-[#34402f] dark:text-[#d6dfd1]">No matching curriculum found</p><p className="mt-1 text-sm text-[#778171] dark:text-[#a6b09f]">Try another exam, subject, or chapter name.</p></div>}
        </div>
      </section>

      <QuestionDrawer isOpen={drawerState.isOpen} chapterId={drawerState.chapterId} chapterName={drawerState.chapterName} onClose={() => setDrawerState(current => ({ ...current, isOpen: false }))} />
    </div>
  );
};

export default CurriculumLattice;
