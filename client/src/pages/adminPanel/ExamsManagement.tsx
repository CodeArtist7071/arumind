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
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
      <header className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#1b2419] dark:text-[#e8eee4] sm:text-3xl">
            Exams
          </h2>
          <p className="mt-1.5 text-sm text-[#778171] dark:text-[#a6b09f]">
            Create and maintain the exams available under each board.
          </p>
        </div>

        {/* Unified Hierarchical Control Bar */}
        <div className="flex flex-wrap items-center gap-4 w-full">
                <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-xl border border-[#e2e8dc] bg-[#fbfcf8] dark:border-white/10 dark:bg-[#171e17] sm:max-w-md">
                {/* Board Manifestation Selection */}
                <select 
                    value={selectedBoard}
                    onChange={(e) => { setSelectedBoard(e.target.value); setPage(0); }}
                    className="min-h-11 w-full bg-transparent px-3.5 text-sm text-[#34402f] outline-none transition-colors hover:text-[#315f29] dark:text-[#d6dfd1] sm:px-4"
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
                className="group flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-[#24551e] px-4 text-sm font-semibold text-white transition hover:bg-[#173f19] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4c8b3e]"
            >
                <Plus size={18} />
                <span>Add exam</span>
            </button>
        </div>
      </header>

      {selectedBoard === "all" ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#d8e1d2] bg-[#fbfcf8] px-6 py-16 text-center dark:border-white/10 dark:bg-[#171e17] sm:py-20">
              <div className="mb-4 grid size-12 place-items-center rounded-xl bg-[#e8f0e3] text-[#315f29] dark:bg-[#263d24] dark:text-[#c9e4c0]">
                  <Plus size={22} />
              </div>
              <p className="text-sm font-semibold text-[#34402f] dark:text-[#d6dfd1]">Choose an exam board to view its exams</p>
              <p className="mt-1 text-sm text-[#778171] dark:text-[#a6b09f]">Select a board above, or add one in Exam boards.</p>
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
              if (window.confirm("Delete this exam? This action cannot be undone.")) deleteItem(id);
            }}
            loading={loading}
          />
      )}

      <AdminFormModal
        isOpen={isModalOpen}
        title={editingItem ? "Edit exam" : "Add exam"}
        fields={fields}
        initialData={editingItem}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleApply}
      />
    </div>
  );
};

export default ExamsManagement;
