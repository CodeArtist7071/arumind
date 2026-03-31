import React, { useState, useMemo, memo } from "react";
import { useTableData } from "../../hooks/useTableData";
import { AdminTable } from "../../components/admin/AdminTable";
import { AdminFormModal } from "../../components/admin/AdminFormModal";
import { Plus, School, BookOpen } from "lucide-react";

/**
 * Chapter Management Page.
 * Handles CRUD manifestations for curriculum verticals with high-performance server-side windowing.
 */
const ChaptersManagement: React.FC = () => {
  const [selectedExamId, setSelectedExamId] = useState<string>("all");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");

  // Auxiliary context manifestations for mapping
  const { data: exams, loading: examLoading } = useTableData("exams", { pageSize: 100 });
  const { data: subjects, loading: subLoading } = useTableData("subjects", { pageSize: 1000 });
  const { data: links, loading: linksLoading } = useTableData("exam_subjects", { pageSize: 5000 });

  // Orchestrate the filter manifestation for Chapters hook
  const filterParams = useMemo(() => {
    if (selectedSubjectId !== "all") {
        return { column: "subject_id", value: selectedSubjectId };
    }
    if (selectedExamId !== "all") {
        const subjectIdsInExam = links
            .filter((l) => l.exam_id === selectedExamId)
            .map((l) => l.subject_id);
        return { column: "subject_id", value: subjectIdsInExam };
    }
    return { column: undefined, value: undefined };
  }, [links, selectedExamId, selectedSubjectId]);

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
    filterColumn: filterParams.column,
    filterValue: filterParams.value,
    pageSize: 1000 // High-Performance Sector Manifestation for Client-Side Grouping
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Derived subjects for the filter based on selected exam
  const availableSubjectsForFilter = useMemo(() => {
    if (selectedExamId === "all") return subjects;
    const subjectIdsInExam = links
      .filter((l) => l.exam_id === selectedExamId)
      .map((l) => l.subject_id);
    return subjects.filter((s) => subjectIdsInExam.includes(s.id));
  }, [subjects, links, selectedExamId]);

  const loading = chapLoading || subLoading || examLoading || linksLoading;

  // High-Fidelity Data Enrichment for Elite Grouping
  const mappedChapters = useMemo(() => {
    if (!chapters) return [];
    return chapters.map((chap) => ({
      ...chap,
      subject_name: subjects.find((s) => s.id === chap.subject_id)?.name || "N/A"
    }));
  }, [chapters, subjects]);

  const columns = useMemo(() => [
    { 
      header: "Parent Subject", 
      key: "subject_name", // Native Grouping by Manifested Name
      rowGroup: true, 
      hide: true,
      render: (val: string) => val
    },
    { header: "Chapter Name", key: "name", flex: 2 },
    {
      header: "Technical Meta",
      key: "exam_type",
      render: (val: string, row: any) => (
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-slate-400">#{row.display_order || 0}</span>
          <span
            className={`text-[9px] font-black tracking-widest px-2.5 py-1 rounded-lg ${
              val === "MAINS"
                ? "bg-orange-100 dark:bg-orange-950/40 text-orange-600"
                : "bg-blue-100 dark:bg-blue-950/40 text-blue-600"
            }`}
          >
            {val || "GENERIC"}
          </span>
        </div>
      ),
    },
    {
        header: "Context",
        key: "subject_id",
        render: (val: string) => (
            <span className="text-[10px] font-bold text-slate-400 italic">
               {exams.find((e) =>
                 links.some((l) => l.subject_id === val && l.exam_id === e.id)
               )?.name || "Universal"}
            </span>
        )
    }
  ], [subjects, exams, links]);

  const autoGroupColumnDef = useMemo(() => ({
    headerName: "Curriculum Subject",
    minWidth: 280,
    cellRendererParams: {
      suppressCount: false,
      checkbox: false,
      innerRenderer: (params: any) => {
        const subjectName = params.value || "N/A";
        return (
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#16a34a]" />
            <span className="text-[11px] font-black uppercase tracking-widest text-[#16a34a]">
              {subjectName}
            </span>
          </div>
        );
      }
    }
  }), []);

  const fields: any[] = [
    { name: "name", label: "Chapter Name (e.g. Percentage)", type: "text", required: true },
    {
      name: "subject_id",
      label: "Parent Subject Manifestation",
      type: "select",
      options: subjects.map((s) => ({ label: s.name, value: s.id })),
      required: true,
    },
    { name: "display_order", label: "Lattice Display Ranking", type: "number" },
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
  ];

  const handleApply = async (formData: any) => {
    try {
      if (editingItem) {
        await updateItem(editingItem.id, formData);
      } else {
        await addItem(formData);
      }
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (err: any) {
      alert("Synchronization Error: " + err.message);
    }
  };

  return (
    <div className="p-10 space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 px-2">
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-slate-800 dark:text-slate-100 italic">
            Curriculum Chapters
          </h2>
          <p className="text-[10px] text-[#16a34a] uppercase font-black tracking-[0.4em] mt-3">
            Native Enterprise Lattice Manifestation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          {/* Exam Filter Manifestation */}
          <div className="flex items-center gap-3 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-100 dark:border-slate-800 p-2.5 pl-5 rounded-2xl shadow-sm hover:shadow-lg transition-all">
            <School size={15} className="text-[#16a34a]" />
            <select
              value={selectedExamId}
              onChange={(e) => {
                setSelectedExamId(e.target.value);
                setSelectedSubjectId("all");
                setPage(0);
              }}
              className="bg-transparent text-[11px] font-black uppercase tracking-widest outline-none cursor-pointer pr-4 text-slate-700 dark:text-slate-200"
            >
              <option value="all">All Ecosystems</option>
              {exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>

          {/* Subject Filter Manifestation */}
          <div className="flex items-center gap-3 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-100 dark:border-slate-800 p-2.5 pl-5 rounded-2xl shadow-sm hover:shadow-lg transition-all">
            <BookOpen size={15} className="text-[#16a34a]" />
            <select
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                setPage(0);
              }}
              className="bg-transparent text-[11px] font-black uppercase tracking-widest outline-none cursor-pointer pr-4 text-slate-700 dark:text-slate-200"
            >
              <option value="all">All Subjects</option>
              {availableSubjectsForFilter.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <button
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            className="group flex items-center gap-4 px-10 py-4.5 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-[#16a34a]/10 hover:-translate-y-1 transition-all duration-300"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-500" />
            Manifest New Chapter
          </button>
        </div>
      </header>

      <AdminTable
        columns={columns}
        data={mappedChapters}
        totalCount={totalCount}
        page={page}
        onPageChange={setPage}
        onRefresh={refresh}
        autoGroupColumnDef={autoGroupColumnDef}
        groupDisplayType="singleColumn"
        groupDefaultExpanded={1}
        onEdit={(item) => {
          setEditingItem(item);
          setIsModalOpen(true);
        }}
        onDelete={(id) => {
          if (window.confirm("Verify: Remove this chapter from the lattice?")) deleteItem(id);
        }}
        loading={loading}
      />

      <AdminFormModal
        isOpen={isModalOpen}
        title={editingItem ? "Alter Chapter Manifestation" : "Manifest New Chapter"}
        fields={fields}
        initialData={editingItem}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleApply}
      />
    </div>
  );
};

export default ChaptersManagement;
