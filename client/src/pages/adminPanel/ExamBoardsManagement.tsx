import React, { useState } from "react";
import { useTableData } from "../../hooks/useTableData";
import { AdminTable } from "../../components/admin/AdminTable";
import { AdminFormModal } from "../../components/admin/AdminFormModal";
import { Plus, Layout } from "lucide-react";

/**
 * Exam Boards Management Page.
 * Handles CRUD manifestations for the 'exam_boards' table.
 */
const ExamBoardsManagement: React.FC = () => {
  const { data, loading, addItem, updateItem, deleteItem } = useTableData("exam_boards");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const columns = [
    { header: "Board Name", key: "name" },
    { header: "Full Title", key: "full_name" },
    {header:"General Name", key:"general_name"},
    { 
      header: "Description", 
      key: "description",
      render: (val: string) => <span className="text-[10px] opacity-60 leading-tight block max-w-xs truncate">{val || 'No manifestation description'}</span>
    },
    { 
        header: "Status", 
        key: "is_active",
        render: (val: boolean) => (
            <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded ${
                val ? 'bg-green-100 dark:bg-green-950 text-green-600' : 'bg-red-100 dark:bg-red-950 text-red-600'
            }`}>
                {val ? 'Active' : 'Archived'}
            </span>
        )
    },
  ];

  const fields: any[] = [
    { name: "name", label: "Short Name (e.g. OPSC)", type: "text", required: true },
    { name: "full_name", label: "Official Full Manifestation", type: "text", required: true },
    { name: "general_name", label: "General Manifestation Name", type: "text" },
    { name: "description", label: "Editorial Summary", type: "textarea" },
    { name: "is_active", label: "Operational Status", type: "checkbox" },
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
    <div className="p-10 space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-[#16a34a]/10 rounded-2xl text-[#16a34a]">
            <Layout size={32} />
          </div>
          <div>
            <h2 className="text-4xl font-bold tracking-tight text-slate-800 dark:text-slate-100 italic">
              Examination Boards
            </h2>
            <p className="text-[10px] text-[#16a34a] uppercase font-black tracking-[0.3em] mt-2">
              Managing Primary Educational Manifestations
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            setIsModalOpen(true);
          }}
          className="group flex items-center gap-3 px-8 py-4 bg-[#16a34a] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:shadow-2xl hover:shadow-[#16a34a]/30 hover:-translate-y-1 transition-all duration-300"
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
          Manifest New Board
        </button>
      </header>

      <AdminTable
        columns={columns}
        data={data}
        onEdit={(item) => {
          setEditingItem(item);
          setIsModalOpen(true);
        }}
        onDelete={(id) => {
          if (window.confirm("Verify: Archive this board manifestation from the lattice?"))
            deleteItem(id);
        }}
        loading={loading}
      />

      <AdminFormModal
        isOpen={isModalOpen}
        title={editingItem ? "Alter Board Specification" : "Manifest New Board"}
        fields={fields}
        initialData={editingItem}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleApply}
      />
    </div>
  );
};

export default ExamBoardsManagement;
