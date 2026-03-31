import React, { useState } from "react";
import { useTableData } from "../../hooks/useTableData";
import { AdminTable } from "../../components/admin/AdminTable";
import { AdminFormModal } from "../../components/admin/AdminFormModal";
import { Plus } from "lucide-react";

/**
 * Examination Lattice Management Page.
 * Handles CRUD manifestation for the 'exams' table in Supabase.
 * Optimized with high-performance server-side windowing.
 */
const ExamsManagement: React.FC = () => {
  const { 
    data, 
    loading, 
    totalCount,
    page,
    setPage,
    addItem, 
    updateItem, 
    deleteItem,
    refresh
  } = useTableData("exams");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const columns = [
    { header: "Name", key: "name" },
    { header: "Full Name", key: "full_name" },
    {
      header: "Type",
      key: "type",
      render: (val: string) => (
        <span className="px-2 py-4 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-black tracking-widest text-slate-500 dark:text-slate-400">
          {val}
        </span>
      ),
    },
    {
      header: "Active",
      key: "is_active",
      render: (val: boolean) => (
        <div className={`w-5 h-5 rounded-full ${val ? "bg-[#16a34a]" : "bg-red-500"} shadow-lg`} />
      ),
    },
  ];

  const fields: any[] = [
    { name: "name", label: "Short Name (e.g. CGL)", type: "text", required: true },
    {
      name: "full_name",
      label: "Full Examination Name",
      type: "text",
      required: true,
    },
    {
      name: "type",
      label: "Exam Type",
      type: "select",
      options: [
        { label: "Prelims", value: "PRELIMS" },
        { label: "Mains", value: "MAINS" },
        { label: "Combined", value: "COMBINED" },
      ],
      required: true,
    },
    {
      name: "exam_board_id",
      label: "Board ID (UUID)",
      type: "text",
      required: true,
    },
    { name: "description", label: "Technical Description", type: "textarea" },
    { name: "is_active", label: "Active Status", type: "checkbox" },
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
    <div className="p-10 space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <header className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-slate-800 dark:text-slate-100 italic">
            Examination Lattice
          </h2>
          <p className="text-[10px] text-[#16a34a] uppercase font-black tracking-[0.4em] mt-3">
            Managing Core Board Manifestations via High-Performance Orchestration
          </p>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            setIsModalOpen(true);
          }}
          className="group flex items-center gap-4 px-10 py-5 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-[#16a34a]/10 hover:-translate-y-1 transition-all duration-300"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-500" />
          Manifest New Exam
        </button>
      </header>

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
          if (window.confirm("Verify: Delete this manifestation from the lattice?"))
            deleteItem(id);
        }}
        loading={loading}
      />

      <AdminFormModal
        isOpen={isModalOpen}
        title={editingItem ? "Alter Examination Manifestation" : "Manifest New Examination"}
        fields={fields}
        initialData={editingItem}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleApply}
      />
    </div>
  );
};

export default ExamsManagement;
