import React, { useState, useMemo } from "react";
import { useTableData } from "../../hooks/useTableData";
import { AdminTable } from "../../components/admin/AdminTable";
import { AdminFormModal } from "../../components/admin/AdminFormModal";
import { Plus } from "lucide-react";

/**
 * Question Repository Management Page.
 * Handles CRUD manifestations for the 'questions' table.
 */
const QuestionsManagement: React.FC = () => {
  // High-Performance Lattice Manifestation Hooks
  const { data: boardsData } = useTableData("exam_boards", { pageSize: 1000 });
  const { data: examsData, loading: examLoading } = useTableData("exams", { pageSize: 1000 });
  const { data: subjectsData, loading: subLoading } = useTableData("subjects", { pageSize: 1000 });
  const { data: chaptersData, loading: chapLoading } = useTableData("chapters", { pageSize: 3000 });
  const { data: examSubjectsData, loading: esLoading } = useTableData("exam_subjects", { pageSize: 5000 });

  // Orchestrate active-only manifestation for selection dropdowns
  const boards = useMemo(() => boardsData.filter(b => b.is_active !== false), [boardsData]);
  const exams = useMemo(() => examsData.filter(e => e.is_active !== false), [examsData]);
  const subjects = useMemo(() => subjectsData.filter(s => s.is_active !== false), [subjectsData]);
  const chapters = useMemo(() => chaptersData.filter(c => c.is_active !== false), [chaptersData]);
  const examSubjects = examSubjectsData;

  const [selectedBoard, setSelectedBoard] = useState<string>("all");
  const [selectedExam, setSelectedExam] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedChapter, setSelectedChapter] = useState<string>("all");

  const { data, loading, totalCount, page, setPage, addItem, updateItem, deleteItem, refresh } = useTableData("questions", {
    filterColumn: selectedChapter !== "all" ? "chapter_id" : (selectedSubject !== "all" ? "subject_id" : (selectedExam !== "all" ? "exam_id" : undefined)),
    filterValue: selectedChapter !== "all" ? selectedChapter : (selectedSubject !== "all" ? selectedSubject : (selectedExam !== "all" ? selectedExam : undefined))
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const filteredExams = selectedBoard === "all" ? exams : exams.filter(e => e.exam_board_id === selectedBoard);
  const filteredSubjects = selectedExam === "all"
    ? subjects
    : subjects.filter(s => examSubjects.some(es => es.exam_id === selectedExam && es.subject_id === s.id));
  const filteredChapters = selectedSubject === "all" ? chapters : chapters.filter(c => c.subject_id === selectedSubject);

  const columns: any[] = [
    {
      header: "Question Identity",
      key: "question",
      autoHeight: true,
      wrapText: true,
      render: (val: string) => (
        <div className="py-4 pr-10">
          <p className="font-medium text-xs text-slate-800 dark:text-slate-100 whitespace-normal leading-relaxed">
            {val}
          </p>
        </div>
      )
    },
    {
      header: "Chapters",
      key: "chapter_id",
      render: (val: string) => (
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-3 py-1 rounded-lg">
          {chaptersData.find(c => c.id === val)?.name || "Unmapped Node"}
        </span>
      )
    },
    {
      header: "Status",
      key: "is_active",
      render: (val: boolean, row: any) => (
        <select
          value={val ? "active" : "inactive"}
          onChange={async (e) => {
            const newValue = e.target.value === "active";
            try {
              await updateItem(row.id, { is_active: newValue });
            } catch (err: any) {
              alert("State Synchronization Failure: " + err.message);
            }
          }}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer outline-none
                ${val
              ? "bg-[#16a34a]/10 text-[#16a34a] border-[#16a34a]/20 hover:bg-[#16a34a]/20"
              : "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
            }`}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      )
    },
    {
      header: "Options Lattice",
      key: "options",
      autoHeight: true,
      wrapText: true,
      render: (val: any) => {
        const opts = Array.isArray(val) ? val : [];
        return (
          <div className="flex gap-2 flex-col justify-center py-2 max-w-[280px]">
            {opts.map((opt: any, i: number) => (
              <span key={i} className="text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 whitespace-nowrap">
                <span className="text-[#16a34a] mr-1">{opt.l}:</span>
                <span className="opacity-80">{opt.v}</span>
              </span>
            ))}
          </div>
        );
      }
    },
    {
      header: "Question Level",
      key: "difficulty_level",
      render: (val: string) => (
        <span className="font-black text-[#16a34a] bg-[#16a34a]/10 px-3 py-1 rounded-lg border border-[#16a34a]/20 text-[10px]">
          {val}
        </span>
      )
    }, {
      header: "Created At",
      key: "created_at",
      render: (val: string) => (
        <span className="font-black text-[#16a34a] bg-[#16a34a]/10 px-3 py-1 rounded-lg border border-[#16a34a]/20 text-[10px]">
          {val}
        </span>
      )
    },
  ];

  const fields: any[] = [
    { name: "question", label: "Question", type: "textarea", required: true },
    { name: "option_A", label: "Option A", type: "text", required: true },
    { name: "option_B", label: "Option B", type: "text", required: true },
    { name: "option_C", label: "Option C", type: "text", required: true },
    { name: "option_D", label: "Option D", type: "text", required: true },
    {
      name: "correct_answer",
      label: "Primary Correct Key",
      type: "select",
      options: [
        { label: "Option A", value: "A" },
        { label: "Option B", value: "B" },
        { label: "Option C", value: "C" },
        { label: "Option D", value: "D" }
      ],
      required: true
    }, {
      name: "difficulty_level",
      label: "Question Difficulty Level",
      type: "select",
      options: [
        { label: "Easy", value: "Easy" },
        { label: "Moderate", value: "Moderate" },
        { label: "Hard", value: "Hard" }
      ],
      required: true
    },
    // { name: "explanation", label: "Editorial Explanation", type: "textarea" },
    {
      name: "exam_id",
      label: "Associated Examination",
      type: "select",
      options: exams.map(e => ({ label: e.name, value: e.id })),
      defaultValue: selectedExam !== "all" ? selectedExam : undefined,
      disabled: selectedExam !== "all",
      required: true
    },
    {
      name: "subject_id",
      label: "Subject Classification",
      type: "select",
      options: subjects.map(s => ({ label: s.name, value: s.id })),
      defaultValue: selectedSubject !== "all" ? selectedSubject : undefined,
      disabled: selectedSubject !== "all",
      required: true
    },
    {
      name: "chapter_id",
      label: "Specific Chapter Node",
      type: "select",
      options: chapters.map(c => ({ label: c.name, value: c.id })),
      defaultValue: selectedChapter !== "all" ? selectedChapter : undefined,
      disabled: selectedChapter !== "all",
      required: true
    },
    { name: "is_active", label: "Verification Status", type: "checkbox" }
  ];

  const handleApply = async (formData: any) => {
    try {
      // Orchestrate authoritative technical bundling
      const bundledData = {
        question: formData.question,
        correct_answer: formData.correct_answer,
        difficulty_level: formData.difficulty_level,
        exam_id: formData.exam_id,
        subject_id: formData.subject_id,
        chapter_id: formData.chapter_id,
        is_active: formData.is_active ?? true, 
        options: [
          { l: 'A', v: formData.option_A },
          { l: 'B', v: formData.option_B },
          { l: 'C', v: formData.option_C },
          { l: 'D', v: formData.option_D }
        ]
      };

      if (editingItem) {
        console.log("[Lattice] Orchestrating UPDATE for Reference Node:", editingItem.id);
        console.log("[Lattice] Transmission Payload:", bundledData);
        // Enforce update ritual with primary key manifestation
        const result = await updateItem(editingItem.id, bundledData);
        console.log("[Lattice] Synchronization Success Manifestation:", result);
      } else {
        console.log("[Lattice] Orchestrating ADD Manifestation");
        await addItem(bundledData);
      }

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
    // Orchestrate technical unbundling: JSON Array -> Exploded Options
    const opts = Array.isArray(item.options) ? item.options : [];
    return {
      ...item,
      option_A: opts.find((o: any) => o.l === 'A')?.v || "",
      option_B: opts.find((o: any) => o.l === 'B')?.v || "",
      option_C: opts.find((o: any) => o.l === 'C')?.v || "",
      option_D: opts.find((o: any) => o.l === 'D')?.v || ""
    };
  };

  return (
    <div className="p-10 space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <header className="space-y-8">
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-slate-800 dark:text-slate-100 italic">
            Question Lattice
          </h2>
          <p className="text-[10px] text-[#16a34a] uppercase font-black tracking-[0.4em] mt-3">
            Managing Assessment Entities via Hierarchy Orchestration
          </p>
        </div>

        {/* Unified Control Sanctuary */}
        <div className="flex flex-wrap items-center gap-4 w-full">
          {/* Hierarchical Orchestration Bar */}
          <div className="flex-1 flex items-center gap-2 p-1.5 bg-slate-100/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {/* 1. Exam Board */}
            <select
              value={selectedBoard}
              onChange={(e) => { setSelectedBoard(e.target.value); setSelectedExam("all"); setSelectedSubject("all"); setSelectedChapter("all"); }}
              className="flex-1 bg-transparent text-[9px] font-black uppercase tracking-widest px-6 py-4 border-r border-slate-200 dark:border-slate-800 outline-none hover:text-[#16a34a] transition-colors cursor-pointer"
            >
              <option value="all">1. Select Board</option>
              {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>

            {/* 2. Exams (Dependent on Board) */}
            <select
              value={selectedExam}
              disabled={selectedBoard === "all"}
              onChange={(e) => { setSelectedExam(e.target.value); setSelectedSubject("all"); setSelectedChapter("all"); }}
              className="flex-1 bg-transparent text-[9px] font-black uppercase tracking-widest px-6 py-4 border-r border-slate-200 dark:border-slate-800 outline-none disabled:opacity-20 disabled:cursor-not-allowed hover:enabled:text-[#16a34a] transition-colors cursor-pointer"
            >
              <option value="all">2. Select Exam</option>
              {filteredExams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>

            {/* 3. Subjects (Dependent on Exam) */}
            <select
              value={selectedSubject}
              disabled={selectedExam === "all"}
              onChange={(e) => { setSelectedSubject(e.target.value); setSelectedChapter("all"); }}
              className="flex-1 bg-transparent text-[9px] font-black uppercase tracking-widest px-6 py-4 border-r border-slate-200 dark:border-slate-800 outline-none disabled:opacity-20 disabled:cursor-not-allowed hover:enabled:text-[#16a34a] transition-colors cursor-pointer"
            >
              <option value="all">3. Select Subject</option>
              {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            {/* 4. Chapters (Dependent on Subject) */}
            <select
              value={selectedChapter}
              disabled={selectedSubject === "all"}
              onChange={(e) => setSelectedChapter(e.target.value)}
              className="flex-1 bg-transparent text-[9px] font-black uppercase tracking-widest px-6 py-4 outline-none disabled:opacity-20 disabled:cursor-not-allowed hover:enabled:text-[#16a34a] transition-colors cursor-pointer"
            >
              <option value="all">4. Select Chapter</option>
              {filteredChapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Manifest Ritual Button */}
          <button
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            className="group shrink-0 flex items-center gap-4 px-10 py-5 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-[#16a34a]/10 hover:-translate-y-1 transition-all duration-300"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-500" />
            <span>Add Question</span>
          </button>
        </div>
      </header>
      {selectedBoard === "all" ? (
        <div className="flex flex-col items-center justify-center p-32 bg-slate-50 dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 animate-reveal">
          <div className="size-16 bg-slate-200 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 mb-6 group-hover:scale-110 transition-transform">
            <Plus size={32} />
          </div>
          <p className="text-lg font-black text-slate-400 tracking-tight text-center uppercase">Manifest an Exam Board<br /><span className="text-[10px] opacity-60">to unlock the assessment lattice</span></p>
        </div>
      ) : (
        <AdminTable
          columns={columns}
          data={data}
          totalCount={totalCount}
          page={page}
          onPageChange={setPage}
          onRefresh={refresh}
          onEdit={(item) => {
            setEditingItem(item);
            setIsModalOpen(true);
          }}
          onDelete={(id) => {
            if (window.confirm("Verify: Remove this question manifestation?"))
              deleteItem(id);
          }}
          loading={loading}
        />
      )}

      <AdminFormModal
        isOpen={isModalOpen}
        title={editingItem ? "Edit Question Node" : "Add Question Node"}
        fields={fields}
        initialData={manifestEditingItem(editingItem)}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleApply}
      />
    </div>
  );
};

export default QuestionsManagement;
