import React, { useState, useMemo } from "react";
import { useTableData } from "../../hooks/useTableData";
import { AdminTable } from "../../components/admin/AdminTable";
import { AdminFormModal } from "../../components/admin/AdminFormModal";
import { Plus, School } from "lucide-react";
import { supabase } from "../../utils/supabase";

/**
 * Subject Management Page.
 * Handles CRUD manifestations for knowledge sectors with high-performance server-side windowing.
 */
const SubjectsManagement: React.FC = () => {
  const [selectedExamId, setSelectedExamId] = useState<string>("all");
  
  // High-Performance Lattice Hooks
  const { data: exams, loading: examLoading } = useTableData("exams", { pageSize: 100 });
  const { data: links, loading: linksLoading, refresh: refreshLinks } = useTableData("exam_subjects", { pageSize: 1000 });
  
  // Calculate linked subject IDs for server-side filter manifestation
  const linkedSubjectIds = useMemo(() => {
    if (selectedExamId === "all") return null;
    return links
      .filter((l) => l.exam_id === selectedExamId)
      .map((l) => l.subject_id);
  }, [links, selectedExamId]);

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
    { header: "Subject Name", key: "name" },
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
                  key={e.id}
                  className="text-[9px] font-black uppercase text-[#16a34a] bg-[#16a34a]/10 px-2 py-0.5 rounded"
                >
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
      header: "Lattice Order",
      key: "display_order",
      render: (val: number) => (
        <span className="font-mono text-[10px] text-[#16a34a] font-bold tracking-tight">{val || 0}</span>
      ),
    },
  ];

  const fields: any[] = [
    { name: "name", label: "Subject Name (e.g. Arithmetic)", type: "text", required: true },
    { name: "description", label: "Editorial Description", type: "textarea" },
    { 
      name: "exam_ids", 
      label: "Map to Respective Exams (Multi-selection)", 
      type: "select", 
      multiple: true,
      options: exams.map(e => ({ label: e.name, value: e.id })),
      required: true 
    },
    { name: "display_order", label: "Display Ranking (Lattice Index)", type: "number" },
  ];

  const handleApply = async (formData: any) => {
    try {
      const { exam_ids, ...subjectData } = formData;
      let subjectId = editingItem?.id;

      if (editingItem) {
        await updateItem(editingItem.id, subjectData);
      } else {
        const newSub = await addItem(subjectData);
        subjectId = newSub.id;
      }

      if (exam_ids && subjectId) {
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
    <div className="p-10 space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 px-2">
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-slate-800 dark:text-slate-100 italic">
            Knowledge Subjects
          </h2>
          <p className="text-[10px] text-[#16a34a] uppercase font-black tracking-[0.4em] mt-3">
            Managing Core Knowledge Sectors via Server-Side Manifestation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="relative flex items-center gap-3 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-100 dark:border-slate-800 p-2.5 pl-5 rounded-2xl shadow-sm hover:shadow-lg transition-all">
            <School size={15} className="text-[#16a34a]" />
            <select
              value={selectedExamId}
              onChange={(e) => {
                setSelectedExamId(e.target.value);
                setPage(0); // Reset page manifestation on filter shift
              }}
              className="bg-transparent text-[11px] font-black uppercase tracking-widest outline-none cursor-pointer pr-4 text-slate-700 dark:text-slate-200"
            >
              <option value="all">Entire Ecosystem</option>
              {exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>

          <button
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            className="group flex items-center gap-4 px-10 py-4.5 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-[#16a34a]/10 hover:-translate-y-1 transition-all duration-300"
          >
            <Plus size={18} /> Manifest New Subject
          </button>
        </div>
      </header>

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
          if (window.confirm("Verify: Remove this subject from the lattice?")) deleteItem(id);
        }}
        loading={loading}
      />

      <AdminFormModal
        isOpen={isModalOpen}
        title={editingItem ? "Alter Subject Manifestation" : "Manifest New Subject"}
        fields={fields}
        initialData={editingItem}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleApply}
      />
    </div>
  );
};

export default SubjectsManagement;
