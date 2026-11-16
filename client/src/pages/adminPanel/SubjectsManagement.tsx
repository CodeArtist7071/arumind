import React, { useState, useMemo } from "react";
import { useTableData } from "../../hooks/useTableData";
import { AdminTable } from "../../components/admin/AdminTable";
import { AdminFormModal } from "../../components/admin/AdminFormModal";
import { Plus } from "lucide-react";
import { supabase } from "../../utils/supabase";

/**
 * Subject Management Page.
 * Handles CRUD manifestations for knowledge sectors with hierarchical orchestration.
 */
const SubjectsManagement: React.FC = () => {
  const [selectedBoard, setSelectedBoard] = useState<string>("all");
  const [selectedExam, setSelectedExam] = useState<string>("all");
  
  // High-Performance Lattice Hooks (Pre-filtered for operational manifestation)
  const { data: boardsData } = useTableData("exam_boards", { pageSize: 1000 });
  const { data: examsData, loading: examLoading } = useTableData("exams", { pageSize: 1000 });
  const { data: links, loading: linksLoading, refresh: refreshLinks } = useTableData("exam_subjects", { pageSize: 1000 });
  
  const boards = useMemo(() => boardsData.filter(b => b.is_active !== false), [boardsData]);
  const exams = useMemo(() => examsData.filter(e => e.is_active !== false), [examsData]);

  // Filtered nodes for the hierarchy
  const filteredExams = useMemo(() => 
    selectedBoard === "all" ? exams : exams.filter(e => e.exam_board_id === selectedBoard)
  , [exams, selectedBoard]);

  // Calculate linked subject IDs for server-side filter manifestation
  const linkedSubjectIds = useMemo(() => {
    if (selectedExam === "all") return null;
    return links
      .filter((l) => l.exam_id === selectedExam)
      .map((l) => l.subject_id);
  }, [links, selectedExam]);

  const { 
    data: subjects, 
    loading: subLoading, 
    totalCount,
    page,
    setPage,
    addItem, 
    updateItem, 
    deleteItem, 
    refresh: refreshSubjects 
  } = useTableData("subjects", {
    filterColumn: "id",
    filterValue: linkedSubjectIds,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const columns = [
    { header: "Subject Name", key: "name", flex: 1.5 },
    {
      header: "Respective Exams",
      key: "id",
      render: (id: string) => {
        const mappedExamIds = links.filter((l) => l.subject_id === id).map((l) => l.exam_id);
        const mappedExams = exams.filter((e) => mappedExamIds.includes(e.id));
        return (
          <div className="flex flex-wrap gap-1">
            {mappedExams.length > 0 ? (
              mappedExams.map((e) => (
                <span
                  className="text-sm underline font-black px-2 py-1"
                  key={e.id}>
                  {e.name}
                </span>
              ))
            ) : (
              <span className="text-[9px] opacity-30 italic tracking-widest uppercase">Unmapped</span>
            )}
          </div>
        );
      },
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
  ];

  const fields: any[] = [
    { name: "name", label: "Subject Name", type: "text", required: true },
    { name: "description", label: "Editorial Description", type: "textarea" },
    { 
      name: "exam_ids", 
      label: "Associated Examinations", 
      type: "select", 
      multiple: true,
      options: exams.map(e => ({ label: e.name, value: e.id })),
      defaultValue: selectedExam !== "all" ? [selectedExam] : undefined,
      required: true 
    },
    { name: "display_order", label: "Display Ranking", type: "number" },
    { name: "is_active", label: "Active in Portal", type: "checkbox" },
  ];

  const handleApply = async (formData: any) => {
    try {
      const { exam_ids, ...subjectData } = formData;
      const cleanSubjectData = {
          name: subjectData.name,
          description: subjectData.description,
          display_order: subjectData.display_order,
          is_active: subjectData.is_active
      };
      
      let subjectId = editingItem?.id;

      if (editingItem) {
        await updateItem(editingItem.id, cleanSubjectData);
      } else {
        const newSub = await addItem(cleanSubjectData);
        subjectId = newSub.id;
      }

      if (exam_ids && subjectId) {
          // Synchronize junction lattice
          await supabase.from("exam_subjects").delete().eq("subject_id", subjectId);
          const newLinks = (exam_ids as string[]).map(examId => ({
              subject_id: subjectId,
              exam_id: examId
          }));
          const { error: linkError } = await supabase.from("exam_subjects").insert(newLinks);
          if (linkError) throw linkError;
      }

      setIsModalOpen(false);
      setEditingItem(null);
      refreshSubjects();
      refreshLinks();
    } catch (err: any) {
      alert("Synchronization Error: " + err.message);
    }
  };

  const loading = subLoading || examLoading || linksLoading;

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
      <header className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#1b2419] dark:text-[#e8eee4] sm:text-3xl">
            Subjects Management
          </h2>
          <p className="mt-1.5 text-sm text-[#778171] dark:text-[#a6b09f]">
            Organize subjects and connect them to the exams that use them.
          </p>
        </div>

        {/* Unified Hierarchical Control Bar */}
        <div className="flex flex-wrap items-center gap-4 w-full">
            <div className="flex min-w-0 flex-1 flex-col gap-2 overflow-hidden rounded-xl border border-[#e2e8dc] bg-[#fbfcf8] dark:border-white/10 dark:bg-[#171e17] sm:flex-row sm:items-center sm:gap-0">
                {/* 1. Exam Board */}
                <select 
                    value={selectedBoard}
                    onChange={(e) => { setSelectedBoard(e.target.value); setSelectedExam("all"); }}
                    className="min-h-11 min-w-0 flex-1 bg-transparent px-3.5 text-sm text-[#34402f] outline-none transition-colors hover:text-[#315f29] dark:text-[#d6dfd1] sm:border-r sm:border-[#e5e9e0] sm:px-4 dark:sm:border-white/10"
                >
                    <option value="all">1. Select Board</option>
                    {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>

                {/* 2. Exams */}
                <select 
                    value={selectedExam}
                    disabled={selectedBoard === "all"}
                    onChange={(e) => { setSelectedExam(e.target.value); }}
                    className="min-h-11 min-w-0 flex-1 bg-transparent px-3.5 text-sm text-[#34402f] outline-none transition-colors hover:enabled:text-[#315f29] disabled:opacity-40 dark:text-[#d6dfd1] sm:px-4"
                >
                    <option value="all">2. Select Exam</option>
                    {filteredExams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
            </div>

            <button
                onClick={() => {
                    setEditingItem(null);
                    setIsModalOpen(true);
                }}
                className="group flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#24551e] px-4 text-sm font-semibold text-white transition hover:bg-[#173f19] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4c8b3e]"
            >
                <Plus size={18} />
                <span>Add Subject</span>
            </button>
        </div>
      </header>

      {selectedBoard === "all" ? (
          <div className="flex flex-col items-center justify-center p-32 bg-slate-50 dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 animate-reveal">
              <div className="size-16 bg-slate-200 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 mb-6 group-hover:scale-110 transition-transform">
                  <Plus size={32} />
              </div>
              <p className="text-lg font-black text-slate-400 tracking-tight text-center uppercase">Select an Exam Board<br/><span className="text-[10px] opacity-60">to unlock associated subjects</span></p>
          </div>
      ) : (
          <AdminTable
            columns={columns}
            data={subjects}
            totalCount={totalCount}
            page={page}
            onPageChange={setPage}
            onRefresh={refreshSubjects}
            onEdit={(item) => {
              const currentExamIds = links.filter(l => l.subject_id === item.id).map(l => l.exam_id);
              setEditingItem({ ...item, exam_ids: currentExamIds });
              setIsModalOpen(true);
            }}
            onDelete={(id) => {
              if (window.confirm("Verify: Remove this subject from the system?")) deleteItem(id);
            }}
            loading={loading}
          />
      )}

      <AdminFormModal
        isOpen={isModalOpen}
        title={editingItem ? "Edit Subject" : "Add Subject"}
        fields={fields}
        initialData={editingItem}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleApply}
      />
    </div>
  );
};

export default SubjectsManagement;
