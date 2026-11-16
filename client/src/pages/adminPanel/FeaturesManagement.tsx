import React, { useState } from "react";
import { useTableData } from "../../hooks/useTableData";
import { AdminTable } from "../../components/admin/AdminTable";
import { AdminFormModal } from "../../components/admin/AdminFormModal";
import { Plus, Activity } from "lucide-react";

/**
 * Platform Features Management Page.
 * Handles CRUD manifestations for the 'features' table (for controlling UI flags, etc.).
 */
const FeaturesManagement: React.FC = () => {
  const { data, loading, addItem, updateItem, deleteItem, error } = useTableData("features");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const columns = [
    { header: "Feature Name", key: "name" },
    { 
      header: "Status", 
      key: "is_enabled",
      render: (val: boolean) => (
        <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${val ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></span>
            <span className="text-[10px] font-black uppercase tracking-widest">{val ? 'Active' : 'Inactive'}</span>
        </div>
      )
    },
    { 
      header: "Description", 
      key: "description",
      render: (val: string) => <span className="text-xs opacity-60 truncate block max-w-xs">{val}</span>
    },
  ];

  const fields: any[] = [
    { name: "name", label: "Feature Name (Technical Key)", type: "text", required: true },
    { name: "description", label: "Purpose / Description", type: "textarea" },
    { name: "is_enabled", label: "Global Enable Status", type: "checkbox" },
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

  // Handle case where table doesn't exist yet
  if (error && error.includes("does not exist")) {
    return (
      <div className="p-20 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-700">
        <Activity size={48} className="text-slate-200" />
        <div className="max-w-md">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 italic">Table Manifestation Missing</h2>
          <p className="text-sm text-slate-500 mt-2">
            The <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">features</code> table was not found in Supabase. 
            Please run the required SQL migration to enable platform feature management.
          </p>
        </div>
        <pre className="bg-slate-900 text-emerald-400 p-6 rounded-xl text-left text-xs font-mono overflow-auto max-w-lg">
          {`CREATE TABLE public.features (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    is_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);`}
        </pre>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#1b2419] dark:text-[#e8eee4] sm:text-3xl">
            Platform Features
          </h2>
          <p className="mt-1.5 text-sm text-[#778171] dark:text-[#a6b09f]">
            Configure platform capabilities and feature availability.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            setIsModalOpen(true);
          }}
          className="group flex min-h-11 items-center gap-2 rounded-xl bg-[#24551e] px-4 text-sm font-semibold text-white transition hover:bg-[#173f19] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4c8b3e]"
        >
          <Plus size={18} />
          Add feature
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
          if (window.confirm("Delete this feature? This action cannot be undone."))
            deleteItem(id);
        }}
        loading={loading}
      />

      <AdminFormModal
        isOpen={isModalOpen}
        title={editingItem ? "Edit feature" : "Add feature"}
        fields={fields}
        initialData={editingItem}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleApply}
      />
    </div>
  );
};

export default FeaturesManagement;
