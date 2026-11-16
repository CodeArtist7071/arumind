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
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-[#16a34a]/10 rounded-2xl text-[#16a34a]">
            <Layout size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[#1b2419] dark:text-[#e8eee4] sm:text-3xl">
              Examination Boards
            </h2>
            <p className="mt-1.5 text-sm text-[#778171] dark:text-[#a6b09f]">
              Manage the exam boards available across your learning platform.
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            setIsModalOpen(true);
          }}
          className="group flex min-h-11 items-center gap-2 rounded-xl bg-[#24551e] px-4 text-sm font-semibold text-white transition hover:bg-[#173f19] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4c8b3e]"
        >
          <Plus size={18} />
          Add board
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
          if (window.confirm("Delete this exam board? This action cannot be undone."))
            deleteItem(id);
        }}
        loading={loading}
      />

      <AdminFormModal
        isOpen={isModalOpen}
        title={editingItem ? "Edit exam board" : "Add exam board"}
        fields={fields}
        initialData={editingItem}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleApply}
      />
    </div>
  );
};

export default ExamBoardsManagement;
