import React, { useState, useMemo } from "react";
import { useTableData } from "../../hooks/useTableData";
import { AdminTable } from "../../components/admin/AdminTable";
import { AdminFormModal } from "../../components/admin/AdminFormModal";
import { Plus } from "lucide-react";

/**
 * Chapter Management Page.
 * Handles CRUD manifestations for curriculum verticals with hierarchical orchestration.
 */
const ChaptersManagement: React.FC = () => {
  const [selectedBoard, setSelectedBoard] = useState<string>("all");
  const [selectedExam, setSelectedExam] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");

  // Auxiliary context manifestations (Pre-filtered for operational manifestation)
  const { data: boardsData } = useTableData("exam_boards", { pageSize: 1000 });
  const { data: examsData, loading: examLoading } = useTableData("exams", { pageSize: 1000 });
  const { data: subjectsData, loading: subLoading } = useTableData("subjects", { pageSize: 1000 });
  const { data: examSubjects, loading: esLoading } = useTableData("exam_subjects", { pageSize: 1000 });

  const boards = useMemo(() => boardsData.filter(b => b.is_active !== false), [boardsData]);
  const exams = useMemo(() => examsData.filter(e => e.is_active !== false), [examsData]);
  const subjects = useMemo(() => subjectsData.filter(s => s.is_active !== false), [subjectsData]);

  // Hierarchical Filter Propagation Logic
  const filteredExams = useMemo(() => 
    selectedBoard === "all" ? exams : exams.filter(e => e.exam_board_id === selectedBoard)
  , [exams, selectedBoard]);

  const filteredSubjects = useMemo(() => {
    if (selectedExam === "all") return subjects;
    const linkedIds = examSubjects.filter(es => es.exam_id === selectedExam).map(es => es.subject_id);
    return subjects.filter(s => linkedIds.includes(s.id));
  }, [subjects, examSubjects, selectedExam]);

  const { 
    data: chapters, 
    loading: chapLoading, 
    totalCount,
    page,
    setPage,
    addItem, 
    updateItem, 
    deleteItem,
    refresh
  } = useTableData("chapters", {
    filterColumn: selectedSubject !== "all" ? "subject_id" : undefined,
    filterValue: selectedSubject !== "all" ? selectedSubject : undefined,
    pageSize: 1000 
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const loading = chapLoading || subLoading || examLoading || esLoading;

  // High-Fidelity Data Enrichment
  const mappedChapters = useMemo(() => {
    if (!chapters) return [];
    return chapters.map((chap) => ({
      ...chap,
      subject_name: subjectsData.find((s) => s.id === chap.subject_id)?.name || "N/A"
    }));
  }, [chapters, subjectsData]);

  const columns = useMemo(() => [
    { 
      header: "Technical ID", 
      key: "id", 
      render: (val: string) => <span className="text-[9px] font-mono opacity-40">{val}</span>,
      width: 120
    },
    { 
      header: "Parent Subject Manifestation", 
      key: "subject_name", 
      render: (val: string) => (
        <span className="text-[10px] font-black uppercase tracking-widest text-[#16a34a] bg-[#16a34a]/10 px-3 py-1 rounded-lg border border-[#16a34a]/20">
          {val}
        </span>
      )
    },
    { header: "Chapter Name", key: "name", flex: 2 },
    {
      header: "Exam Type",
      key: "exam_type",
      render: (val: string) => (
        <div className="flex items-center gap-3">
          <span>
            {val || "GENERIC"}
          </span>
        </div>
      ),
    },
    {
      header: "Portal Status",
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
      ),
    },
  ], []);

  const fields: any[] = [
    { name: "name", label: "Chapter Name", type: "text", required: true },
    {
      name: "subject_id",
      label: "Parent Subject Manifestation",
      type: "select",
      options: subjects.map((s) => ({ label: s.name, value: s.id })),
      defaultValue: selectedSubject !== "all" ? selectedSubject : undefined,
      disabled: selectedSubject !== "all",
      required: true,
    },
    { name: "display_order", label: "Display Ranking", type: "number" },
    {
      name: "exam_type",
      label: "Applicable Examination Sector",
      type: "select",
      options: [
        { label: "Prelims", value: "PRELIMS" },
        { label: "Mains", value: "MAINS" },
        { label: "Both / Generic", value: "BOTH" },
      ],
    },
    { name: "is_active", label: "Portal Active Manifestation", type: "checkbox" },
  ];

  const handleApply = async (formData: any) => {
    try {
      // Orchestrate technical scrubbing: Explicitly manifestation selection
      const { name, subject_id, exam_type, display_order, is_active } = formData;
      const cleanData = { name, subject_id, exam_type, display_order, is_active };

      if (editingItem) {
        await updateItem(editingItem.id, cleanData);
      } else {
        await addItem(cleanData);
      }
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (err: any) {
      alert("Synchronization Error: " + err.message);
    }
  };

  return (
    <div className="p-10 space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <header className="space-y-8">
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-slate-800 dark:text-slate-100 italic">
            Chapter Repository
          </h2>
          <p className="text-[10px] text-[#16a34a] uppercase font-black tracking-[0.4em] mt-3">
            Managing Curriculum Nodes via Hierarchy Orchestration
          </p>
        </div>

        {/* Unified Hierarchical Control Bar */}
        <div className="flex flex-wrap items-center gap-4 w-full">
            <div className="flex-1 flex items-center gap-2 p-1.5 bg-slate-100/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                {/* 1. Exam Board */}
                <select 
                    value={selectedBoard}
                    onChange={(e) => { setSelectedBoard(e.target.value); setSelectedExam("all"); setSelectedSubject("all"); }}
                    className="flex-1 bg-transparent text-[9px] font-black uppercase tracking-widest px-6 py-4 border-r border-slate-200 dark:border-slate-800 outline-none hover:text-[#16a34a] transition-colors cursor-pointer"
                >
                    <option value="all">1. Select Board</option>
                    {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>

                {/* 2. Exams */}
                <select 
                    value={selectedExam}
                    disabled={selectedBoard === "all"}
                    onChange={(e) => { setSelectedExam(e.target.value); setSelectedSubject("all"); }}
                    className="flex-1 bg-transparent text-[9px] font-black uppercase tracking-widest px-6 py-4 border-r border-slate-200 dark:border-slate-800 outline-none disabled:opacity-30 hover:enabled:text-[#16a34a] transition-colors cursor-pointer"
                >
                    <option value="all">2. Select Exam</option>
                    {filteredExams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>

                {/* 3. Subjects */}
                <select 
                    value={selectedSubject}
                    disabled={selectedExam === "all"}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="flex-1 bg-transparent text-[9px] font-black uppercase tracking-widest px-6 py-4 outline-none disabled:opacity-30 hover:enabled:text-[#16a34a] transition-colors cursor-pointer"
                >
                    <option value="all">3. Select Subject</option>
                    {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>

            <button
                onClick={() => {
                    setEditingItem(null);
                    setIsModalOpen(true);
                }}
                className="group shrink-0 flex items-center gap-4 px-10 py-5 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-[#16a34a]/10 hover:-translate-y-1 transition-all duration-300"
            >
                <Plus size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                <span>Add Chapter</span>
            </button>
        </div>
      </header>

      {selectedBoard === "all" ? (
          <div className="flex flex-col items-center justify-center p-32 bg-slate-50 dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 animate-reveal">
              <div className="size-16 bg-slate-200 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 mb-6 group-hover:scale-110 transition-transform">
                  <Plus size={32} />
              </div>
              <p className="text-lg font-black text-slate-400 tracking-tight text-center uppercase">Manifest an Exam Board<br/><span className="text-[10px] opacity-60">to unlock the curriculum lattice</span></p>
          </div>
      ) : (
          <AdminTable
            columns={columns}
            data={mappedChapters}
            totalCount={totalCount}
            page={page}
            onPageChange={setPage}
            onRefresh={refresh}
            onEdit={(item) => {
              setEditingItem(item);
              setIsModalOpen(true);
            }}
            onDelete={(id) => {
              if (window.confirm("Verify: Remove this chapter from the lattice?")) deleteItem(id);
            }}
            loading={loading}
          />
      )}

      <AdminFormModal
        isOpen={isModalOpen}
        title={editingItem ? "Edit Chapter Node" : "Add Chapter Node"}
        fields={fields}
        initialData={editingItem}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleApply}
      />
    </div>
  );
};

export default ChaptersManagement;
