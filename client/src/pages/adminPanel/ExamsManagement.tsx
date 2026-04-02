import React, { useState, useMemo } from "react";
import { useTableData } from "../../hooks/useTableData";
import { AdminTable } from "../../components/admin/AdminTable";
import { AdminFormModal } from "../../components/admin/AdminFormModal";
import { Plus } from "lucide-react";

/**
 * Examination Lattice Management Page.
 * Handles CRUD manifestation for the 'exams' table with hierarchical orchestration.
 */
const ExamsManagement: React.FC = () => {
  const [selectedBoard, setSelectedBoard] = useState<string>("all");

  const { data: boardsData } = useTableData("exam_boards", { pageSize: 1000 });
  const boards = useMemo(() => boardsData.filter(b => b.is_active !== false), [boardsData]);

  const { 
    data: exams, 
    loading, 
    totalCount,
    page,
    setPage,
    addItem, 
    updateItem, 
    deleteItem,
    refresh
  } = useTableData("exams", {
      filterColumn: selectedBoard !== "all" ? "exam_board_id" : undefined,
      filterValue: selectedBoard !== "all" ? selectedBoard : undefined
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // High-Fidelity Data Enrichment
  const mappedExams = useMemo(() => {
     if (!exams) return [];
     return exams.map(e => ({
         ...e,
         board_name: boards.find(b => b.id === e.exam_board_id )?.name || "N/A"
     }));
  }, [exams, boards]);

  const columns = [
    { 
        header: "Parent Board", 
        key: "board_name",
        render: (val: string) => (
            <span className="text-[10px] font-black uppercase tracking-widest text-[#16a34a] bg-[#16a34a]/10 px-3 py-1 rounded-lg border border-[#16a34a]/20">
                {val}
            </span>
        )
    },
    { header: "Exam Identity", key: "name", flex: 1.5 },
    { header: "Full Nomenclature", key: "full_name", flex: 2 },
    {
      header: "Technical Sector",
      key: "type",
      render: (val: string) => (
        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[9px] font-black tracking-[0.2em] text-slate-500">
          {val}
        </span>
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
  ];

  const fields: any[] = [
    { name: "name", label: "Short Identity (e.g. CGL)", type: "text", required: true },
    { name: "full_name", label: "Full Nomenclature", type: "text", required: true },
    {
      name: "type",
      label: "Exam Sector",
      type: "select",
      options: [
        { label: "Prelims", value: "PRELIMS" },
        { label: "Mains", value: "MAINS" },
        { label: "Combined Ecosystem", value: "COMBINED" },
      ],
      required: true,
    },
    {
      name: "exam_board_id",
      label: "Architectural Board Parent",
      type: "select",
      options: boards.map(b => ({ label: b.name, value: b.id })),
      defaultValue: selectedBoard !== "all" ? selectedBoard : undefined,
      disabled: selectedBoard !== "all",
      required: true,
    },
    { name: "description", label: "Technical Description", type: "textarea" },
    { name: "is_active", label: "Portal Active Manifestation", type: "checkbox" },
  ];

  const handleApply = async (formData: any) => {
    try {
      // Data Scrubbing Manifestation
      const { name, full_name, type, exam_board_id, description, is_active } = formData;
      const cleanData = { name, full_name, type, exam_board_id, description, is_active };

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
            Examination Lattice
          </h2>
          <p className="text-[10px] text-[#16a34a] uppercase font-black tracking-[0.4em] mt-3">
            Managing Curriculum Ecosystems via Board Orchestration
          </p>
        </div>

        {/* Unified Hierarchical Control Bar */}
        <div className="flex flex-wrap items-center gap-4 w-full">
            <div className="flex-1 flex items-center gap-2 p-1.5 bg-slate-100/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden max-w-md">
                {/* Board Manifestation Selection */}
                <select 
                    value={selectedBoard}
                    onChange={(e) => { setSelectedBoard(e.target.value); setPage(0); }}
                    className="flex-1 bg-transparent text-[9px] font-black uppercase tracking-widest px-8 py-5 outline-none hover:text-[#16a34a] transition-colors cursor-pointer"
                >
                    <option value="all">Entire Ecosystem (Select Board)</option>
                    {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
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
                <span>Manifest Exam</span>
            </button>
        </div>
      </header>

      {selectedBoard === "all" ? (
          <div className="flex flex-col items-center justify-center p-32 bg-slate-50 dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 animate-reveal">
              <div className="size-16 bg-slate-200 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 mb-6 group-hover:scale-110 transition-transform">
                  <Plus size={32} />
              </div>
              <p className="text-lg font-black text-slate-400 tracking-tight text-center uppercase">Manifest an Exam Board<br/><span className="text-[10px] opacity-60">to unlock the examination lattice</span></p>
          </div>
      ) : (
          <AdminTable
            columns={columns}
            data={mappedExams}
            totalCount={totalCount}
            page={page}
            onPageChange={setPage}
            onRefresh={refresh}
            onEdit={(item) => {
              setEditingItem(item);
              setIsModalOpen(true);
            }}
            onDelete={(id) => {
              if (window.confirm("Verify: Remove this examination manifest from the lattice?")) deleteItem(id);
            }}
            loading={loading}
          />
      )}

      <AdminFormModal
        isOpen={isModalOpen}
        title={editingItem ? "Edit Examination Manifest" : "Add Examination Manifest"}
        fields={fields}
        initialData={editingItem}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleApply}
      />
    </div>
  );
};

export default ExamsManagement;
