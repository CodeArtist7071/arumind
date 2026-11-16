import React, { useState, useMemo } from "react";
import { useTableData } from "../../hooks/useTableData";
import { AdminTable } from "../../components/admin/AdminTable";
import { AdminFormModal } from "../../components/admin/AdminFormModal";
import { Check, CircleHelp, Plus } from "lucide-react";
import { supabase } from "../../utils/supabase";
import { getHtmlMarkup, HtmlContent } from "../../components/ui/HtmlContent";

/**
 * Question Repository Management Page.
 * Handles CRUD manifestations for the 'questions' table.
 */
const QuestionsManagement: React.FC = () => {
  // High-Performance Lattice Manifestation Hooks
  const { data: subjectsData } = useTableData("subjects", { pageSize: 1000 });
  const { data: chaptersData } = useTableData("chapters", { pageSize: 3000 });

  // Orchestrate active-only manifestation for selection dropdowns
  const subjects = useMemo(() => subjectsData.filter(s => s.is_active !== false), [subjectsData]);
  const chapters = useMemo(() => chaptersData.filter(c => c.is_active !== false), [chaptersData]);

  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedChapter, setSelectedChapter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const { data: questions, loading, page, setPage, updateItem, deleteItem, refresh: refreshQuestions } = useTableData("questions", {
    filterColumn: selectedChapter !== "all" ? "chapter_id" : (selectedSubject !== "all" ? "subject_id" : undefined),
    filterValue: selectedChapter !== "all" ? selectedChapter : (selectedSubject !== "all" ? selectedSubject : undefined),
    pageSize: 3000
  });
  const [data, setData] = useState<any[]>([]);
  const refresh = refreshQuestions;
  React.useEffect(() => {
    let cancelled = false;
    const loadOptions = async () => {
      if (!questions.length) { setData([]); return; }
      const { data: optionRows, error } = await supabase.from("question_options").select("*").in("question_id", questions.map(q => q.id)).order("display_order");
      if (error) { console.error("Failed to load question options", error); return; }
      if (!cancelled) setData(questions.map(q => {
        const options = (optionRows || []).filter(o => o.question_id === q.id).map(o => ({ id: o.id, l: o.option_key, v: getHtmlMarkup(o.option_text), is_correct: o.is_correct }));
        return { ...q, question: getHtmlMarkup(q.question), options, correct_answer: options.find(o => o.is_correct)?.l };
      }));
    };
    loadOptions();
    return () => { cancelled = true; };
  }, [questions]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const filteredChapters = selectedSubject === "all" ? chapters : chapters.filter(c => c.subject_id === selectedSubject);
  const visibleQuestions = useMemo(() => statusFilter === "all"
    ? data
    : data.filter(question => question.is_active === (statusFilter === "active")), [data, statusFilter]);
  const pageSize = 10;
  const pagedQuestions = useMemo(
    () => visibleQuestions.slice(page * pageSize, (page + 1) * pageSize),
    [visibleQuestions, page]
  );
  React.useEffect(() => {
    setPage(0);
  }, [selectedSubject, selectedChapter, statusFilter, setPage]);

  const columns: any[] = useMemo(() => [
    {
      header: "Question",
      key: "question",
      minWidth: 340,
      flex: 2.2,
      wrapText: true,
      render: (val: unknown) => (
        <div className="py-2 pr-3">
          <p title={getHtmlMarkup(val)} className="line-clamp-2 whitespace-normal text-sm font-medium leading-5 text-[#263b22] dark:text-[#e8eee4]">
            <HtmlContent html={val} />
          </p>
        </div>
      )
    },
    {
      header: "Chapter",
      key: "chapter_id",
      minWidth: 160,
      flex: 0.8,
      render: (val: string) => (
        <span className="inline-flex max-w-full rounded-full bg-[#f0f4ec] px-2.5 py-1 text-xs font-medium text-[#53634d] dark:bg-white/[0.08] dark:text-[#c4d0be]">
          {chapters.find(c => c.id === val)?.name || "Unknown Chapter"}
        </span>
      )
    },
    {
      header: "Answer choices",
      key: "options",
      minWidth: 300,
      flex: 1.5,
      autoHeight: true,
      wrapText: true,
      render: (options: any[], row: any) => (
        <div className="grid grid-cols-2 gap-1.5 py-2 text-xs leading-4">
          {(Array.isArray(options) ? options : []).map((option: any) => {
            const label = option.l;
            const isCorrect = option.is_correct;
            return (
              <div
                key={label}
                title={`Option ${label}: ${option?.v || "No answer text"}${isCorrect ? " (correct answer)" : ""}`}
                className={`flex min-w-0 items-start gap-1.5 rounded-md px-2 py-1 ${isCorrect
                  ? "bg-[#edf5e9] text-[#315f29] dark:bg-[#203620] dark:text-[#c9e4c0]"
                  : "text-[#596851] dark:text-[#c3cebd]"
                }`}
              >
                <span className={`shrink-0 font-semibold ${isCorrect ? "text-[#315f29] dark:text-[#c9e4c0]" : "text-[#82907b] dark:text-[#9eaa98]"}`}>
                  {label}.
                </span>
                <span className="min-w-0 whitespace-normal break-words"><HtmlContent html={option?.v || "—"} /></span>
                {isCorrect && <Check size={14} strokeWidth={2.5} className="ml-auto mt-0.5 shrink-0" aria-label="Correct answer" />}
              </div>
            );
          })}
        </div>
      )
    },
    {
      header: "Status",
      key: "is_active",
      comparator: (statusA: boolean, statusB: boolean) => Number(statusA) - Number(statusB),
      render: (val: boolean, row: any) => (
        <select
          aria-label={`Question ${row.id} status`}
          value={val ? "active" : "inactive"}
          onChange={async (e) => {
            const newValue = e.target.value === "active";
            const previousValue = val;
            setData(current => current.map(question => question.id === row.id ? { ...question, is_active: newValue } : question));
            try {
              const { data: updatedRows, error } = await supabase.from("questions").update({ is_active: newValue }).eq("id", row.id).select("id");
              if (error) throw error;
              if (!updatedRows?.length) {
                alert("Status is shown in the UI, but Supabase did not save it. Check the UPDATE policy for public.questions; this local change will reset after refresh.");
                return;
              }
              await refreshQuestions();
            } catch (err: any) {
              setData(current => current.map(question => question.id === row.id ? { ...question, is_active: previousValue } : question));
              alert("Could not update question status: " + (err.message || "Please try again."));
            }
          }}
          className={`min-h-9 rounded-lg border px-2.5 text-xs font-medium transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#7ba36e]/40
                ${val
              ? "bg-[#edf5e9] text-[#315f29] border-[#d8e7d1] hover:bg-[#e4f0de] dark:bg-[#203620] dark:text-[#c9e4c0] dark:border-[#355333]"
              : "bg-[#fff1ef] text-[#a83b32] border-[#f3d4d0] hover:bg-[#ffe8e5] dark:bg-[#3b2422] dark:text-[#f0b6ae] dark:border-[#603531]"
            }`}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      )
    },
    {
      header: "Difficulty",
      key: "difficulty_level",
      minWidth: 120,
      render: (val: string) => (
        <span className="text-sm font-medium capitalize text-[#596851] dark:text-[#c3cebd]">
          {(val || "—").toLowerCase()}
        </span>
      )
    },
  ], [chapters, updateItem]);

  const fields: any[] = [
    { name: "question", label: "Question", type: "textarea", required: true, previewAsHtml: true },
    { name: "question_type", label: "Question type", type: "select", options: ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"].map(value => ({ label: value.replaceAll("_", " "), value })), required: true },
    { name: "options", label: "Answer options", type: "options", defaultValue: [{ text: "", is_correct: false }, { text: "", is_correct: false }] }, {
      name: "difficulty_level",
      label: "Question Difficulty Level",
      type: "select",
      options: [
        { label: "Easy", value: "EASY" },
        { label: "Moderate", value: "MODERATE" },
        { label: "Hard", value: "HARD" }
      ],
      required: true
    },
    // { name: "explanation", label: "Editorial Explanation", type: "textarea" },
    {
      name: "subject_id",
      label: "Subject",
      type: "select",
      options: subjects.map(s => ({ label: s.name, value: s.id })),
      defaultValue: selectedSubject !== "all" ? selectedSubject : undefined,
      disabled: selectedSubject !== "all",
      required: true
    },
    {
      name: "chapter_id",
      label: "Chapter",
      type: "select",
      options: filteredChapters.map(c => ({ label: c.name, value: c.id })),
      defaultValue: selectedChapter !== "all" ? selectedChapter : undefined,
      disabled: selectedChapter !== "all",
      required: true
    },
    { name: "is_active", label: "Active", type: "checkbox" }
  ];

  const handleApply = async (formData: any) => {
    try {
      const optionRows = (formData.options || []).flatMap((option: any, index: number) => {
        const value = option.text?.trim();
        return value ? [{ option_key: String.fromCharCode(65 + index), option_text: value, display_order: index + 1, is_correct: Boolean(option.is_correct) }] : [];
      });
      if (optionRows.length < 2 || !optionRows.some((option: any) => option.is_correct)) throw new Error("Add at least two options and mark one correct answer.");
      // Orchestrate authoritative technical bundling
      const bundledData = {
        question: formData.question,
        question_type: formData.question_type || "SINGLE_CHOICE",
        difficulty_level: formData.difficulty_level,
        subject_id: formData.subject_id,
        chapter_id: formData.chapter_id,
        is_active: formData.is_active ?? true, 
        marks: formData.marks ?? 1,
        negative_marks: formData.negative_marks ?? 0,
        explanation: formData.explanation || null,
        diagram_present: formData.diagram_present ?? false,
        diagram_url: formData.diagram_url || null,
      };

      let questionId = editingItem?.id;
      if (editingItem) {
        await updateItem(editingItem.id, bundledData);
      } else {
        const { data: inserted, error } = await supabase.from("questions").insert(bundledData).select("id").single();
        if (error) throw error;
        questionId = inserted.id;
      }

      const rowsWithQuestion = optionRows.map((option: any) => ({ ...option, question_id: questionId }));
      if (editingItem) {
        const { error } = await supabase.from("question_options").delete().eq("question_id", questionId);
        if (error) throw error;
      }
      const { error: optionsError } = await supabase.from("question_options").insert(rowsWithQuestion);
      if (optionsError) throw optionsError;

      setIsModalOpen(false);
      setEditingItem(null);
      refresh(); // Force complete lattice synchronization
    } catch (err: any) {
      alert("Synchronization Failure: " + (err.message || "Unknown error manifested"));
      console.error("[Lattice Sync Error]", err);
    }
  };

  const manifestEditingItem = (item: any) => {
    if (!item) return null;
    const opts = Array.isArray(item.options) ? item.options : [];
    return {
      ...item,
      question_type: item.question_type || "SINGLE_CHOICE",
      options: opts.map((option: any) => ({ text: option.v, is_correct: option.is_correct }))
    };
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
      <header className="flex flex-col gap-6">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e8f0e3] text-[#315f29] dark:bg-[#263d24] dark:text-[#c9e4c0]">
            <CircleHelp size={23} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#66805d] dark:text-[#a9c99e]">Content library</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#1b2419] dark:text-[#e8eee4] sm:text-3xl">
              Question bank
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#778171] dark:text-[#a6b09f]">
              Review and manage assessment questions. Filter by subject and chapter to find content quickly.
            </p>
          </div>
        </div>

        <section aria-label="Question filters" className="rounded-2xl border border-[#e5e9e0] bg-[#fbfcf8] p-4 dark:border-white/10 dark:bg-[#171e17] sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
              <label className="block min-w-0">
                <span className="mb-1.5 block text-xs font-medium text-[#596851] dark:text-[#c3cebd]">Subject</span>
                <select
                  aria-label="Filter questions by subject"
                  value={selectedSubject}
                  onChange={(e) => { setSelectedSubject(e.target.value); setSelectedChapter("all"); }}
                  className="min-h-11 w-full rounded-xl border border-[#e2e8dc] bg-white px-3.5 text-sm text-[#34402f] outline-none transition focus:border-[#7ba36e] focus:ring-4 focus:ring-[#7ba36e]/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-[#111711] dark:text-[#d6dfd1]"
                >
                  <option value="all">All subjects</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>

              <label className="block min-w-0">
                <span className="mb-1.5 block text-xs font-medium text-[#596851] dark:text-[#c3cebd]">Status</span>
                <select
                  aria-label="Filter questions by status"
                  value={statusFilter}
                  onChange={event => setStatusFilter(event.target.value as typeof statusFilter)}
                  className="min-h-11 w-full rounded-xl border border-[#e2e8dc] bg-white px-3.5 text-sm text-[#34402f] outline-none transition focus:border-[#7ba36e] focus:ring-4 focus:ring-[#7ba36e]/10 dark:border-white/10 dark:bg-[#111711] dark:text-[#d6dfd1]"
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>

              <label className="block min-w-0">
                <span className="mb-1.5 block text-xs font-medium text-[#596851] dark:text-[#c3cebd]">Chapter</span>
                <select
                  aria-label="Filter questions by chapter"
                  value={selectedChapter}
                  disabled={selectedSubject === "all"}
                  onChange={(e) => setSelectedChapter(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-[#e2e8dc] bg-white px-3.5 text-sm text-[#34402f] outline-none transition focus:border-[#7ba36e] focus:ring-4 focus:ring-[#7ba36e]/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-[#111711] dark:text-[#d6dfd1]"
                >
                  <option value="all">All chapters</option>
                  {filteredChapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            </div>

            <button
              onClick={() => {
                setEditingItem(null);
                setIsModalOpen(true);
              }}
              className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#24551e] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#173f19] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4c8b3e] sm:min-w-40"
            >
              <Plus size={18} aria-hidden="true" />
              <span>Add question</span>
            </button>
          </div>
        </section>
      </header>
      <AdminTable
          columns={columns}
          data={pagedQuestions}
          searchPlaceholder="Search questions..."
          totalCount={visibleQuestions.length}
          page={page}
          onPageChange={setPage}
          onRefresh={refresh}
          onEdit={(item) => {
            setEditingItem(item);
            setIsModalOpen(true);
          }}
          onDelete={(id) => {
            if (window.confirm("Are you sure you want to delete this question?"))
              deleteItem(id);
          }}
          loading={loading}
        />

      <AdminFormModal
        isOpen={isModalOpen}
        title={editingItem ? "Edit Question" : "Add Question"}
        fields={fields}
        initialData={manifestEditingItem(editingItem)}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleApply}
      />
    </div>
  );
};

export default QuestionsManagement;
