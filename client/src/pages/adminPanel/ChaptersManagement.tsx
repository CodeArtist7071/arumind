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
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
      <header className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#1b2419] dark:text-[#e8eee4] sm:text-3xl">
            Chapters
          </h2>
          <p className="mt-1.5 text-sm text-[#778171] dark:text-[#a6b09f]">
            Organize chapter content within each subject and exam.
          </p>
        </div>

        {/* Unified Hierarchical Control Bar */}
        <div className="flex flex-wrap items-center gap-4 w-full">
            <div className="flex min-w-0 flex-1 flex-col gap-1 overflow-hidden rounded-xl border border-[#e2e8dc] bg-[#fbfcf8] dark:border-white/10 dark:bg-[#171e17] sm:flex-row sm:items-center sm:gap-0">
                {/* 1. Exam Board */}
                <select 
                    value={selectedBoard}
                    onChange={(e) => { setSelectedBoard(e.target.value); setSelectedExam("all"); setSelectedSubject("all"); }}
                    className="min-h-11 min-w-0 flex-1 bg-transparent px-3.5 text-sm text-[#34402f] outline-none transition-colors hover:text-[#315f29] dark:text-[#d6dfd1] sm:border-r sm:border-[#e5e9e0] sm:px-4 dark:sm:border-white/10"
                >
                    <option value="all">1. Select Board</option>
                    {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>

                {/* 2. Exams */}
                <select 
                    value={selectedExam}
                    disabled={selectedBoard === "all"}
                    onChange={(e) => { setSelectedExam(e.target.value); setSelectedSubject("all"); }}
                    className="min-h-11 min-w-0 flex-1 bg-transparent px-3.5 text-sm text-[#34402f] outline-none transition-colors hover:enabled:text-[#315f29] disabled:opacity-40 dark:text-[#d6dfd1] sm:border-r sm:border-[#e5e9e0] sm:px-4 dark:sm:border-white/10"
                >
                    <option value="all">2. Select Exam</option>
                    {filteredExams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>

                {/* 3. Subjects */}
                <select 
                    value={selectedSubject}
                    disabled={selectedExam === "all"}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="min-h-11 min-w-0 flex-1 bg-transparent px-3.5 text-sm text-[#34402f] outline-none transition-colors hover:enabled:text-[#315f29] disabled:opacity-40 dark:text-[#d6dfd1] sm:px-4"
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
                className="group flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-[#24551e] px-4 text-sm font-semibold text-white transition hover:bg-[#173f19] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4c8b3e]"
            >
                <Plus size={18} />
                <span>Add Chapter</span>
            </button>
        </div>
      </header>

      {selectedBoard === "all" ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#d8e1d2] bg-[#fbfcf8] px-6 py-16 text-center dark:border-white/10 dark:bg-[#171e17] sm:py-20">
              <div className="mb-4 grid size-12 place-items-center rounded-xl bg-[#e8f0e3] text-[#315f29] dark:bg-[#263d24] dark:text-[#c9e4c0]">
                  <Plus size={22} />
              </div>
              <p className="text-sm font-semibold text-[#34402f] dark:text-[#d6dfd1]">Choose an exam board to view its chapters</p>
              <p className="mt-1 text-sm text-[#778171] dark:text-[#a6b09f]">Select a board above to get started.</p>
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
              if (window.confirm("Delete this chapter? This action cannot be undone.")) deleteItem(id);
            }}
            loading={loading}
          />
      )}

      <AdminFormModal
        isOpen={isModalOpen}
        title={editingItem ? "Edit chapter" : "Add chapter"}
        fields={fields}
        initialData={editingItem}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleApply}
      />
    </div>
  );
};

export default ChaptersManagement;
